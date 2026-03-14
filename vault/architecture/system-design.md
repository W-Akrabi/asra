# System Design — EcoLens

## Identity

**AI Sustainability Research Agent** — not a product scanner, not a calculator.

An autonomous research agent that investigates any product's sustainability impact using real sources, transparent reasoning, and evidence-backed scoring.

## Core System Model

```
User input (product name / barcode)
        ↓
Product identification (resolve to brand, category, ingredients)
        ↓
Research agent (parallel web searches, page fetches)
        ↓
Evidence extraction (claims + sources + confidence)
        ↓
Structured sustainability scorecard (evidence → scores)
        ↓
Alternative recommendations
        ↓
Frontend render (radar chart, citations, confidence badges)
```

The agent COLLECTS EVIDENCE and SYNTHESIZES — it does not guess.

## Agent Toolset (5 Tools)

### 1. identify_product(name)
Resolves ambiguous input to structured product info.

```json
{
  "product": "Nutella",
  "brand": "Ferrero",
  "category": "hazelnut_spread",
  "ingredients": ["sugar", "palm oil", "hazelnuts", "cocoa", "skim milk"]
}
```

Sources: product pages, Open Food Facts API, Wikipedia.

### 2. search_web(query)
Primary research interface. Returns search results.

```json
[
  {"title": "...", "snippet": "...", "url": "..."}
]
```

Example agent-generated queries:
- "Nutella carbon footprint hazelnut spread lifecycle"
- "Ferrero palm oil sustainability report"
- "environmental impact chocolate spread ingredients"

### 3. fetch_page(url)
Fetches and cleans a web page for evidence extraction.

Returns: cleaned text content from the URL.

### 4. find_alternatives(product, category)
Searches for sustainable alternatives.

Runs queries like: "best sustainable hazelnut spread brands"

### 5. lookup_ingredient_impact(ingredient)
Local lookup table for known high-impact ingredients.

```
beef         -> very high carbon, high water
palm oil     -> deforestation risk
cocoa        -> labor risk
almonds      -> high water usage
avocado      -> high water, transport emissions
cotton       -> high water, pesticide use
plastic      -> packaging waste
```

Gives the model anchor facts without needing web search.

## 4 Sustainability Dimensions (Not 6)

| Dimension | Why It's Included |
|-----------|------------------|
| Carbon | Most intuitive, most data available |
| Water | Critical for food products |
| Deforestation | Palm oil / soy — high public awareness |
| Labor / Ethics | Cocoa, fashion — judges care about this |

Packaging can be inferred quickly from product data. No need for a dedicated dimension.

## Evidence-Based Scoring (Critical Design Rule)

The agent NEVER outputs scores directly.

**Step 1: Collect evidence objects**
```json
{
  "dimension": "deforestation",
  "evidence": [
    {
      "claim": "Nutella contains palm oil",
      "source": "Ferrero ingredient list",
      "confidence": 0.9
    },
    {
      "claim": "Palm oil production is leading driver of deforestation in Southeast Asia",
      "source": "WWF Palm Oil Report 2024",
      "confidence": 0.8
    }
  ]
}
```

**Step 2: Convert evidence → score**

Score derived from evidence quantity + quality + agreement.

This separation prevents hallucinated numbers.

## Confidence Scoring

Source-driven, not model-guessed.

```
confidence = f(
    number_of_sources,
    source_quality,       // NGO report > blog post
    agreement_between_sources
)
```

Rules:
- 3+ agreeing quality sources → High confidence
- 1-2 sources or mixed quality → Medium confidence
- 0-1 sources → Low confidence or "insufficient data"

**Hard rule: NO CLAIM WITHOUT SOURCE.** If no evidence found, dimension_status = "insufficient_data".

## Real-Time Research Feed (SSE Stream)

The demo wow factor. Users watch the agent work:

```
🔍 Identifying product: Nutella
📋 Found: Ferrero, hazelnut spread, 5 ingredients
🔎 Searching: "Nutella palm oil sustainability"
📄 Reading: WWF report on palm oil
🔎 Searching: "carbon footprint hazelnut spread lifecycle"
📄 Reading: Lifecycle assessment study
🧠 Synthesizing sustainability analysis...
✅ Scorecard ready
```

Streamed via SSE to frontend in real time.

## Technical Risks + Mitigations

### Risk 1: Latency (agent research = 20-40 seconds)
- **Mitigation:** Parallel searches across dimensions
- **Mitigation:** Stream partial results as they arrive
- **Mitigation:** Cache results for repeated products
- **Mitigation:** Ingredient impact table provides instant baseline

### Risk 2: Hallucinated sources
- **Mitigation:** Hard rule — no claim without source URL
- **Mitigation:** Evidence objects force structured attribution
- **Mitigation:** "Insufficient data" instead of guessing
- **Mitigation:** Frontend shows source links users can verify

## Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend | FastAPI (Python) | Native OpenAI SDK, async, SSE support |
| AI | GPT-OSS 120B | Free, function calling, reasoning, web browsing |
| Frontend | Next.js + React + Tailwind | Fast, polished, SSE consumption |
| Streaming | SSE (Server-Sent Events) | Real-time agent feed |
| Data | Open Food Facts API + web search + local ingredient table | Free, no API keys needed |
| Deploy | Vercel (frontend) + Railway (backend) | Fast, free tier |

## Architecture Map

```
User (Browser)
    ↓ POST /analyze
FastAPI Backend
    ↓ SSE stream
GPT-OSS 120B Agent
    ├── identify_product() → Open Food Facts / web
    ├── search_web() → live web search
    ├── fetch_page() → extract evidence
    ├── lookup_ingredient_impact() → local table
    └── find_alternatives() → web search
    ↓
Evidence Objects
    ↓
Score Synthesis
    ↓
Structured JSON Response
    ↓ SSE
Frontend
    ├── Live research feed
    ├── Radar chart (4 dimensions)
    ├── Evidence citations
    ├── Confidence badges
    └── Alternative recommendations
```
