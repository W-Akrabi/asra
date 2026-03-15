import json
import os
from collections.abc import AsyncGenerator
from openai import OpenAI
from tools import TOOL_SCHEMAS, execute_tool, identify_product, lookup_ingredient_impact

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
- You MUST call tools to gather evidence before scoring
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
            if _is_valid_report(report):
                yield {"type": "done", "message": "Analysis complete", "data": report}
            else:
                # Fallback: run lightweight tool-based research when model doesn't call tools
                yield {"type": "thinking", "message": "Running fallback research (tools not called)"}
                yield {"type": "searching", "message": f"Identifying product: {product}"}
                off = await identify_product(product)
                ingredients = off.get("ingredients", []) if isinstance(off, dict) else []
                impacts = []
                for ing in ingredients:
                    yield {"type": "searching", "message": f"Checking ingredient: {ing}"}
                    impacts.append(lookup_ingredient_impact(ing))
                evidence = {
                    "product_query": product,
                    "openfoodfacts": off,
                    "ingredients": ingredients,
                    "ingredient_impacts": impacts,
                }
                fallback_report = _build_minimal_report(product, evidence)
                if _is_valid_report(fallback_report):
                    yield {"type": "done", "message": "Analysis complete", "data": fallback_report}
                else:
                    yield {
                        "type": "error",
                        "message": "Agent returned malformed output",
                        "data": {"raw": content, "evidence": evidence},
                    }
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

            result = await execute_tool(tool_name, arguments)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    yield {"type": "error", "message": "Agent exceeded max iterations"}


def _tool_event(tool_name: str, arguments: dict) -> dict:
    if tool_name == "identify_product":
        return {"type": "searching", "message": f"Identifying product: {arguments.get('product_name', '')}"}
    if tool_name == "search_web":
        return {"type": "searching", "message": f"Searching: {arguments.get('query', '')}"}
    if tool_name == "find_alternatives":
        return {"type": "searching", "message": f"Finding alternatives for: {arguments.get('product', '')}"}
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


def _is_valid_report(report: dict | None) -> bool:
    if not isinstance(report, dict):
        return False
    required_keys = [
        "product",
        "brand",
        "category",
        "overall_score",
        "dimensions",
        "alternatives",
        "summary",
    ]
    if any(key not in report for key in required_keys):
        return False
    if not isinstance(report["product"], str):
        return False
    if not isinstance(report["brand"], str):
        return False
    if not isinstance(report["category"], str):
        return False
    if not isinstance(report["dimensions"], list):
        return False
    if not isinstance(report["alternatives"], list):
        return False
    if not isinstance(report["summary"], str):
        return False
    return True


def _parse_ingredients(ingredients_text: str, limit: int = 8) -> list[str]:
    if not ingredients_text:
        return []
    cleaned = (
        ingredients_text.replace("(", ",")
        .replace(")", ",")
        .replace("[", ",")
        .replace("]", ",")
        .replace(";", ",")
    )
    parts = [p.strip() for p in cleaned.split(",")]
    seen: set[str] = set()
    ingredients: list[str] = []
    for p in parts:
        if not p:
            continue
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        ingredients.append(p)
        if len(ingredients) >= limit:
            break
    return ingredients


def _impact_to_score(level: str) -> float:
    mapping = {
        "very_high": 2.0,
        "high": 4.0,
        "medium": 6.0,
        "low": 8.0,
    }
    return mapping.get(level, 5.0)


def _build_minimal_report(product: str, evidence: dict) -> dict:
    off = evidence.get("openfoodfacts", {}) if isinstance(evidence, dict) else {}
    product_name = off.get("product_name") or product
    brand = off.get("brand") or "Unknown"
    category = off.get("category") or "Unknown"

    impacts = evidence.get("ingredient_impacts", [])
    dims = ["carbon", "water", "deforestation", "labor"]
    dimensions = []
    scores = []

    for dim in dims:
        dim_scores = []
        evidence_list = []
        for item in impacts:
            if not isinstance(item, dict) or not item.get("found"):
                continue
            impact_level = item.get("impacts", {}).get(dim)
            if not impact_level:
                continue
            score = _impact_to_score(impact_level)
            dim_scores.append(score)
            evidence_list.append(
                {
                    "claim": f"{item.get('ingredient')} has {impact_level} {dim} impact (ingredient proxy).",
                    "source": "ingredient_impact_table",
                    "url": None,
                    "confidence": 0.6,
                }
            )

        if dim_scores:
            avg = sum(dim_scores) / len(dim_scores)
            confidence = "low" if len(dim_scores) < 2 else "medium"
            dimensions.append(
                {
                    "name": dim.capitalize(),
                    "score": round(avg, 1),
                    "confidence": confidence,
                    "evidence": evidence_list,
                }
            )
            scores.append(avg)
        else:
            dimensions.append(
                {
                    "name": dim.capitalize(),
                    "score": 5.0,
                    "confidence": "insufficient_data",
                    "evidence": [],
                }
            )

    overall_score = round(sum(scores) / len(scores), 1) if scores else 5.0

    summary = (
        "This report is based only on Open Food Facts product metadata and an ingredient-level impact table. "
        "No external web sources were fetched, so confidence is limited to ingredient proxy signals."
    )

    return {
        "product": str(product_name),
        "brand": str(brand),
        "category": str(category),
        "overall_score": overall_score,
        "dimensions": dimensions,
        "alternatives": [],
        "summary": summary,
    }
