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

load_dotenv()

app = FastAPI(title="EcoLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    Event types: thinking | searching | reading | scoring | done | error
    """
    async def event_generator():
        async for event in run_agent(request.product):
            yield {"data": json.dumps(event)}

    return EventSourceResponse(event_generator())


@app.get("/openfoodfacts/search")
async def openfoodfacts_search(name: str = Query(..., min_length=2)):
    """
    Search Open Food Facts by product name.
    """
    return await fetch_openfoodfacts(name)


if __name__ == "__main__" and not os.getenv("DEPLOYED_URL"):
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
