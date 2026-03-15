// --------------------------------------------------------------------------- //
// Backend → frontend report normalizer
//
// The backend returns scores on a 0–10 scale with a `dimensions` array.
// The frontend SustainabilityReport type expects flat 0–100 fields.
// This function bridges the gap so nothing else needs to change.
// --------------------------------------------------------------------------- //

type BackendDimension = {
  name: string;
  score: number;
  confidence?: string;
  evidence?: Array<{ claim: string; source: string; url?: string | null }>;
};

type BackendReport = {
  product?: string;
  product_name?: string;
  brand?: string;
  category?: string;
  overall_score?: number;
  carbon_score?: number;
  dimensions?: BackendDimension[];
  summary?: string;
  alternatives?: Array<{ name: string; brand: string; reason: string }>;
  [key: string]: unknown;
};

// Normalise dimension names so "Labour", "Labor & Ethics", etc. all resolve.
function normDim(s: string): string {
  return s.toLowerCase().replace("labour", "labor").replace(/[^a-z]/g, "");
}

function dimFind(name: string, dims: BackendDimension[]): BackendDimension | undefined {
  const needle = normDim(name);
  return dims.find((d) => normDim(d.name).startsWith(needle));
}

function dimScore(name: string, dims: BackendDimension[]): number {
  const d = dimFind(name, dims);
  return d ? Math.round(d.score * 10) : 0;
}

function dimEvidence(name: string, dims: BackendDimension[]): { claim: string; source?: string; url?: string | null }[] {
  const d = dimFind(name, dims);
  return (d?.evidence ?? []).map((e) => ({
    claim: e.claim,
    source: e.source,
    url: e.url,
  }));
}

function normalizeReport(raw: BackendReport): BackendReport {
  // Already in frontend format — nothing to do
  if (raw.carbon_score !== undefined || raw.product_name !== undefined) return raw;

  const dims = raw.dimensions ?? [];

  return {
    product_name: raw.product ?? "",
    brand: raw.brand ?? "Unknown",
    category: raw.category ?? "",
    overall_score: Math.round((raw.overall_score ?? 0) * 10),
    carbon_score: dimScore("carbon", dims),
    water_score: dimScore("water", dims),
    deforestation_score: dimScore("deforestation", dims),
    labor_score: dimScore("labor", dims),
    summary: raw.summary ?? "",
    alternatives: (raw.alternatives ?? []).map((alt) =>
      typeof alt === "string" ? alt : `${alt.name} by ${alt.brand} — ${alt.reason}`
    ),
    evidence: {
      carbon: dimEvidence("carbon", dims),
      water: dimEvidence("water", dims),
      deforestation: dimEvidence("deforestation", dims),
      labor: dimEvidence("labor", dims),
    },
  };
}

/**
 * Parse a single SSE event block from text.
 * Supports "data: {json}" format used by the backend.
 * Normalizes "done" event data from backend format to frontend format.
 */
export function parseSSEEvent(
  block: string
): { type: string; message?: string; data?: unknown } | null {
  const dataLines = block
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (dataLines.length === 0) return null;

  const payload = dataLines.join("\n").trim();
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed.type === "string") {
      if (parsed.type === "done" && parsed.data && typeof parsed.data === "object") {
        return { ...parsed, data: normalizeReport(parsed.data as BackendReport) };
      }
      return parsed;
    }
  } catch {
    // ignore non-JSON payloads
  }

  return null;
}

/**
 * Process SSE stream chunks and extract complete events
 * Handles partial events across chunks and multiple line endings
 */
export function processSSEChunk(
  chunk: string,
  buffer: string
): { events: Array<{ type: string; message?: string; data?: unknown }>; remainingBuffer: string } {
  const combinedBuffer = buffer + chunk;
  
  // Split by both \n\n and \r\n\r\n for SSE event boundaries
  const lines = combinedBuffer.split(/\r?\n\r?\n/);
  
  // Keep incomplete event in buffer
  const remainingBuffer = lines.pop() || "";
  
  const events = lines
    .map((line) => parseSSEEvent(line))
    .filter((event): event is { type: string; data: string } => event !== null);

  return { events, remainingBuffer };
}
