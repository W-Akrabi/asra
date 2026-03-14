# ADR-002: 4 Sustainability Dimensions, Not 6

Date: 2026-03-14
Status: Accepted

## Context

Originally planned 6 sustainability dimensions. Data availability analysis showed 2 dimensions (packaging waste, supply chain origin) add complexity without proportional value.

## Decision

Limit to 4 dimensions: Carbon, Water, Deforestation, Labor/Ethics.

## Reason

- Carbon + Water = most data available, most intuitive to users
- Deforestation = high public awareness (palm oil), strong evidence available
- Labor/Ethics = judges care about social sustainability, not just environmental
- Packaging can be inferred from product data without a full dimension
- Supply chain origin is too hard to research reliably in real-time

## Consequences

- Simpler frontend (4-point radar chart instead of 6)
- More focused agent research (fewer searches per product)
- Lower latency per analysis
- Higher confidence scores (more data per dimension)
