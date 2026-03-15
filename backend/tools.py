import httpx
import asyncio
import os
import json
from bs4 import BeautifulSoup
from openfood import async_search_product
from pyrxing import read_barcodes

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

# Depreciated, not used currently.
async def fetch_openfoodfacts(product_name: str) -> dict:
    """Search Open Food Facts for product data using API v2."""

    base_url = os.getenv("OPENFOODFACTS_BASE_URL", "https://world.openfoodfacts.org")
    url = f"{base_url}/api/v2/search"
    params = {
        "search_terms": product_name,
        "page_size": 3,
        "fields": ",".join(
            [
                "product_name",
                "brands",
                "categories",
                "ingredients_text",
                "ecoscore_grade",
                "nutriscore_grade",
                "packaging",
                "countries",
            ]
        ),
    }
    timeout = httpx.Timeout(12.0, connect=4.0)
    headers = {
        "User-Agent": os.getenv(
            "OPENFOODFACTS_USER_AGENT",
            "EcoLens/0.1 (contact: dev@example.com)",
        )
    }
    if base_url.endswith(".net"):
        headers["Authorization"] = "Basic b2ZmOm9mZg=="
    last_error: str | None = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
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
            last_error = str(e)
            await asyncio.sleep(0.3 * (attempt + 1))
    return {"found": False, "error": last_error or "Unknown error"}


async def identify_product(product_name: str) -> dict:
    """Resolve a product name to structured info using Open Food Facts."""
    off = await async_search_product(product_name)

    if not off.get("found"):
        return {"found": False, "source": "openfoodfacts", "product_name": product_name}
    ingredients_text = off.get("ingredients_text", "")
    ingredients = _parse_ingredients(ingredients_text)
    return {
        "found": True,
        "source": "openfoodfacts",
        "product_name": off.get("product_name", product_name),
        "brand": off.get("brand", off.get("brands", "Unknown")),
        "category": off.get("categories", ""),
        "ingredients_text": ingredients_text,
        "ingredients": ingredients,
    }


async def fetch_page(url: str, max_chars: int = 3000) -> dict:
    """Fetch and clean a web page, returning plain text."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; EcoLens/1.0)"}
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())[:max_chars]
        return {"url": url, "content": text, "success": True}
    except Exception as e:
        return {"url": url, "content": "", "success": False, "error": str(e)}


async def search_web(query: str, max_results: int = 5) -> dict:
    """Lightweight web search using DuckDuckGo HTML results."""
    try:
        params = {"q": query}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://duckduckgo.com/html/", params=params)
            soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for a in soup.select("a.result__a")[:max_results]:
            title = a.get_text(strip=True)
            url = a.get("href")
            if title and url:
                results.append({"title": title, "url": url})
        return {"query": query, "results": results, "success": True}
    except Exception as e:
        return {"query": query, "results": [], "success": False, "error": str(e)}


async def find_alternatives(product: str, category: str | None = None) -> dict:
    """Find alternative products via web search."""
    q = f"sustainable alternatives to {product}"
    if category:
        q = f"sustainable {category} alternatives to {product}"
    return await search_web(q, max_results=5)

def extract_barcode(img_path: str):
    try:
        results = read_barcodes(img_path)
    except Exception as e:
        return {"found": False, "error": "invalid_image", "detail": str(e)}
    if not results:
        return {"found": False, "format": None, "text": None}
    if len(results) > 1:
        return {"found": False, "error": "multiple_barcodes"}
    result = results[0]
    return {"found": True, "format": result.format, "text": result.text}


async def fetch_openfoodfacts_by_barcode(code: str) -> dict:
    """Fetch Open Food Facts product data by barcode."""
    base_url = os.getenv("OPENFOODFACTS_BASE_URL", "https://world.openfoodfacts.org")
    url = f"{base_url}/api/v2/product/{code}"
    params = {
        "fields": ",".join(
            [
                "product_name",
                "brands",
                "categories",
                "ingredients_text",
                "ecoscore_grade",
                "nutriscore_grade",
                "packaging",
                "countries",
                "code",
            ]
        )
    }
    timeout = httpx.Timeout(12.0, connect=4.0)
    headers = {
        "User-Agent": os.getenv(
            "OPENFOODFACTS_USER_AGENT",
            "EcoLens/0.1 (contact: dev@example.com)",
        )
    }
    if base_url.endswith(".net"):
        headers["Authorization"] = "Basic b2ZmOm9mZg=="

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 404:
            return {"found": False, "code": code}
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, dict) or data.get("status") == 0:
            return {"found": False, "code": code}
        p = data.get("product", {}) if isinstance(data, dict) else {}
        return {
            "found": True,
            "code": p.get("code", code),
            "product_name": p.get("product_name", ""),
            "brand": p.get("brands", "Unknown"),
            "categories": p.get("categories", ""),
            "ingredients_text": p.get("ingredients_text", ""),
            "ecoscore_grade": p.get("ecoscore_grade", None),
            "nutriscore_grade": p.get("nutriscore_grade", None),
            "packaging": p.get("packaging", ""),
            "countries": p.get("countries", ""),
        }

# --------------------------------------------------------------------------- #
# Tool schemas for GPT-OSS function calling
# --------------------------------------------------------------------------- #

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "identify_product",
            "description": (
                "Resolve a product name into structured product info (brand, category, ingredients). "
                "Uses Open Food Facts as the primary source."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "The product name to identify."}
                },
                "required": ["product_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for sources relevant to sustainability research.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query."},
                    "max_results": {"type": "integer", "description": "Max results to return."},
                },
                "required": ["query"],
            },
        },
    },
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
            "name": "find_alternatives",
            "description": "Find more sustainable alternative products.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {"type": "string", "description": "Product name."},
                    "category": {"type": "string", "description": "Optional category."},
                },
                "required": ["product"],
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


async def execute_tool(name: str, arguments: dict) -> str:
    """Dispatch a tool call by name and return JSON string result."""
    if name == "identify_product":
        result = await identify_product(arguments["product_name"])
    elif name == "search_web":
        result = await search_web(arguments["query"], arguments.get("max_results", 5))
    elif name == "find_alternatives":
        result = await find_alternatives(arguments["product"], arguments.get("category"))
    elif name == "lookup_ingredient_impact":
        result = lookup_ingredient_impact(arguments["ingredient"])
    elif name == "fetch_openfoodfacts":
        result = await fetch_openfoodfacts(arguments["product_name"])
    elif name == "fetch_page":
        result = await fetch_page(arguments["url"])
    else:
        result = {"error": f"Unknown tool: {name}"}
    return json.dumps(result)


def _parse_ingredients(ingredients_text: str, limit: int = 10) -> list[str]:
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
