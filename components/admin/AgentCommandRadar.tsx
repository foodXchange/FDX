"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { RequestRow } from "@/app/admin/requests/page";
import {
  deriveAgentProjectStage,
  STAGE_DEFINITIONS,
  type AgentProjectStageInfo,
} from "@/lib/admin/deriveAgentProjectStage";
import { cleanRequestName } from "@/lib/matching/cleanRequestName";

interface Props {
  requests: RequestRow[];
}

type ViewMode = "radar" | "bottlenecks";
type FilterBottleneck = "all" | "agent" | "buyer" | "factory" | "logistics" | "subcontractor";

export default function AgentCommandRadar({ requests }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("radar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<number | "all">("all");
  const [bottleneckFilter, setBottleneckFilter] = useState<FilterBottleneck>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Enrich each request with its derived stage & bottleneck info
  const enrichedProjects = useMemo(() => {
    return requests.map((req) => {
      const stageInfo = deriveAgentProjectStage(req);
      const cleaned = req.product_name ? cleanRequestName(req.product_name) : "Food Product";
      return {
        ...req,
        cleanedName: cleaned || req.product_name || "Food Product",
        stageInfo,
      };
    });
  }, [requests]);

  // Aggregate Agent Portfolio Financials & Stats
  const stats = useMemo(() => {
    const totalProjects = enrichedProjects.length;
    let totalPipelineValue = 0;
    let totalEstimatedCommission = 0;
    let urgentCount = 0;
    let inTransitCount = 0;
    let waitingOnBuyerCount = 0;
    let waitingOnFactoryCount = 0;

    for (const p of enrichedProjects) {
      totalPipelineValue += p.stageInfo.estimatedDealValueEur;
      totalEstimatedCommission += p.stageInfo.estimatedCommissionEur;
      if (p.stageInfo.urgency === "urgent") urgentCount++;
      if (p.stageInfo.urgency === "in_transit") inTransitCount++;
      if (p.stageInfo.bottleneckParty === "buyer") waitingOnBuyerCount++;
      if (p.stageInfo.bottleneckParty === "factory") waitingOnFactoryCount++;
    }

    return {
      totalProjects,
      totalPipelineValue,
      totalEstimatedCommission,
      urgentCount,
      inTransitCount,
      waitingOnBuyerCount,
      waitingOnFactoryCount,
    };
  }, [enrichedProjects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return enrichedProjects.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.cleanedName.toLowerCase().includes(q);
        const matchesCompany = (p.company ?? "").toLowerCase().includes(q);
        const matchesId = p.id.toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesId) return false;
      }

      // Stage
      if (selectedStage !== "all" && p.stageInfo.stageNumber !== selectedStage) {
        return false;
      }

      // Bottleneck
      if (bottleneckFilter !== "all" && p.stageInfo.bottleneckParty !== bottleneckFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedProjects, searchQuery, selectedStage, bottleneckFilter]);

  // Projects grouped by Stage for Radar View
  const stageGroups = useMemo(() => {
    const map: Record<number, typeof filteredProjects> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
    };
    for (const p of filteredProjects) {
      map[p.stageInfo.stageNumber].push(p);
    }
    return map;
  }, [filteredProjects]);

  function handleCopyTag(tag: string, id: string) {
    navigator.clipboard.writeText(tag);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section className="mb-8">
      {/* ── Top Hero: Agent Financial & Sourcing Radar ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl mb-6 border border-slate-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Agent Operations
              </span>
              <span className="text-xs text-slate-400">Trade Broker & Intermediary Desk</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Multi-Project Sourcing Radar
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Track your entire deal portfolio across all 7 stages. Monitor supplier quotes, courier samples,
              regulatory clearances, and container freights with zero circumvention risk.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/70 text-center">
              <div className="text-xs font-medium text-slate-400">Active Deals</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">{stats.totalProjects}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Sourcing Pipelines</div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/70 text-center">
              <div className="text-xs font-medium text-slate-400">Est. Pipeline Value</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                €{(stats.totalPipelineValue / 1000).toFixed(0)}k
              </div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">Total Cargo Value</div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/70 text-center">
              <div className="text-xs font-medium text-slate-400">Est. Agent Brokerage</div>
              <div className="text-2xl font-extrabold text-amber-300 mt-0.5">
                €{(stats.totalEstimatedCommission / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">~5% Target Spread</div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/70 text-center">
              <div className="text-xs font-medium text-rose-300 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                Action Required
              </div>
              <div className="text-2xl font-extrabold text-rose-400 mt-0.5">{stats.urgentCount}</div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">Critical Bottlenecks</div>
            </div>
          </div>
        </div>

        {/* Action Priority Quick Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 font-medium">Bottleneck Breakdown:</span>
            <button
              onClick={() => setBottleneckFilter(bottleneckFilter === "buyer" ? "all" : "buyer")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                bottleneckFilter === "buyer"
                  ? "bg-amber-500/30 border-amber-400 text-amber-200"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              👤 Waiting on Buyer: <strong className="text-white">{stats.waitingOnBuyerCount}</strong>
            </button>
            <button
              onClick={() => setBottleneckFilter(bottleneckFilter === "factory" ? "all" : "factory")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                bottleneckFilter === "factory"
                  ? "bg-purple-500/30 border-purple-400 text-purple-200"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              🏭 Waiting on Factory: <strong className="text-white">{stats.waitingOnFactoryCount}</strong>
            </button>
            <button
              onClick={() => setBottleneckFilter(bottleneckFilter === "logistics" ? "all" : "logistics")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                bottleneckFilter === "logistics"
                  ? "bg-sky-500/30 border-sky-400 text-sky-200"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              📦 In Transit (Courier/Vessel): <strong className="text-white">{stats.inTransitCount}</strong>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-0.5 bg-slate-800 border border-slate-700">
              <button
                onClick={() => setViewMode("radar")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "radar"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🛰️ 7-Stage Radar
              </button>
              <button
                onClick={() => setViewMode("bottlenecks")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "bottlenecks"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ⚡ Bottleneck Priority List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, buyer company, or deal ID..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedStage("all")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedStage === "all"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Stages ({enrichedProjects.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const def = STAGE_DEFINITIONS[num];
            const count = enrichedProjects.filter((p) => p.stageInfo.stageNumber === num).length;
            return (
              <button
                key={num}
                onClick={() => setSelectedStage(selectedStage === num ? "all" : num)}
                className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedStage === num
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>Stage {num}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedStage === num ? "bg-indigo-700 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View 1: 7-Stage Radar (Visual Pipeline Columns) ── */}
      {viewMode === "radar" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7].map((stageNum) => {
            const def = STAGE_DEFINITIONS[stageNum];
            const stageProjects = stageGroups[stageNum] || [];

            return (
              <div
                key={stageNum}
                className="bg-gray-100/70 rounded-xl p-2.5 border border-gray-200/80 flex flex-col min-h-[450px]"
              >
                {/* Stage Header */}
                <div className="pb-2.5 border-b border-gray-200 mb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Stage {stageNum}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 shadow-2xs">
                      {stageProjects.length}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 mt-0.5 truncate" title={def.name}>
                    {def.short}
                  </h3>
                  <div className={`h-1 w-full bg-gradient-to-r ${def.color} rounded-full mt-1.5`} />
                </div>

                {/* Project Cards in Stage */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                  {stageProjects.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      <span className="text-lg opacity-40">📂</span>
                      <span className="text-[11px] mt-1 font-medium">No deals in this stage</span>
                    </div>
                  ) : (
                    stageProjects.map((project) => (
                      <ProjectDealCard
                        key={project.id}
                        project={project}
                        copiedId={copiedId}
                        onCopyTag={handleCopyTag}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View 2: Bottleneck Priority List (Sorted by Urgency) ── */}
      {viewMode === "bottlenecks" && (
        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200 text-gray-500">
              <span className="text-3xl">🔍</span>
              <p className="mt-2 text-sm font-medium">No projects match the selected filter criteria.</p>
            </div>
          ) : (
            filteredProjects
              .slice()
              .sort((a, b) => {
                const urgencyOrder = { urgent: 0, action_needed: 1, in_transit: 2, on_track: 3 };
                return urgencyOrder[a.stageInfo.urgency] - urgencyOrder[b.stageInfo.urgency];
              })
              .map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative flex items-center justify-center">
                      {project.images?.[0]?.url ? (
                        <Image
                          src={project.images[0].url}
                          alt={project.cleanedName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xl">🥫</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                          Stage {project.stageInfo.stageNumber}: {project.stageInfo.stageShortCode}
                        </span>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          [FDX-REQ-{project.id.slice(0, 8).toUpperCase()}]
                        </span>
                        <span className="text-xs text-gray-400">
                          {project.company || "Independent Buyer"}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">
                        {project.cleanedName}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                        <span>{project.stageInfo.highlightDetails}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">
                          Est. Comm: €{project.stageInfo.estimatedCommissionEur.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bottleneck Status Banner */}
                  <div className="md:w-80 shrink-0">
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        project.stageInfo.urgency === "urgent"
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : project.stageInfo.urgency === "action_needed"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : project.stageInfo.urgency === "in_transit"
                          ? "bg-sky-50 border-sky-200 text-sky-900"
                          : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      <span className="text-base shrink-0">
                        {project.stageInfo.bottleneckParty === "buyer"
                          ? "👤"
                          : project.stageInfo.bottleneckParty === "factory"
                          ? "🏭"
                          : project.stageInfo.bottleneckParty === "logistics"
                          ? "📦"
                          : project.stageInfo.bottleneckParty === "subcontractor"
                          ? "🔬"
                          : "⚡"}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{project.stageInfo.bottleneckLabel}</span>
                          {project.stageInfo.urgency === "urgent" && (
                            <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] leading-tight text-gray-700 mt-0.5 truncate">
                          {project.stageInfo.actionMessage}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/requests/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
                    >
                      Open Project Hub →
                    </Link>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </section>
  );
}

function ProjectDealCard({
  project,
  copiedId,
  onCopyTag,
}: {
  project: RequestRow & { cleanedName: string; stageInfo: AgentProjectStageInfo };
  copiedId: string | null;
  onCopyTag: (tag: string, id: string) => void;
}) {
  const reqTag = `[FDX-REQ-${project.id.slice(0, 8).toUpperCase()}]`;

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group">
      <div>
        {/* Top: Image & Tag */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative flex items-center justify-center">
            {project.images?.[0]?.url ? (
              <Image
                src={project.images[0].url}
                alt={project.cleanedName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-sm">🥫</span>
            )}
          </div>

          <button
            onClick={() => onCopyTag(reqTag, project.id)}
            title="Click to copy project tracking tag"
            className="text-[10px] font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 transition-colors"
          >
            {copiedId === project.id ? "✓ Copied" : reqTag}
          </button>
        </div>

        {/* Product & Buyer */}
        <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {project.cleanedName}
        </h4>
        <div className="text-[11px] text-gray-500 truncate mt-0.5">
          {project.company || "Independent Buyer"}
        </div>

        {/* 7-Segment Stage Progress */}
        <div className="grid grid-cols-7 gap-0.5 my-2">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={`h-1 rounded-full ${
                step <= project.stageInfo.stageNumber
                  ? "bg-indigo-600"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Bottleneck Badge */}
        <div
          className={`p-1.5 rounded-md border text-[11px] mb-2 leading-tight ${
            project.stageInfo.urgency === "urgent"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : project.stageInfo.urgency === "action_needed"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : project.stageInfo.urgency === "in_transit"
              ? "bg-sky-50 border-sky-200 text-sky-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="font-semibold flex items-center gap-1">
            <span>
              {project.stageInfo.bottleneckParty === "buyer"
                ? "👤"
                : project.stageInfo.bottleneckParty === "factory"
                ? "🏭"
                : project.stageInfo.bottleneckParty === "logistics"
                ? "📦"
                : project.stageInfo.bottleneckParty === "subcontractor"
                ? "🔬"
                : "⚡"}
            </span>
            <span className="truncate">{project.stageInfo.bottleneckLabel}</span>
          </div>
          <div className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">
            {project.stageInfo.actionMessage}
          </div>
        </div>
      </div>

      {/* Footer: Commission & Action */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
        <div className="text-emerald-700 font-semibold" title="Estimated Brokerage Fee">
          +€{project.stageInfo.estimatedCommissionEur.toLocaleString()}
        </div>
        <Link
          href={`/admin/requests/${project.id}`}
          className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}
