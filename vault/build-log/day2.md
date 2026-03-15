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
- **HistoryPanel component** (`frontend/app/components/HistoryPanel.tsx`): expandable cards, score colour coding, timeAgo timestamps, per-dimension breakdown, `onLoad` callback hook for future embedding
- **`/history` page** (`frontend/app/history/page.tsx`): standalone route matching existing design system, cache explanation badge for demo, dark mode toggle, link back to analyzer

- **Agent rewrite** (`backend/agent.py`): replaced OpenAI native `tool_calls`/`tool_choice` with prompt-based tool calling. GPT-OSS endpoint confirmed to return `tool_calls: []` / `finish_reason: stop` on every request — it does not support the function calling API. New approach: system prompt teaches the model to output `{"action": "<tool>", "args": {...}}` as plain JSON; loop parses and dispatches; up to 2 nudges before fallback. All tools (web search, Open Food Facts, ingredient lookup, fetch_page) now actually fire.
- **routes.http, README, cache status, History nav link** — see previous entries.

## In Progress

- (nothing)

## Issues / Blockers

- Umair's `web-search` branch (sync tools, Groq support) not yet merged — coordinate before submission

## Notes

- All work done on `waleedsearch` branch to avoid stepping on Umair's `search` branch
- `ecolens.db` is gitignored (SQLite file, not committed)
- Cache hit returns a `thinking` event followed by `done` so the frontend SSE handler doesn't need changes
