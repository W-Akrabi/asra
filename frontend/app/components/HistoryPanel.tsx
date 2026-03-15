"use client";

import { useEffect, useState, useCallback } from "react";

type Dimension = {
  name: string;
  score: number;
  confidence: string;
  evidence: Array<{ claim: string; source: string; url?: string | null; confidence: number }>;
};

type Report = {
  product: string;
  brand: string;
  category: string;
  overall_score: number;
  dimensions: Dimension[];
  alternatives: Array<{ name: string; brand: string; reason: string }>;
  summary: string;
};

type HistoryEntry = {
  id: number;
  product: string;
  report: Report;
  timestamp: number;
};

function scoreColor(score: number) {
  if (score >= 7) return "text-emerald-500 dark:text-emerald-400";
  if (score >= 4) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

function scoreBg(score: number) {
  if (score >= 7) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800";
  if (score >= 4) return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800";
  return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type Props = {
  /** Called when the user clicks "Load" on an entry — lets parent restore a report */
  onLoad?: (entry: HistoryEntry) => void;
  /** Show a compact inline version without the page chrome */
  compact?: boolean;
};

export default function HistoryPanel({ onLoad, compact = false }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const baseUrl = (
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${baseUrl}/history?limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: HistoryEntry[]) => setEntries(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [baseUrl]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const containerClass = compact
    ? "flex flex-col gap-3"
    : "rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-900/40";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Searches
          </h2>
          {entries.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {entries.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchHistory}
          className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500"
        >
          Refresh
        </button>
      </div>

      {/* Body */}
      {loading && (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading history…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
          Could not load history: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
          No searches yet — run an analysis to see it here.
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="mt-2 flex flex-col gap-3">
          {entries.map((entry) => {
            const isOpen = expanded === entry.id;
            const score = entry.report.overall_score;

            return (
              <div
                key={entry.id}
                className={`rounded-2xl border transition-all ${scoreBg(score)}`}
              >
                {/* Row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Score badge */}
                  <span
                    className={`shrink-0 text-xl font-bold tabular-nums ${scoreColor(score)}`}
                  >
                    {score.toFixed(1)}
                  </span>

                  {/* Product info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {entry.report.product}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {entry.report.brand} · {entry.report.category}
                    </p>
                  </div>

                  {/* Timestamp + actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
                      {timeAgo(entry.timestamp)}
                    </span>
                    {onLoad && (
                      <button
                        onClick={() => onLoad(entry)}
                        className="rounded-xl bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                      >
                        Load
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isOpen ? null : entry.id)}
                      className="rounded-xl border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-400"
                    >
                      {isOpen ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {entry.report.summary}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {entry.report.dimensions.map((dim) => (
                        <div
                          key={dim.name}
                          className="rounded-xl bg-white/60 px-3 py-2 text-center dark:bg-slate-900/60"
                        >
                          <p className="text-xs text-slate-500 dark:text-slate-400">{dim.name}</p>
                          <p className={`mt-0.5 text-base font-bold ${scoreColor(dim.score)}`}>
                            {dim.score.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {dim.confidence.replace("_", " ")}
                          </p>
                        </div>
                      ))}
                    </div>

                    {entry.report.alternatives.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Alternatives
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.report.alternatives.map((alt, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              {alt.name} · {alt.brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
