import json
import os
from collections.abc import AsyncGenerator
from openai import OpenAI
from tools import TOOL_SCHEMAS, execute_tool

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url=os.getenv("GPT_OSS_BASE_URL", "https://handles-virtual-creating-introduced.trycloudflare.com/v1"),
)

SYSTEM_PROMPT = """You are EcoLens, an AI sustainability research agent.

Your job is to analyze ANY product's sustainability across 4 dimensions:
1. Carbon footprint (production emissions, transportation)
2. Water usage (production water consumption)
3. Deforestation risk (ingredients linked to forest clearing)
4. Labor / ethics (supply chain labor conditions)

## Research Process
1. First, identify the product using fetch_openfoodfacts or your knowledge
2. Look up key ingredients using lookup_ingredient_impact
3. Fetch relevant sustainability reports or news pages using fetch_page
4. Synthesize ALL evidence into a structured JSON report

## Hard Rules
- NEVER output a score without evidence to support it
- If you cannot find evidence for a dimension, set confidence to "insufficient_data"
- Always cite your sources (URL or source name) for every claim
- Do NOT hallucinate statistics — only use numbers you found in sources

## Output Format
Return a single JSON object with this exact structure:
{
  "product": "string",
  "brand": "string",
  "category": "string",
  "overall_score": 0.0,
  "dimensions": [
    {
      "name": "Carbon",
      "score": 0.0,
      "confidence": "high|medium|low|insufficient_data",
      "evidence": [
        {
          "claim": "string",
          "source": "string",
          "url": "string or null",
          "confidence": 0.0
        }
      ]
    }
  ],
  "alternatives": [
    {
      "name": "string",
      "brand": "string",
      "reason": "string"
    }
  ],
  "summary": "2-3 sentence summary"
}

Scores are 0-10 where 10 = most sustainable, 0 = least sustainable.
Overall score = average of dimension scores weighted by confidence.
"""


async def run_agent(product: str) -> AsyncGenerator[dict, None]:
    """
    Run the sustainability research agent for a product.
    Yields event dicts for SSE streaming to the frontend.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze the sustainability of: {product}"},
    ]

    yield {"type": "thinking", "message": f"Starting research on: {product}"}

    max_iterations = 12
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
            max_tokens=4096,
        )

        msg = response.choices[0].message

        # Agent is done — no more tool calls
        if not msg.tool_calls:
            content = msg.content or ""
            # Extract JSON from the response
            report = _extract_json(content)
            if report:
                yield {"type": "done", "message": "Analysis complete", "data": report}
            else:
                yield {"type": "error", "message": "Agent returned malformed output", "data": {"raw": content}}
            return

        # Process tool calls
        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            tool_name = tc.function.name
            try:
                arguments = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                arguments = {}

            # Emit streaming event based on tool being called
            yield _tool_event(tool_name, arguments)

            result = execute_tool(tool_name, arguments)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    yield {"type": "error", "message": "Agent exceeded max iterations"}


def _tool_event(tool_name: str, arguments: dict) -> dict:
    if tool_name == "lookup_ingredient_impact":
        return {"type": "searching", "message": f"Checking ingredient: {arguments.get('ingredient', '')}"}
    elif tool_name == "fetch_openfoodfacts":
        return {"type": "searching", "message": f"Looking up product: {arguments.get('product_name', '')}"}
    elif tool_name == "fetch_page":
        url = arguments.get("url", "")
        domain = url.split("/")[2] if url.startswith("http") else url
        return {"type": "reading", "message": f"Reading: {domain}"}
    return {"type": "thinking", "message": f"Using tool: {tool_name}"}


def _extract_json(text: str) -> dict | None:
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try to extract JSON block from markdown
    for marker in ["```json", "```"]:
        if marker in text:
            start = text.find(marker) + len(marker)
            end = text.find("```", start)
            if end > start:
                try:
                    return json.loads(text[start:end].strip())
                except json.JSONDecodeError:
                    pass
    # Try to find { ... } block
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    return None
