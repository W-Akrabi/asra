/**
 * ResearchGraph — Obsidian-style force-directed sandbox
 * Nodes are SSE events; edges connect consecutive events.
 * Drag nodes, pan viewport, click to inspect.
 */

import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Card } from "./ui/card";
import type { StreamEvent } from "../types/ecolens";

interface ResearchGraphProps {
  events: StreamEvent[];
  isSearching: boolean;
}

// ─── Visual config ──────────────────────────────────────────────────────────

const NODE_COLOR: Record<string, string> = {
  thinking:  "#8b5cf6",
  searching: "#3b82f6",
  reading:   "#f59e0b",
  scoring:   "#10b981",
  done:      "#22c55e",
  error:     "#ef4444",
};

const ICONS: Record<string, string> = {
  thinking:  "💭",
  searching: "🔍",
  reading:   "📖",
  scoring:   "📊",
  done:      "✅",
  error:     "❌",
};

const LABELS: Record<string, string> = {
  thinking:  "Thinking",
  searching: "Searching",
  reading:   "Reading",
  scoring:   "Scoring",
  done:      "Complete",
  error:     "Error",
};

// ─── Simulation types ────────────────────────────────────────────────────────

interface NodeSim {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  pinned: boolean;
  event: StreamEvent;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractUrl(message?: string): string | null {
  if (!message) return null;
  const m = message.match(/https?:\/\/[^\s)>]+/);
  return m ? m[0] : null;
}


// SVG viewport dimensions
const W = 680;
const H = 460;

// Physics constants — larger REST + REPEL so labels have room
const REPEL   = 4500;
const SPRING  = 0.032;
const REST    = 155;
const GRAVITY = 0.004;
const DAMP    = 0.80;
const NR      = 13; // node radius px

// ─── Component ───────────────────────────────────────────────────────────────

export function ResearchGraph({ events, isSearching }: ResearchGraphProps) {
  // Simulation state stored in refs to avoid re-render on every tick
  const nodesRef = useRef<NodeSim[]>([]);
  const edgesRef = useRef<{ s: number; t: number }[]>([]);
  const rafRef   = useRef<number | null>(null);

  // Rendered snapshot — updated ~60fps from the RAF loop
  const [renderNodes, setRenderNodes] = useState<NodeSim[]>([]);

  // Viewport pan (SVG coordinate offset)
  const [pan, setPan]     = useState({ x: 0, y: 0 });
  const panRef            = useRef({ x: 0, y: 0 });
  panRef.current = pan;   // always current

  // Interaction refs (avoid stale closures in event handlers)
  const dragNodeId = useRef<number | null>(null);
  const dragOff    = useRef({ dx: 0, dy: 0 });
  const isPanning  = useRef(false);
  const panStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Inspect panel
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Sync new events → simulation ──────────────────────────────────────────
  useEffect(() => {
    const prev = nodesRef.current.length;
    for (let i = prev; i < events.length; i++) {
      nodesRef.current.push({
        id: i,
        x:  W / 2 + (Math.random() - 0.5) * 80,
        y:  H / 2 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        pinned: false,
        event:  events[i],
      });
      if (i > 0) edgesRef.current.push({ s: i - 1, t: i });
    }
  }, [events]);

  // ── Physics RAF loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      for (const n of nodes) {
        if (n.pinned) continue;
        let fx = 0, fy = 0;

        // Repulsion between all pairs
        for (const o of nodes) {
          if (o.id === n.id) continue;
          const dx = n.x - o.x;
          const dy = n.y - o.y;
          const d  = Math.sqrt(dx * dx + dy * dy) || 1;
          const f  = REPEL / (d * d);
          fx += (f * dx) / d;
          fy += (f * dy) / d;
        }

        // Spring forces along edges
        for (const e of edges) {
          const otherId = e.s === n.id ? e.t : e.t === n.id ? e.s : -1;
          if (otherId === -1) continue;
          const o  = nodes[otherId];
          const dx = o.x - n.x;
          const dy = o.y - n.y;
          const d  = Math.sqrt(dx * dx + dy * dy) || 1;
          const f  = SPRING * (d - REST);
          fx += (f * dx) / d;
          fy += (f * dy) / d;
        }

        // Soft gravity toward center
        fx += GRAVITY * (W / 2 - n.x);
        fy += GRAVITY * (H / 2 - n.y);

        // Integrate
        n.vx = (n.vx + fx) * DAMP;
        n.vy = (n.vy + fy) * DAMP;
        n.x  = Math.max(NR + 2, Math.min(W - NR - 2, n.x + n.vx));
        n.y  = Math.max(NR + 2, Math.min(H - NR - 2, n.y + n.vy));
      }

      // Push snapshot for render
      setRenderNodes([...nodes]);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Coordinate helper: screen px → SVG coordinate ─────────────────────────
  const toSVG = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width  * W - panRef.current.x,
      y: (clientY - rect.top)  / rect.height * H - panRef.current.y,
    };
  };

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const onNodeMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const n = nodesRef.current[id];
    n.pinned = true;
    dragNodeId.current = id;
    const { x, y } = toSVG(e.clientX, e.clientY);
    dragOff.current = { dx: x - n.x, dy: y - n.y };
  };

  const onBgMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    panStart.current = {
      mx: e.clientX, my: e.clientY,
      px: panRef.current.x, py: panRef.current.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragNodeId.current !== null) {
      const { x, y } = toSVG(e.clientX, e.clientY);
      const n = nodesRef.current[dragNodeId.current];
      n.x = x - dragOff.current.dx;
      n.y = y - dragOff.current.dy;
      n.vx = 0; n.vy = 0;
    } else if (isPanning.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx) * (W / rect.width),
        y: panStart.current.py + (e.clientY - panStart.current.my) * (H / rect.height),
      });
    }
  };

  const onMouseUp = () => {
    if (dragNodeId.current !== null) {
      nodesRef.current[dragNodeId.current].pinned = false;
      dragNodeId.current = null;
    }
    isPanning.current = false;
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedEvent = selectedId !== null ? events[selectedId] : null;
  const url           = extractUrl(selectedEvent?.message);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card
      className="flex flex-col overflow-hidden"
      style={{ height: 500, background: "transparent", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-white/5">
        <span className="text-xs font-medium text-white/40 tracking-wide uppercase">
          Research Graph
        </span>
        {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-[#0d0d12]">
          <span className="text-xs text-white/20">
            {isSearching ? "Building graph…" : "Nodes appear as the agent researches"}
          </span>
        </div>
      )}

      {/* Graph canvas */}
      {events.length > 0 && (
        <div className="flex-1 relative min-h-0 bg-[#0d0d12]">
          <svg
            ref={svgRef}
            viewBox={`${-pan.x} ${-pan.y} ${W} ${H}`}
            className="w-full h-full select-none"
            style={{ cursor: dragNodeId.current !== null ? "grabbing" : "grab" }}
            onMouseDown={onBgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onClick={() => setSelectedId(null)}
          >
            <defs>
              {/* Per-color glow filters generated inline */}
              <filter id="rg-glow-s" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="rg-glow-l" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="9" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* ── Edges ──────────────────────────────────────────── */}
            {edgesRef.current.map((e, i) => {
              const s = renderNodes[e.s];
              const t = renderNodes[e.t];
              if (!s || !t) return null;
              const col = NODE_COLOR[s.event.type] ?? "#6b7280";
              return (
                <line
                  key={`e-${i}`}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={col}
                  strokeWidth="1"
                  strokeOpacity="0.22"
                />
              );
            })}

            {/* ── Nodes ──────────────────────────────────────────── */}
            {renderNodes.map((n) => {
              const col       = NODE_COLOR[n.event.type] ?? "#6b7280";
              const isSelected = selectedId === n.id;
              const isLatest   = n.id === renderNodes.length - 1 && isSearching;

              return (
                <g
                  key={`n-${n.id}`}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={(e) => onNodeMouseDown(e, n.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(isSelected ? null : n.id);
                  }}
                >
                  {/* Pulse ring on latest node */}
                  {isLatest && (
                    <circle
                      r={NR + 9}
                      fill="none"
                      stroke={col}
                      strokeWidth="1.5"
                      className="rg-pulse"
                    />
                  )}

                  {/* Large soft outer glow */}
                  <circle r={NR + 6} fill={col} opacity="0.09" filter="url(#rg-glow-l)" />

                  {/* Selection ring */}
                  {isSelected && (
                    <circle r={NR + 4} fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
                  )}

                  {/* Inner glow halo */}
                  <circle r={NR + 1} fill={col} opacity="0.18" filter="url(#rg-glow-s)" />

                  {/* Main dot */}
                  <circle r={NR} fill={col} opacity="0.88" />

                  {/* Shine highlight */}
                  <circle
                    r={NR * 0.38}
                    cx={-NR * 0.22}
                    cy={-NR * 0.28}
                    fill="white"
                    opacity="0.22"
                  />
                </g>
              );
            })}
          </svg>

          {/* ── Node detail panel ────────────────────────────────── */}
          {selectedEvent && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm border-t border-white/10 p-3 rg-slide-up z-10">
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{ICONS[selectedEvent.type]}</span>
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mb-1.5"
                    style={{ background: NODE_COLOR[selectedEvent.type] ?? "#6b7280" }}
                  >
                    {LABELS[selectedEvent.type] ?? selectedEvent.type}
                  </span>
                  {selectedEvent.message && (
                    <p className="text-xs text-white/75 leading-snug">{selectedEvent.message}</p>
                  )}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-[11px] text-blue-400 underline truncate hover:no-underline"
                    >
                      {url}
                    </a>
                  )}
                  {!selectedEvent.message && (
                    <p className="text-[11px] text-white/30 italic">No details</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Pan hint — only shown when no nodes selected and graph has nodes */}
          {!selectedEvent && renderNodes.length > 0 && (
            <div className="absolute bottom-2 right-3 text-[9px] text-white/15 pointer-events-none select-none">
              drag nodes · pan background · click to inspect
            </div>
          )}
        </div>
      )}

      <style>{`
        .rg-pulse {
          transform-origin: center;
          animation: rg-pulse-kf 1.6s ease-out infinite;
        }
        @keyframes rg-pulse-kf {
          0%   { transform: scale(1);   opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0;    }
        }
        .rg-slide-up {
          animation: rg-slide-up-kf 0.2s ease both;
        }
        @keyframes rg-slide-up-kf {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </Card>
  );
}
