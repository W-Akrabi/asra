# GPT-OSS 120B Capabilities Analysis

## What It's Great At

- **Function calling** — can call external APIs, databases, tools
- **Reasoning** — configurable depth (low/medium/high), full chain-of-thought
- **Web browsing** — can fetch live data from the web
- **Python code execution** — can run calculations, data analysis
- **Structured outputs** — returns JSON, tables, structured data reliably
- **128k context** — can process large documents

## What This Means for Our Project

GPT-OSS is an **agentic model** — it's best used as an AI that:
1. Takes a user request
2. Reasons about what tools/data it needs
3. Calls functions to gather information
4. Processes and analyzes the data
5. Returns structured, actionable results

## Best Fit Use Cases

- **AI agent** that researches products/companies and returns sustainability scores
- **Multi-step analysis** where the AI chains web lookups → data processing → recommendations
- **Function-calling pipeline** where AI orchestrates multiple data sources
- **Reasoning-heavy tasks** like comparing tradeoffs between options

## Poor Fit Use Cases

- Computer vision (no image input capability mentioned)
- Real-time streaming/processing
- Offline/edge computing
- Fine-tuned classification tasks

## Strategic Implication

Build something that showcases the model as an **intelligent agent** — not a chatbot, not a classifier, but an AI that actively researches, reasons, and produces structured analysis. This plays directly to GPT-OSS strengths and demonstrates technical sophistication to judges.
