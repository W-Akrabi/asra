import type { SustainabilityReport, StreamEvent } from "../types/ecolens";

/**
 * Mock sustainability report for testing
 */
export const mockReport: SustainabilityReport = {
  product_name: "Nutella",
  carbon_score: 45,
  water_score: 60,
  deforestation_score: 35,
  labor_score: 55,
  overall_score: 49,
  summary:
    "This product has moderate to poor sustainability scores due to palm oil content (deforestation risk) and cocoa sourcing (labor concerns). Water and carbon footprints are moderate.",
  evidence: {
    carbon: [
      "Moderate carbon emissions from cocoa and dairy production",
      "Transportation contributes to overall carbon footprint",
    ],
    water: [
      "Cocoa farming requires significant water resources",
      "Sugar production is water-intensive",
    ],
    deforestation: [
      "Contains palm oil, a major driver of deforestation in Southeast Asia",
      "No clear certification for sustainable palm oil sourcing",
    ],
    labor: [
      "Cocoa industry has documented child labor concerns in West Africa",
      "Some suppliers lack fair labor certifications",
    ],
  },
  alternatives: [
    "Justin's Organic Chocolate Hazelnut Butter (USDA Organic, fair trade)",
    "Nocciolata Organic Hazelnut Spread (organic, palm oil-free)",
    "Rigoni di Asiago Nocciolata (organic hazelnuts, fair trade cocoa)",
  ],
};

/**
 * Mock SSE events for testing
 */
export const mockEvents: StreamEvent[] = [
  { type: "thinking", message: "Analyzing product composition and ingredients..." },
  { type: "searching", message: "Querying Open Food Facts database..." },
  { type: "reading", message: "Found product: Nutella (Ferrero)" },
  {
    type: "thinking",
    message: "Identifying key sustainability risk factors: palm oil, cocoa, sugar...",
  },
  { type: "scoring", message: "Calculating carbon footprint score..." },
  { type: "scoring", message: "Calculating water usage score..." },
  { type: "scoring", message: "Calculating deforestation risk score..." },
  { type: "scoring", message: "Calculating labor practices score..." },
  { type: "thinking", message: "Synthesizing overall sustainability assessment..." },
  { type: "done", message: "Analysis complete" },
];

/**
 * Simulate SSE streaming with delays
 */
export async function* mockSSEStream(
  productName: string,
  delayMs: number = 800
): AsyncGenerator<StreamEvent> {
  const customizedEvents = mockEvents.map((event) =>
    event.type === "reading" && event.message?.includes("Nutella")
      ? { ...event, message: event.message.replace("Nutella", productName) }
      : event
  );

  for (const event of customizedEvents) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield event;
  }
}

/**
 * Get a customized mock report for a product
 */
export function getMockReport(productName: string): SustainabilityReport {
  return {
    ...mockReport,
    product_name: productName,
  };
}
