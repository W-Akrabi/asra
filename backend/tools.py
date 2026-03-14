import httpx
import json
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------- #
# Ingredient impact lookup table (anchor facts for the agent)
# --------------------------------------------------------------------------- #

INGREDIENT_IMPACT: dict[str, dict] = {
    "beef":         {"carbon": "very_high", "water": "very_high", "deforestation": "high",        "labor": "low"},
    "lamb":         {"carbon": "very_high", "water": "high",      "deforestation": "medium",       "labor": "low"},
    "pork":         {"carbon": "high",      "water": "medium",    "deforestation": "low",          "labor": "low"},
    "chicken":      {"carbon": "medium",    "water": "medium",    "deforestation": "low",          "labor": "medium"},
    "dairy":        {"carbon": "high",      "water": "high",      "deforestation": "low",          "labor": "low"},
    "cheese":       {"carbon": "high",      "water": "high",      "deforestation": "low",          "labor": "low"},
    "milk":         {"carbon": "medium",    "water": "high",      "deforestation": "low",          "labor": "low"},
    "palm oil":     {"carbon": "medium",    "water": "medium",    "deforestation": "very_high",    "labor": "high"},
    "soy":          {"carbon": "medium",    "water": "medium",    "deforestation": "high",         "labor": "medium"},
    "cocoa":        {"carbon": "medium",    "water": "high",      "deforestation": "high",         "labor": "very_high"},
    "chocolate":    {"carbon": "medium",    "water": "high",      "deforestation": "high",         "labor": "very_high"},
    "coffee":       {"carbon": "medium",    "water": "very_high", "deforestation": "medium",       "labor": "high"},
    "almonds":      {"carbon": "low",       "water": "very_high", "deforestation": "low",          "labor": "medium"},
    "avocado":      {"carbon": "medium",    "water": "very_high", "deforestation": "medium",       "labor": "medium"},
    "rice":         {"carbon": "high",      "water": "very_high", "deforestation": "low",          "labor": "medium"},
    "wheat":        {"carbon": "low",       "water": "medium",    "deforestation": "low",          "labor": "low"},
    "sugar":        {"carbon": "low",       "water": "high",      "deforestation": "medium",       "labor": "high"},
    "cotton":       {"carbon": "medium",    "water": "very_high", "deforestation": "low",          "labor": "very_high"},
    "polyester":    {"carbon": "high",      "water": "low",       "deforestation": "low",          "labor": "high"},
    "leather":      {"carbon": "very_high", "water": "very_high", "deforestation": "high",         "labor": "medium"},
    "plastic":      {"carbon": "high",      "water": "low",       "deforestation": "low",          "labor": "low"},
    "hazelnuts":    {"carbon": "low",       "water": "medium",    "deforestation": "low",          "labor": "medium"},
    "shrimp":       {"carbon": "very_high", "water": "medium",    "deforestation": "high",         "labor": "very_high"},
    "salmon":       {"carbon": "medium",    "water": "medium",    "deforestation": "low",          "labor": "medium"},
}


def lookup_ingredient_impact(ingredient: str) -> dict:
    """Return known environmental impact of an ingredient."""
    key = ingredient.lower().strip()
    for known, impact in INGREDIENT_IMPACT.items():
        if known in key or key in known:
            return {"ingredient": ingredient, "found": True, "impacts": impact}
    return {"ingredient": ingredient, "found": False, "impacts": {}}


def fetch_openfoodfacts(product_name: str) -> dict:
    """Search Open Food Facts for product data."""
    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": product_name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 3,
        }
        resp = httpx.get(url, params=params, timeout=8)
        data = resp.json()
        products = data.get("products", [])
        if not products:
            return {"found": False}

        p = products[0]
        return {
            "found": True,
            "product_name": p.get("product_name", product_name),
            "brand": p.get("brands", "Unknown"),
            "categories": p.get("categories", ""),
            "ingredients_text": p.get("ingredients_text", ""),
            "ecoscore_grade": p.get("ecoscore_grade", None),
            "nutriscore_grade": p.get("nutriscore_grade", None),
            "packaging": p.get("packaging", ""),
            "countries": p.get("countries", ""),
        }
    except Exception as e:
        return {"found": False, "error": str(e)}


def fetch_page(url: str, max_chars: int = 3000) -> dict:
    """Fetch and clean a web page, returning plain text."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; EcoLens/1.0)"}
        resp = httpx.get(url, headers=headers, timeout=10, follow_redirects=True)
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())[:max_chars]
        return {"url": url, "content": text, "success": True}
    except Exception as e:
        return {"url": url, "content": "", "success": False, "error": str(e)}


# --------------------------------------------------------------------------- #
# Tool schemas for GPT-OSS function calling
# --------------------------------------------------------------------------- #

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_ingredient_impact",
            "description": (
                "Look up the known environmental impact of a specific ingredient. "
                "Returns carbon, water, deforestation, and labor risk levels."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ingredient": {"type": "string", "description": "The ingredient name to look up."}
                },
                "required": ["ingredient"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_openfoodfacts",
            "description": (
                "Search Open Food Facts database for a food/beverage product. "
                "Returns brand, category, ingredients, and eco-score if available."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "The product name to search for."}
                },
                "required": ["product_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_page",
            "description": (
                "Fetch and extract text content from a web URL. "
                "Use this to read sustainability reports, brand pages, or news articles."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The full URL to fetch."},
                },
                "required": ["url"],
            },
        },
    },
]


def execute_tool(name: str, arguments: dict) -> str:
    """Dispatch a tool call by name and return JSON string result."""
    if name == "lookup_ingredient_impact":
        result = lookup_ingredient_impact(arguments["ingredient"])
    elif name == "fetch_openfoodfacts":
        result = fetch_openfoodfacts(arguments["product_name"])
    elif name == "fetch_page":
        result = fetch_page(arguments["url"])
    else:
        result = {"error": f"Unknown tool: {name}"}
    return json.dumps(result)
