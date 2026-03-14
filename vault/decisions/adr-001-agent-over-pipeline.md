# ADR-001: AI Research Agent Over Static Data Pipelines

Date: 2026-03-14
Status: Accepted

## Context

Building a product sustainability analysis tool. Sustainability data is incomplete, paywalled, and inconsistent across product categories. Cannot build reliable data pipelines for 6 dimensions in 22 hours.

## Options Considered

### Option A: Static Data Pipeline Integrations
Connect to carbon databases, water APIs, labor databases, etc.

Pros:
- Deterministic, fast responses
- No hallucination risk

Cons:
- Most data sources are paywalled
- Incomplete coverage across categories
- Impossible to build in 22 hours
- Judges will see fake/stubbed integrations

### Option B: AI Research Agent (GPT-OSS as the pipeline)
Use GPT-OSS function calling + web browsing to research products live.

Pros:
- Works for any product (not limited by database coverage)
- Demonstrates real AI capabilities (reasoning, tool use, evidence synthesis)
- Honest about confidence levels
- Visually compelling demo (live research feed)
- Buildable in 22 hours

Cons:
- Latency (20-40 seconds per analysis)
- Risk of hallucinated sources (mitigated by evidence-object architecture)
- Dependent on GPT-OSS server uptime

## Decision

Option B — AI Research Agent

## Reason

1. Plays to GPT-OSS strengths (function calling, reasoning, structured output)
2. Produces a more honest and impressive demo
3. Evidence-based scoring with confidence levels prevents hallucination
4. The research process itself IS the demo wow factor
5. Actually buildable in hackathon timeline

## Consequences

- Must implement strict "no claim without source" rule
- Must stream research process to frontend for demo value
- Must handle latency with parallel searches and early streaming
- Must show "insufficient data" rather than guess
