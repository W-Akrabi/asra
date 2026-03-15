import asyncio
import time

import openfoodfacts
import requests

_DEFAULT_FIELDS = (
    "product_name",
    "brands",
    "categories",
    "ingredients_text",
    "ecoscore_grade",
    "nutriscore_grade",
    "packaging",
    "countries",
)


def _clean_product(p: dict, fallback_name: str) -> dict:
    return {
        "found": True,
        "product_name": p.get("product_name", fallback_name),
        "brand": p.get("brands", "Unknown"),
        "categories": p.get("categories", ""),
        "ingredients_text": p.get("ingredients_text", ""),
        "ecoscore_grade": p.get("ecoscore_grade", None),
        "nutriscore_grade": p.get("nutriscore_grade", None),
        "packaging": p.get("packaging", ""),
        "countries": p.get("countries", ""),
    }


def search_product(
    product_name: str,
    *,
    timeout: int = 30,
    retries: int = 3,
    backoff_s: float = 1.5,
    page_size: int = 3,
    fields: tuple[str, ...] = _DEFAULT_FIELDS,
):
    api = openfoodfacts.API(user_agent="Asra-GenAI-Genesis", timeout=timeout)
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            data = api.product.text_search(product_name, page_size=page_size)
            products = data.get("products", []) if isinstance(data, dict) else []
            if not products:
                return {"found": False}
            cleaned = _clean_product(products[0], product_name)
            if fields:
                cleaned = {k: v for k, v in cleaned.items() if k in fields or k == "found"}
            return cleaned
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(backoff_s * attempt)
                continue
            raise
    if last_err:
        return {"found": False, "error": str(last_err)}


async def async_search_product(
    product_name: str,
    *,
    timeout: int = 30,
    retries: int = 3,
    backoff_s: float = 1.5,
    page_size: int = 3,
    fields: tuple[str, ...] = _DEFAULT_FIELDS,
):
    return await asyncio.to_thread(
        search_product,
        product_name,
        timeout=timeout,
        retries=retries,
        backoff_s=backoff_s,
        page_size=page_size,
        fields=fields,
    )

