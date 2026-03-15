# Build Log — Day 2

Date: 2026-03-15

## Completed

- **Cache layer** (`backend/cache.py`): SQLite-backed, normalised product key, 24h TTL with lazy expiry eviction. No new deps — stdlib `sqlite3`.
- **History layer** (`backend/history.py`): append-only log of every completed analysis in the same `ecolens.db`. Queryable by recency or by product name.
- **HistoryEntry model** added to `backend/models.py`.
- **API wiring** (`backend/main.py`):
  - `POST /analyze` now checks cache before running the agent; writes cache + history on completion
  - `GET /history` — recent entries
  - `GET /history/{product}` — product-specific history
  - `DELETE /history` — clear all
- **Vault docs**: updated `data-model.md`, `api.md`, `sprint.md`, `build-log/day2.md`

## In Progress

- Frontend surfacing of history (not yet started — need to coordinate with Umair on page.tsx)

## Issues / Blockers

- `requirements.txt` missing `openfoodfacts` package (needed by `openfood.py`) — flagged, needs fixing before submission
- Umair's `web-search` branch uses sync tools while `search` branch uses async — architectural conflict needs resolution before merge

## Notes

- All work done on `waleedsearch` branch to avoid stepping on Umair's `search` branch
- `ecolens.db` is gitignored (SQLite file, not committed)
- Cache hit returns a `thinking` event followed by `done` so the frontend SSE handler doesn't need changes
