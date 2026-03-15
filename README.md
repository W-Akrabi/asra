# EcoLens

EcoLens is a sustainability research tool that analyzes any product across four dimensions — carbon footprint, water usage, deforestation risk, and labor/ethics — using an AI agent backed by Open Food Facts and live web search.

## Features

- **Live research stream** — watch the agent call tools and gather evidence in real time via SSE
- **Result caching** — repeated queries return instantly from a local SQLite cache (24h TTL)
- **Search history** — every completed analysis is logged and browsable at `/history`
- **Radar scorecard** — four-dimension sustainability scores visualized as a radar chart
- **Greener alternatives** — agent suggests more sustainable alternatives for each product

## Architecture

```text
.
├─ backend
│  ├─ agent.py       # GPT OSS agent loop — tool calling + fallback logic
│  ├─ cache.py       # SQLite result cache (24h TTL, normalised keys)
│  ├─ history.py     # Append-only analysis log
│  ├─ main.py        # FastAPI app + SSE streaming + history/cache routes
│  ├─ models.py      # Pydantic models
│  ├─ openfood.py    # Open Food Facts SDK wrapper
│  ├─ tools.py       # Tool implementations + schemas for function calling
│  └─ routes.http    # REST Client test file
└─ frontend
   ├─ app
   │  ├─ page.tsx                    # Main analyzer UI
   │  ├─ history/page.tsx            # /history browsing page
   │  └─ components/HistoryPanel.tsx # Reusable history panel component
   └─ package.json
```

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/analyze` | Stream SSE sustainability analysis (checks cache first) |
| GET | `/history` | Recent analyses (`?limit=20`) |
| GET | `/history/{product}` | Analyses for a specific product (`?limit=5`) |
| DELETE | `/history` | Clear all history |
| GET | `/cache/status` | Cache entry count and DB size |
| GET | `/openfoodfacts/search?name=` | Raw Open Food Facts lookup |

## Dev Setup

### Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env
# The provided .env.example works as-is until end of hackathon

# Start the server
python3 main.py
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Usage

1. Open `http://localhost:3000`
2. Type any product name (food, clothing, electronics) and click **Analyze**
3. Watch the live research feed as the agent gathers evidence
4. View the radar scorecard and evidence breakdown
5. Navigate to `http://localhost:3000/history` to browse past analyses
6. Re-analyzing the same product serves the result instantly from cache

## Notes

- `GPT_OSS_BASE_URL` must point to a running model gateway compatible with the OpenAI API
- `OPENAI_API_KEY` is required by the OpenAI client even with a custom base URL — a placeholder value works
- The SQLite database (`backend/ecolens.db`) is created automatically on first run and is gitignored
