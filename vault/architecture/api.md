# API Design

## Base URL

```
http://localhost:8000
```

---

## Endpoints

### GET /health

Health check.

**Response:**
```json
{ "status": "ok" }
```

---

### POST /analyze

Stream a sustainability analysis for a product via SSE.

Checks the cache first — if a cached result exists it is returned immediately
(two events: `thinking` + `done`). Otherwise the agent runs, and on
completion the result is written to both cache and history.

**Request body:**
```json
{ "product": "Nutella" }
```

**SSE event stream** (one JSON object per `data:` line):

| type | payload | meaning |
|---|---|---|
| `thinking` | `message` | Agent reasoning step |
| `searching` | `message` | Tool call in progress |
| `reading` | `message` | Fetching a URL |
| `done` | `message`, `data` (SustainabilityReport) | Final report |
| `error` | `message` | Something went wrong |

---

### GET /history

Return the most recent analysis entries.

**Query params:**
- `limit` (int, 1–100, default 20)

**Response:** array of HistoryEntry objects
```json
[
  {
    "id": 42,
    "product": "Nutella",
    "report": { ... },
    "timestamp": 1742000000.0
  }
]
```

---

### GET /history/{product}

Return past analyses for a specific product (most recent first).

**Query params:**
- `limit` (int, 1–20, default 5)

**Response:** array of HistoryEntry (same shape as above)

---

### DELETE /history

Wipe all history entries.

**Response:**
```json
{ "deleted": 12 }
```

---

### GET /openfoodfacts/search

Raw Open Food Facts lookup (debug / dev use).

**Query params:**
- `name` (string, min length 2)

**Response:** cleaned product object from Open Food Facts
