"use client";

import { useState } from "react";
import Link from "next/link";
import HistoryPanel from "../components/HistoryPanel";

type HistoryEntry = {
  id: number;
  product: string;
  report: {
    product: string;
    brand: string;
    overall_score: number;
  };
  timestamp: number;
};

export default function HistoryPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_55%,_#ffffff_90%)] dark:bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617_90%)]">
          <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10">

            {/* Header */}
            <header className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    EcoLens
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    Search History
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500"
                  >
                    ← Analyzer
                  </Link>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-500"
                  >
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                </div>
              </div>
              <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                Every completed analysis is stored here. Cache hits load instantly — no agent run needed.
              </p>

              {/* Cache explanation badge */}
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Results are cached for 24 hours — re-analyzing the same product returns instantly from cache.
                </p>
              </div>
            </header>

            {/* History panel */}
            <HistoryPanel />

          </div>
        </div>
      </div>
    </div>
  );
}
