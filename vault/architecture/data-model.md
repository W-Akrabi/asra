# Data Model

## Entities

### SustainabilityReport

The primary output of an analysis run. Stored in both the cache and history tables.

| Field | Type | Description |
|---|---|---|
| product | string | Product name as given by the user |
| brand | string | Brand resolved from Open Food Facts |
| category | string | Product category |
| overall_score | float (0–10) | Weighted average of dimension scores |
| dimensions | DimensionScore[] | Per-dimension breakdown |
| alternatives | Alternative[] | Suggested greener alternatives |
| summary | string | 2–3 sentence plain-English summary |

### DimensionScore

| Field | Type | Description |
|---|---|---|
| name | string | "Carbon" \| "Water" \| "Deforestation" \| "Labor" |
| score | float (0–10) | 10 = most sustainable |
| confidence | string | "high" \| "medium" \| "low" \| "insufficient_data" |
| evidence | EvidenceItem[] | Sources backing the score |

### EvidenceItem

| Field | Type | Description |
|---|---|---|
| claim | string | Specific factual claim |
| source | string | Source name or domain |
| url | string \| null | Direct link if available |
| confidence | float (0–1) | Model confidence in the claim |

### Alternative

| Field | Type | Description |
|---|---|---|
| name | string | Alternative product name |
| brand | string | Alternative brand |
| reason | string | Why it is more sustainable |

### HistoryEntry

Stored in the `history` table of `ecolens.db`.

| Field | Type | Description |
|---|---|---|
| id | integer | Auto-incremented primary key |
| product | string | Original product name as typed |
| product_key | string | Normalised (lowercase, stripped) key |
| report | JSON | Full SustainabilityReport |
| timestamp | float | Unix epoch of when analysis completed |

## Relationships

- One product search → one `cache` row (keyed by normalised product name, replaced on re-run)
- One product search → one new `history` row appended (never replaced, grows over time)
- A `HistoryEntry` embeds a complete `SustainabilityReport`

## Storage

Single SQLite file: `backend/ecolens.db` (gitignored).

Two tables managed by `cache.py` and `history.py` respectively:

| Table | Purpose | Retention |
|---|---|---|
| `cache` | Deduplicates expensive LLM calls | 24h TTL, lazy eviction |
| `history` | Audit log of all completed analyses | Indefinite (manual clear via `DELETE /history`) |

SQLite was chosen for the hackathon because:
- Zero external dependencies (stdlib `sqlite3`)
- File-based — no separate process to run
- Trivially replaceable with Postgres/Redis post-hackathon
