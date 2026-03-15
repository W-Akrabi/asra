"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const DIMENSIONS = ["Carbon", "Water", "Deforestation", "Labor/Ethics"] as const;

type Dimension = {
  name: string;
  score: number;
  confidence: "high" | "medium" | "low" | "insufficient_data";
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

type EventMessage = {
  type: "thinking" | "searching" | "reading" | "scoring" | "done" | "error";
  message: string;
  data?: Report;
};

export default function Home() {
  const [product, setProduct] = useState("");
  const [events, setEvents] = useState<EventMessage[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const radarData = useMemo(() => {
    const base = DIMENSIONS.map((name) => ({ name, score: 0 }));
    if (!report) return base;
    const map = new Map(report.dimensions.map((d) => [d.name, d.score]));
    return base.map((d) => ({ ...d, score: Number(map.get(d.name) ?? 0) }));
  }, [report]);

  const onAnalyze = () => {
    if (!product.trim()) return;
    setEvents([]);
    setReport(null);
    setError(null);
    setIsRunning(true);

    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
    const url = `${baseUrl}/analyze`;
    const body = JSON.stringify({ product: product.trim() });

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body,
    })
      .then((resp) => {
        if (!resp.body) throw new Error("Streaming not supported by this browser");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const read = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) {
              setIsRunning(false);
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? "";
            blocks
              .filter(Boolean)
              .forEach((block) => {
                const line = block
                  .split("\n")
                  .find((l) => l.startsWith("data:"));
                if (!line) return;
                const payload = line.replace(/^data:\s?/, "").trim();
                if (!payload) return;
                try {
                  const evt = JSON.parse(payload) as EventMessage;
                  setEvents((prev) => [...prev, evt]);
                  if (evt.type === "done" && evt.data) {
                    setReport(evt.data);
                    setIsRunning(false);
                  }
                  if (evt.type === "error") {
                    setError(evt.message || "Agent error");
                    setIsRunning(false);
                  }
                } catch (err) {
                  setError("Failed to parse stream response");
                }
              });
            read();
          });
        };
        read();
      })
      .catch((err) => {
        setIsRunning(false);
        setError(err instanceof Error ? err.message : "Request failed");
      });

  };

  const lastEvent = events[events.length - 1];
  const statusLabel = lastEvent?.message || "Waiting for input";
  const statusType = lastEvent?.type || "idle";

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_55%,_#ffffff_90%)] dark:bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617_90%)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">EcoLens</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Sustainability Research, Live
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/history"
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500"
              >
                History
              </Link>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                SSE Live Feed
              </span>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Enter any product and watch the research agent gather evidence, score impact, and surface greener alternatives.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-900/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Try: Oatly Barista Edition, Nutella, Patagonia fleece"
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
            />
            <button
              onClick={onAnalyze}
              disabled={isRunning}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 dark:disabled:bg-slate-600"
            >
              {isRunning ? "Researching..." : "Analyze"}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  isRunning ? "animate-pulse bg-emerald-500 dark:bg-emerald-400" : "bg-slate-400 dark:bg-slate-600"
                }`}
              />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {isRunning ? "Live agent running" : "Idle"} · {statusLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`rounded-full px-2 py-1 ${statusType === "thinking" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-950/60"}`}>
                Thinking
              </span>
              <span className={`rounded-full px-2 py-1 ${statusType === "searching" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-950/60"}`}>
                Searching
              </span>
              <span className={`rounded-full px-2 py-1 ${statusType === "reading" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-950/60"}`}>
                Reading
              </span>
              <span className={`rounded-full px-2 py-1 ${statusType === "scoring" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-950/60"}`}>
                Scoring
              </span>
            </div>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
              {error}
            </p>
          )}
        </section>

        <main className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-900/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Research Feed</h2>
              <span className="text-xs text-slate-400">{events.length} events</span>
            </div>
            <div className="mt-4 space-y-3">
              {events.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
                  Start an analysis to watch the research stream.
                </div>
              )}
              {events.map((evt, idx) => (
                <div key={`${evt.type}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{evt.type}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{evt.message}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-900/40">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Impact Scorecard</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {report ? `Overall ${report.overall_score.toFixed(1)}` : "Awaiting results"}
                </span>
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={theme === "dark" ? "#1f2937" : "#e2e8f0"} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: theme === "dark" ? "#cbd5f5" : "#475569", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fill: theme === "dark" ? "#64748b" : "#94a3b8", fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#34d399" fill="#34d399" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-3">
                {DIMENSIONS.map((dim) => {
                  const detail = report?.dimensions.find((d) => d.name === dim);
                  return (
                    <div key={dim} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{dim}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {detail ? detail.score.toFixed(1) : "-"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {detail ? detail.confidence.replace("_", " ") : "pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-900/40">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Evidence & Alternatives</h2>
              {report ? (
                <div className="mt-4 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Summary</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{report.summary}</p>
                  </div>
                  <div className="grid gap-4">
                    {report.dimensions.map((dim) => (
                      <div key={dim.name} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{dim.name}</p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{dim.confidence}</span>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {dim.evidence.map((evi, idx) => (
                            <div key={`${dim.name}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                              <p className="text-slate-700 dark:text-slate-200">{evi.claim}</p>
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {evi.source}
                                {evi.url ? ` — ${evi.url}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Alternatives</p>
                    <div className="mt-3 grid gap-3">
                      {report.alternatives.map((alt, idx) => (
                        <div key={`${alt.name}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {alt.name} · {alt.brand}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{alt.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Run an analysis to see evidence and alternatives.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
      </div>
    </div>
  );
}
