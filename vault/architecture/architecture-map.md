# Architecture Map

```
User (Browser)
    │
    │ POST /analyze {product_name}
    ▼
┌─────────────────────────┐
│   FastAPI Backend        │
│   /analyze endpoint      │
│   SSE streaming          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   GPT-OSS 120B Agent    │
│   (function calling)     │
│                          │
│   Tools:                 │
│   ├─ identify_product()  │──→ Open Food Facts API
│   ├─ search_web()        │──→ Web search results
│   ├─ fetch_page()        │──→ Page content extraction
│   ├─ lookup_ingredient() │──→ Local impact table
│   └─ find_alternatives() │──→ Web search
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Evidence Objects       │
│   (claim + source +      │
│    confidence per dim)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Score Synthesis        │
│   evidence → scores      │
│   confidence calculation │
└────────┬────────────────┘
         │ SSE stream
         ▼
┌─────────────────────────┐
│   Next.js Frontend       │
│   ├─ Research feed       │
│   ├─ Radar chart         │
│   ├─ Evidence panel      │
│   ├─ Confidence badges   │
│   └─ Alternatives list   │
└─────────────────────────┘
```

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-14 | Initial architecture — AI research agent model | Team |
