/**
 * Parse a single SSE event block from text.
 * Supports "data: {json}" format used by the backend.
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
