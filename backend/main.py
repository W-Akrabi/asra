import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from models import AnalyzeRequest
from agent import run_agent
from tools import fetch_openfoodfacts
import cache
import history

load_dotenv()

app = FastAPI(title="EcoLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Stream sustainability analysis events via SSE.
    Serves a cached report immediately if available; otherwise runs the agent
    and caches + records the result on completion.
    Event types: thinking | searching | reading | scoring | done | error
    """
    cached = cache.get(request.product)
    if cached:
        async def cached_generator():
            yield {"data": json.dumps({"type": "thinking", "message": "Loaded from cache"})}
            yield {"data": json.dumps({"type": "done", "message": "Analysis complete (cached)", "data": cached})}
        return EventSourceResponse(cached_generator())

    async def event_generator():
        async for event in run_agent(request.product):
            yield {"data": json.dumps(event)}
            if event.get("type") == "done" and event.get("data"):
                cache.set(request.product, event["data"])
                history.add_entry(request.product, event["data"])

    return EventSourceResponse(event_generator())


@app.get("/cache/status")
async def cache_status():
    """Return cache entry count, active entries, and DB size."""
    return cache.status()


@app.get("/history")
async def get_history(limit: int = Query(20, ge=1, le=100)):
    """Return the most recent analysis entries, newest first."""
    return history.get_recent(limit=limit)


@app.get("/history/{product}")
async def get_product_history(product: str, limit: int = Query(5, ge=1, le=20)):
    """Return past analyses for a specific product."""
    return history.get_by_product(product, limit=limit)


@app.delete("/history")
async def clear_history():
    """Wipe all history entries."""
    count = history.clear()
    return {"deleted": count}


@app.get("/openfoodfacts/search")
async def openfoodfacts_search(name: str = Query(..., min_length=2)):
    """
    Search Open Food Facts by product name.
    """
    return await fetch_openfoodfacts(name)


if __name__ == "__main__" and not os.getenv("DEPLOYED_URL"):
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
