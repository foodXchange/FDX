"use client";

import { useState } from "react";
import SmartFileImportWizard from "@/components/admin/scraper/SmartFileImportWizard";
import { ManualTargetInjector } from "@/components/admin/scraper/ManualTargetInjector";
import { CsvUploader } from "@/components/admin/CsvUploader";
import { ScraperConsole, type BatchOption } from "@/components/admin/ScraperConsole";

interface ScraperWorkspaceClientProps {
  totalPending: number;
  totalFailed: number;
  totalAll: number;
  batchOptions: BatchOption[];
}

export function ScraperWorkspaceClient({
  totalPending,
  totalFailed,
  totalAll,
  batchOptions,
}: ScraperWorkspaceClientProps) {
  const [ingestMode, setIngestMode] = useState<"smart" | "manual" | "quick">("smart");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column / Expandable Ingestion Card */}
        <div
          className={`transition-all duration-300 ${
            isExpanded ? "lg:col-span-12" : "lg:col-span-5"
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            {/* Tab & Expansion Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl flex-wrap">
                <button
                  type="button"
                  onClick={() => setIngestMode("smart")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    ingestMode === "smart"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>⚡ Smart Wizard</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">
                    Excel/CSV
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode("manual")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    ingestMode === "manual"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ✍️ Quick URL Injector
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode("quick")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    ingestMode === "quick"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📄 Quick CSV
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                title={isExpanded ? "Collapse to side panel" : "Expand to full width"}
              >
                <span>{isExpanded ? "⤢ Collapse" : "⤢ Expand"}</span>
              </button>
            </div>

            {/* Ingestion Content */}
            {ingestMode === "smart" && (
              <div>
                <SmartFileImportWizard />
              </div>
            )}
            {ingestMode === "manual" && (
              <div>
                <ManualTargetInjector />
              </div>
            )}
            {ingestMode === "quick" && (
              <div>
                <CsvUploader />
              </div>
            )}
          </div>
        </div>

        {/* Right Column / Scraper Console (Hidden only if expanded) */}
        {!isExpanded && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <ScraperConsole
              totalPending={totalPending}
              totalFailed={totalFailed}
              totalAll={totalAll}
              batchOptions={batchOptions}
            />
          </div>
        )}
      </div>

      {/* If expanded, render Scraper Console below so it remains accessible */}
      {isExpanded && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <ScraperConsole
            totalPending={totalPending}
            totalFailed={totalFailed}
            totalAll={totalAll}
            batchOptions={batchOptions}
          />
        </div>
      )}
    </div>
  );
}
