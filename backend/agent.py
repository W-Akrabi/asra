import json
import os
from collections.abc import AsyncGenerator
from openai import OpenAI
from tools import execute_tool, identify_product, lookup_ingredient_impact

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url=os.getenv("GPT_OSS_BASE_URL", "https://handles-virtual-creating-introduced.trycloudflare.com/v1"),
)

# --------------------------------------------------------------------------- #
# System prompt — teaches the model to call tools via plain JSON text since
# the GPT-OSS endpoint does not support the OpenAI native tool_calls API.
# --------------------------------------------------------------------------- #

SYSTEM_PROMPT = """You are EcoLens, an AI sustainability research agent.

Your job is to analyze ANY product's sustainability across 4 dimensions:
1. Carbon footprint (production emissions, transportation)
2. Water usage (production water consumption)
3. Deforestation risk (ingredients linked to forest clearing)
4. Labor / ethics (supply chain labor conditions)

## How to Call Tools

You have access to tools. To call a tool output ONLY a JSON object — no other
text, no explanation, no markdown — in exactly this format:

{"action": "<tool_name>", "args": {<arguments>}}

Available tools:

- identify_product(product_name)
  Look up a product on Open Food Facts. Returns brand, category, ingredients.
  Example: {"action": "identify_product", "args": {"product_name": "Nutella"}}

- lookup_ingredient_impact(ingredient)
  Returns carbon / water / deforestation / labor impact levels for one ingredient.
  Example: {"action": "lookup_ingredient_impact", "args": {"ingredient": "palm oil"}}

- search_web(query, max_results)
  Live DuckDuckGo search. Returns title, URL, snippet for each result.
  Example: {"action": "search_web", "args": {"query": "Nutella palm oil deforestation", "max_results": 5}}

- fetch_page(url)
  Fetch and extract text from a URL (sustainability reports, brand pages, news).
  Example: {"action": "fetch_page", "args": {"url": "https://example.com/report"}}

- find_alternatives(product, category)
  Find more sustainable alternatives via web search.
  Example: {"action": "find_alternatives", "args": {"product": "Nutella", "category": "chocolate spread"}}

## Research Process

1. Call identify_product to get brand, category, and ingredients
2. Call lookup_ingredient_impact for each key ingredient (call it once per ingredient)
3. Call search_web to find real sustainability data and news
4. Call fetch_page on the most relevant URLs
5. Only after gathering evidence, output the final report

## Hard Rules

- Call at least 3 tools before writing the final report
- NEVER output a score without evidence
- Do NOT hallucinate statistics — only use numbers from tool results
- If you cannot find evidence for a dimension, set confidence to "insufficient_data"
- Always cite your sources (URL or source name) for every claim

## Final Report

When you have enough evidence, output ONLY this JSON (no "action" key):

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

_NUDGE = (
    "Your response was not valid JSON. "
    "Please respond with either a tool call — "
    '{"action": "<tool_name>", "args": {...}} — '
    "or the final report JSON. No other text."
)


async def run_agent(product: str) -> AsyncGenerator[dict, None]:
    """
    Run the sustainability research agent for a product.
    Uses prompt-based tool calling (plain JSON) because the GPT-OSS endpoint
    does not support the OpenAI native tool_calls / tool_choice API.
    Yields event dicts for SSE streaming to the frontend.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze the sustainability of: {product}"},
    ]

    yield {"type": "thinking", "message": f"Starting research on: {product}"}

    max_iterations = 14
    nudges = 0

    for _ in range(max_iterations):
        response = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "openai/gpt-oss-120b"),
            messages=messages,
            max_tokens=4096,
        )

        content = (response.choices[0].message.content or "").strip()
        messages.append({"role": "assistant", "content": content})

        parsed = _extract_json(content)

        # ── Tool call ──────────────────────────────────────────────────────
        if isinstance(parsed, dict) and "action" in parsed:
            nudges = 0
            tool_name = parsed.get("action", "")
            arguments = parsed.get("args", {})
            if not isinstance(arguments, dict):
                arguments = {}

            yield _tool_event(tool_name, arguments)

            try:
                result = await execute_tool(tool_name, arguments)
            except Exception as e:
                result = json.dumps({"error": str(e)})

            messages.append({
                "role": "user",
                "content": f"Tool result ({tool_name}): {result}",
            })
            continue

        # ── Final report ───────────────────────────────────────────────────
        if _is_valid_report(parsed):
            yield {"type": "done", "message": "Analysis complete", "data": parsed}
            return

        # ── Model output non-JSON text — nudge it back on track ────────────
        nudges += 1
        if nudges <= 2:
            yield {"type": "thinking", "message": "Refining response format..."}
            messages.append({"role": "user", "content": _NUDGE})
            continue

        # ── Gave up nudging — run the lightweight fallback ─────────────────
        break

    # Fallback: gather evidence directly without the model driving tool calls
    yield {"type": "thinking", "message": "Running fallback research"}
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
            "message": "Agent could not produce a valid report",
            "data": {"evidence": evidence},
        }


def _tool_event(tool_name: str, arguments: dict) -> dict:
    if tool_name == "identify_product":
        return {"type": "searching", "message": f"Identifying product: {arguments.get('product_name', '')}"}
    if tool_name == "search_web":
        return {"type": "searching", "message": f"Searching: {arguments.get('query', '')}"}
    if tool_name == "find_alternatives":
        return {"type": "searching", "message": f"Finding alternatives for: {arguments.get('product', '')}"}
    if tool_name == "lookup_ingredient_impact":
        return {"type": "searching", "message": f"Checking ingredient: {arguments.get('ingredient', '')}"}
    if tool_name == "fetch_page":
        url = arguments.get("url", "")
        domain = url.split("/")[2] if url.startswith("http") else url
        return {"type": "reading", "message": f"Reading: {domain}"}
    return {"type": "thinking", "message": f"Using tool: {tool_name}"}


def _extract_json(text: str) -> dict | None:
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # JSON inside a markdown code block
    for marker in ["```json", "```"]:
        if marker in text:
            start = text.find(marker) + len(marker)
            end = text.find("```", start)
            if end > start:
                try:
                    return json.loads(text[start:end].strip())
                except json.JSONDecodeError:
                    pass
    # Bare { ... } block anywhere in the text
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
    required = ["product", "brand", "category", "overall_score", "dimensions", "alternatives", "summary"]
    if any(k not in report for k in required):
        return False
    if "action" in report:          # tool call mistakenly validated as report
        return False
    if not isinstance(report["dimensions"], list):
        return False
    if not isinstance(report["alternatives"], list):
        return False
    return True


def _impact_to_score(level: str) -> float:
    return {"very_high": 2.0, "high": 4.0, "medium": 6.0, "low": 8.0}.get(level, 5.0)


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
            evidence_list.append({
                "claim": f"{item.get('ingredient')} has {impact_level} {dim} impact.",
                "source": "ingredient_impact_table",
                "url": None,
                "confidence": 0.6,
            })

        if dim_scores:
            avg = sum(dim_scores) / len(dim_scores)
            dimensions.append({
                "name": dim.capitalize(),
                "score": round(avg, 1),
                "confidence": "low" if len(dim_scores) < 2 else "medium",
                "evidence": evidence_list,
            })
            scores.append(avg)
        else:
            dimensions.append({
                "name": dim.capitalize(),
                "score": 5.0,
                "confidence": "insufficient_data",
                "evidence": [],
            })

    return {
        "product": str(product_name),
        "brand": str(brand),
        "category": str(category),
        "overall_score": round(sum(scores) / len(scores), 1) if scores else 5.0,
        "dimensions": dimensions,
        "alternatives": [],
        "summary": (
            "This report is based on Open Food Facts metadata and an ingredient impact table. "
            "No external web sources were fetched, so confidence is limited."
        ),
    }
