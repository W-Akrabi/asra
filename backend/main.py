import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from models import AnalyzeRequest
from agent import run_agent

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


if __name__ == "__main__" and not os.getenv("DEPLOYED_URL"):
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)