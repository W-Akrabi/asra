# Data Strategy — The Critical Constraint

## The Problem

Most sustainability data is incomplete, paywalled, or inconsistent across categories.

| Dimension | Data Availability | Reliable Free Sources |
|-----------|------------------|----------------------|
| Carbon footprint | Medium | Open Food Facts, EPA databases, academic estimates |
| Water usage | Hard | Water Footprint Network (limited free), academic papers |
| Labor practices | Very Hard | Fashion Transparency Index (fashion only), news reports |
| Deforestation risk | Hard | Global Forest Watch (geo data, not product-level) |
| Packaging waste | Medium | Product labels, manufacturer disclosures |
| Supply chain origin | Hard | Limited public data, some brand disclosures |

Building real data pipelines for all 6 in a hackathon = impossible.

## The Solution: GPT-OSS AS the Research Agent

Instead of fake database integrations, use GPT-OSS capabilities:

1. **Web browsing** — AI searches for product sustainability data live
2. **Reasoning** — AI synthesizes partial data from multiple sources
3. **Structured output** — AI returns confidence-scored JSON per dimension
4. **Function calling** — AI calls the few free APIs that DO exist

### Why This Is Better

- Honest: doesn't pretend to have data it doesn't
- Impressive: judges watch AI reason over real sources in real time
- Extensible: agent can improve as more data sources become available
- Novel: most hackathon projects fake data — this one shows the research process

## Confidence Scoring System

Each dimension gets a confidence level:

```json
{
  "dimension": "carbon_footprint",
  "score": 6.2,
  "confidence": "high",
  "sources": ["Open Food Facts", "EPA emission factors"],
  "reasoning": "Direct product match found in Open Food Facts with lifecycle data..."
}
```

```json
{
  "dimension": "labor_practices",
  "score": 4.0,
  "confidence": "low",
  "sources": ["Brand transparency report 2024", "News articles"],
  "reasoning": "No direct audit data. Score based on brand's public disclosure level..."
}
```

This transparency IS the feature, not a bug.

## Free Data Sources to Wire Up

### APIs / Databases We CAN Use
- **Open Food Facts** — free API, product carbon/nutrition data (food/beverages)
- **OpenAI web browsing** (via GPT-OSS) — real-time web research
- **Open Apparel Registry** — factory/facility data for fashion
- **Global Forest Watch** — deforestation data (geospatial)

### Data GPT-OSS Can Research Live
- Brand sustainability reports (most are public PDFs)
- News articles about company practices
- Academic lifecycle assessment summaries
- Government environmental databases
- NGO reports (Greenpeace, WWF rankings)

## Architectural Implication

The product is NOT "we have all the data."
The product IS "we have an AI that researches like a sustainability analyst and shows its work."

This is a fundamentally different pitch — and a stronger one.
