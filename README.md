# EcoLens

EcoLens is a prototype that analyzes product sustainability across carbon, water, deforestation, and labor. It combines Open Food Facts metadata, a small ingredient impact table, and (optionally) external web sources through a GPT OSS model gateway.

## Architecture
File structure:
```text
.
├─ backend
│  ├─ agent.py
│  ├─ main.py
│  ├─ models.py
│  ├─ openfood.py
│  ├─ tools.py
│  └─ routes.http
├─ frontend
│  ├─ package.json
│  └─ ...
├─ int.json
└─ commit.md
```
Components:
- `backend/main.py` hosts the FastAPI API and SSE streaming endpoint.
- `backend/agent.py` runs the GPT OSS-driven research loop and fallback logic.
- `backend/tools.py` contains Open Food Facts fetchers, ingredient impact lookup, and lightweight web search.
- `backend/openfood.py` wraps Open Food Facts with a cleaned product shape and async wrapper.
- `frontend/` is a Next.js app that consumes the API.

Routes:
- `GET /health` returns `{ "status": "ok" }`.
- `GET /openfoodfacts/search?name=...` returns cleaned product metadata from Open Food Facts.
- `POST /analyze` streams SSE events ending with a JSON report.

## Dev Setup
Backend:
1. Install libraries:
```bash
python3 -m pip install -r 
backend/requirements.txt
```
2. Copy over the contents of `backend/.env.example` into `backend/.env`
3. Add your GPT OSS gateway to `backend/.env`: `GPT_OSS_BASE_URL=...` and `OPENAI_API_KEY=...`. The provided .env.example will work as is until the end of the hackathon.
4. Run the API: `python3 backend/main.py`

Frontend:
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Notes:
- `GPT_OSS_BASE_URL` points to your model gateway endpoint and is required for `/analyze`.
- `OPENAI_API_KEY` is read by the OpenAI client even when using a custom base URL, a placeholder value is needed.
- `OPENFOODFACTS_BASE_URL` is optional and defaults to `https://world.openfoodfacts.org`.
