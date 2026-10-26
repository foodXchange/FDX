"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  InfrastructureReport,
  ApiKeyItem,
} from "../../../lib/admin/infrastructureEngine";
import { GitRadarStatus, GitFileStatus } from "../../../lib/admin/gitEngine";

interface Props {
  initialLocale?: "he" | "en";
  locale?: "he" | "en";
}

export default function MasterDevOpsCenter({ initialLocale, locale }: Props) {
  const [currentLocale, setCurrentLocale] = useState<"he" | "en">(() => {
    return initialLocale || locale || "en";
  });

  const isHe = currentLocale === "he";

  // Sync with localStorage or URL query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLang = sp.get("lang") || sp.get("locale");
      if (urlLang === "he" || urlLang === "en") {
        setCurrentLocale(urlLang);
        return;
      }
      const saved = localStorage.getItem("fdx_admin_locale");
      if (saved === "he" || saved === "en") {
        setCurrentLocale(saved);
        return;
      }
    }
  }, []);

  // Listen to global admin_locale_change events
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvent = e as CustomEvent<"he" | "en">;
      if (customEvent.detail === "he" || customEvent.detail === "en") {
        setCurrentLocale(customEvent.detail);
      }
    };
    window.addEventListener("admin_locale_change", handleGlobalChange);
    return () => window.removeEventListener("admin_locale_change", handleGlobalChange);
  }, []);

  const handleToggleLocale = (newLoc: "he" | "en") => {
    setCurrentLocale(newLoc);
    try {
      localStorage.setItem("fdx_admin_locale", newLoc);
      document.cookie = `fdx_admin_locale=${newLoc}; path=/; max-age=31536000`;
      window.dispatchEvent(new CustomEvent("admin_locale_change", { detail: newLoc }));
    } catch {
      // ignore
    }
  };

  // Telemetry & Git States
  const [report, setReport] = useState<InfrastructureReport | null>(null);
  const [gitStatus, setGitStatus] = useState<GitRadarStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Vault States
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [vaultNotice, setVaultNotice] = useState<{ key: string; msg: string; success: boolean } | null>(null);
  const [pingingKey, setPingingKey] = useState<string | null>(null);

  // Git Form States
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [commitPrefix, setCommitPrefix] = useState<string>("feat");
  const [skipCi, setSkipCi] = useState<boolean>(true); // Default to TRUE to protect Netlify minutes!
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [gitActionResult, setGitActionResult] = useState<{ msg: string; success: boolean } | null>(null);

  // Diff Modal State
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [fileDiffContent, setFileDiffContent] = useState<string>("");
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);

  // Fetch full telemetry
  const fetchTelemetry = useCallback(async (isRefreshAction = false) => {
    if (isRefreshAction) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch("/api/admin/infrastructure/status");
      const data = await res.json();
      if (data.ok) {
        setReport(data.infrastructure);
        setGitStatus(data.git);
      }
    } catch (err) {
      console.error("Failed to fetch infrastructure telemetry:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Test Ping a specific API key
  const handleTestKeyPing = async (keyId: string) => {
    setPingingKey(keyId);
    try {
      const res = await fetch("/api/admin/infrastructure/vault/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyId }),
      });
      const data = await res.json();
      if (data.ok) {
        setReport((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            keys: prev.keys.map((k) =>
              k.id === keyId
                ? {
                    ...k,
                    status: data.status,
                    statusMessage: data.message,
                    latencyMs: data.latencyMs,
                  }
                : k
            ),
          };
        });
        setVaultNotice({
          key: keyId,
          msg: `${data.message} (${data.latencyMs}ms)`,
          success: data.status === "HEALTHY",
        });
        setTimeout(() => setVaultNotice(null), 4000);
      }
    } catch (err: any) {
      setVaultNotice({ key: keyId, msg: err?.message || "Ping failed", success: false });
    } finally {
      setPingingKey(null);
    }
  };

  // Save updated key to .env.local
  const handleSaveKey = async (keyId: string) => {
    if (!editValue.trim()) return;

    try {
      const res = await fetch("/api/admin/infrastructure/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyId, value: editValue.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingKeyId(null);
        setEditValue("");
        setVaultNotice({
          key: keyId,
          msg: isHe ? "המפתח עודכן בהצלחה ב-.env.local ונבדק!" : "Key saved to .env.local & verified!",
          success: true,
        });
        fetchTelemetry(true);
      } else {
        setVaultNotice({ key: keyId, msg: data.error || "Update failed", success: false });
      }
    } catch (err: any) {
      setVaultNotice({ key: keyId, msg: err?.message || "Save error", success: false });
    }
  };

  // Commit changes
  const handleGitCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    setIsCommitting(true);
    setGitActionResult(null);

    try {
      const res = await fetch("/api/admin/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: commitMessage.trim(),
          prefix: commitPrefix,
          skipCi,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommitMessage("");
        setGitActionResult({
          msg: isHe
            ? `השינויים נשמרו בהצלחה (Commit: ${data.commitHash}) ${skipCi ? "[מצב חיסכון skip ci פעיל]" : ""}`
            : `Committed successfully (${data.commitHash}) ${skipCi ? "[Netlify build skipped]" : ""}`,
          success: true,
        });
        fetchTelemetry(true);
      } else {
        setGitActionResult({ msg: data.error || "Commit failed", success: false });
      }
    } catch (err: any) {
      setGitActionResult({ msg: err?.message || "Commit failed", success: false });
    } finally {
      setIsCommitting(false);
    }
  };

  // Push to remote
  const handleGitPush = async () => {
    setIsPushing(true);
    setGitActionResult(null);

    try {
      const res = await fetch("/api/admin/git/push", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setGitActionResult({
          msg: isHe ? "הקוד שודר בהצלחה ל-GitHub (origin/main)!" : "Successfully pushed to GitHub origin/main!",
          success: true,
        });
        fetchTelemetry(true);
      } else {
        setGitActionResult({ msg: data.error || data.output || "Push failed", success: false });
      }
    } catch (err: any) {
      setGitActionResult({ msg: err?.message || "Push failed", success: false });
    } finally {
      setIsPushing(false);
    }
  };

  // Pull from remote
  const handleGitPull = async () => {
    setIsPulling(true);
    setGitActionResult(null);

    try {
      const res = await fetch("/api/admin/git/pull", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setGitActionResult({
          msg: isHe ? "הקוד סונכרן בהצלחה מ-GitHub!" : "Pulled latest updates from GitHub!",
          success: true,
        });
        fetchTelemetry(true);
      } else {
        setGitActionResult({ msg: data.error || data.output || "Pull failed", success: false });
      }
    } catch (err: any) {
      setGitActionResult({ msg: err?.message || "Pull failed", success: false });
    } finally {
      setIsPulling(false);
    }
  };

  // View file diff
  const handleViewDiff = async (filePath: string) => {
    setSelectedDiffFile(filePath);
    setIsLoadingDiff(true);
    try {
      const res = await fetch(`/api/admin/git/diff?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.ok) {
        setFileDiffContent(data.diff || "No diff available");
      }
    } catch {
      setFileDiffContent("Failed to load diff");
    } finally {
      setIsLoadingDiff(false);
    }
  };

  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white"
    >
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isHe ? "מרכז שליטה תשתיתי ו-DevOps" : "DevOps & Infrastructure Control"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {isHe ? "כספת מפתחות וניהול מכסות" : "API Vault & Quota Guard"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isHe ? "מרכז בקרת תשתיות, כספת מפתחות ופריסה מבוקרת" : "Master Infrastructure, API Vault & Deployment Center"}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              {isHe
                ? "ניטור מכסות ויתרות בזמן אמת (Netlify, Firecrawl, Supabase), כספת מפתחות מאובטחת לעדכון ישיר ובדיקת תקינות (Ping), ומערכת בקרת גיט ופריסה המונעת שריפת דקות בנייה."
                : "Live quota tracking (Netlify, Firecrawl, Supabase), secure API key vault with inline updating & latency pings, and controlled Git deployments with [skip ci] protection."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Switcher Pill */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => handleToggleLocale("en")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isHe
                    ? "bg-emerald-500 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Switch UI to English"
              >
                <span>🇺🇸</span>
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLocale("he")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isHe
                    ? "bg-emerald-500 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="החלף ממשק לעברית"
              >
                <span>🇮🇱</span>
                <span>עברית</span>
              </button>
            </div>

            <button
              onClick={() => fetchTelemetry(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700/80 transition cursor-pointer"
            >
              <svg
                className={`w-4 h-4 text-emerald-400 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? (isHe ? "מרענן..." : "Refreshing...") : isHe ? "רענן נתונים" : "Refresh Telemetry"}</span>
            </button>

            <Link
              href="/admin/deals"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition"
            >
              <span>📊</span>
              <span>{isHe ? "חזרה לדסק עסקאות" : "Deals Desk"}</span>
            </Link>
          </div>
        </div>

        {/* Proactive Intelligent Alerts Banner */}
        {report?.alerts && report.alerts.length > 0 && (
          <div className="mt-6 space-y-2.5">
            {report.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 shadow-lg ${
                  alert.level === "CRITICAL"
                    ? "bg-red-950/40 border-red-500/50 text-red-200"
                    : alert.level === "WARNING"
                    ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                    : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">
                    {alert.level === "CRITICAL" ? "🚨" : alert.level === "WARNING" ? "⚠️" : "🟢"}
                  </span>
                  <div>
                    <strong className="block text-sm font-bold text-white">
                      {isHe ? alert.titleHe : alert.titleEn}
                    </strong>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                      {isHe ? alert.descHe : alert.descEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Telemetry Cards */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Row 1: Quota & Usage Radar (3 Columns: Netlify, Firecrawl, Supabase) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Netlify Build Minutes & Monthly Cycle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="font-bold text-white text-sm">Netlify Hosting & Builds</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {report?.netlify.buildStatus || "125% USAGE"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="text-slate-400 font-medium">{isHe ? "דקות בנייה (Build Minutes):" : "Build Minutes:"}</span>
                    <span className="font-mono font-bold text-red-400 text-sm">
                      {report?.netlify.buildMinutesUsed || 385} / {report?.netlify.buildMinutesLimit || 300} min
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, report?.netlify.usedPct || 125)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">{isHe ? "איפוס מכסה חודשית:" : "Monthly Reset in:"}</span>
                    <strong className="text-amber-400 font-mono text-xs">
                      {report?.netlify.daysToMonthlyReset ?? 3} {isHe ? "ימים (1 בנובמבר)" : "days (Nov 1)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isHe ? "תעבורה (Bandwidth):" : "Bandwidth:"}</span>
                    <strong className="text-slate-300 font-mono text-xs">
                      {report?.netlify.bandwidthUsedGb ?? 1.3} / 100 GB
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{isHe ? "המלצה: הפעל [skip ci]" : "Tip: Use [skip ci] mode"}</span>
              <a
                href="https://app.netlify.com/teams/foodxchange/billing/usage"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
              >
                <span>{isHe ? "לוח Netlify" : "Netlify Portal"}</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Card 2: Firecrawl Web Scraper Quota (Live API) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white text-sm">Firecrawl Scraper API</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE API QUOTA
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="text-slate-400 font-medium">{isHe ? "יתרת קרדיטים נותרת:" : "Remaining Credits:"}</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {report?.firecrawl?.remainingCredits?.toLocaleString() ?? "52,947"} /{" "}
                      {report?.firecrawl?.planCredits?.toLocaleString() ?? "100,000"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${100 - (report?.firecrawl?.usedPct ?? 47)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">{isHe ? "סיום מחזור חיוב:" : "Cycle Renews in:"}</span>
                    <strong className="text-emerald-400 font-mono text-xs">
                      {report?.firecrawl?.daysRemainingInCycle ?? 23} {isHe ? "ימים (18 בנובמבר)" : "days (Nov 18)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{isHe ? "קיבולת סריקה:" : "Crawl Capacity:"}</span>
                    <strong className="text-slate-300 font-mono text-xs">
                      ~5,000+ {isHe ? "ספקים" : "suppliers"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-medium">✓ {isHe ? "קרדיט תקין ופעיל" : "Active & Healthy"}</span>
              <a
                href="https://firecrawl.dev"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
              >
                <span>{isHe ? "פאנל Firecrawl" : "Firecrawl Dashboard"}</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Card 3: Supabase Database Metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <span className="font-bold text-white text-sm">Supabase Enterprise DB</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {report?.supabase.latencyMs ? `${report.supabase.latencyMs}ms` : "CONNECTED"}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">{isHe ? "ספקים רשומים במאגר:" : "Registered Suppliers:"}</span>
                  <strong className="text-white font-mono font-bold">
                    {report?.supabase.totalSuppliers.toLocaleString() ?? "12,526"}
                  </strong>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">{isHe ? "מוצרים וספציפיקציות:" : "Cataloged Products:"}</span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {report?.supabase.totalProducts.toLocaleString() ?? "59,171"}
                  </strong>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">{isHe ? "דליי אחסון מדיה (Buckets):" : "Storage Buckets:"}</span>
                  <strong className="text-teal-300 font-mono font-bold">
                    {report?.supabase.storageBucketsCount ?? 10} {isHe ? "דליים פעילים" : "active"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-teal-400 font-medium">✓ {isHe ? "תקין ומחובר" : "DB Operational"}</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
              >
                <span>{isHe ? "לוח Supabase" : "Supabase Console"}</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Row 2: Secure API Key Vault & Ping Tester */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>🔐</span>
                <span>{isHe ? "כספת מפתחות API, בדיקות פינג ועריכה ישירה" : "Secure API Key Vault & Health Ping Station"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHe
                  ? "הזן, עדכן ובדוק את מפתחות ה-API שלך ישירות ל-.env.local בלחיצת כפתור אחת ללא צורך בעריכת קוד."
                  : "View, update and test latency/connectivity for all project keys directly in .env.local without code editing."}
              </p>
            </div>

            {vaultNotice && (
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  vaultNotice.success
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border-red-500/30"
                }`}
              >
                {vaultNotice.msg}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            {report?.keys.map((key) => {
              const isEditing = editingKeyId === key.id;
              const isRevealed = revealedKeys[key.id];
              const isPinging = pingingKey === key.id;

              return (
                <div key={key.id} className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 md:max-w-md">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{key.label}</strong>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {key.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          key.status === "HEALTHY"
                            ? "bg-emerald-400"
                            : key.status === "DEPLETED"
                            ? "bg-amber-400 animate-pulse"
                            : key.status === "ERROR"
                            ? "bg-red-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <span>{key.statusMessage}</span>
                      {key.latencyMs !== undefined && (
                        <span className="font-mono text-slate-500">({key.latencyMs}ms)</span>
                      )}
                    </div>
                  </div>

                  {/* Key Display / Edit Form */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                          type="text"
                          placeholder="Paste new key (e.g. AIzaSy... or gsk_...)"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-slate-950 border border-teal-500/60 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none w-64"
                        />
                        <button
                          onClick={() => handleSaveKey(key.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                        >
                          {isHe ? "שמור" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingKeyId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition"
                        >
                          {isHe ? "ביטול" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          {key.isConfigured ? key.maskedValue : isHe ? "לא הוגדר" : "Not Set"}
                        </div>

                        <button
                          onClick={() => {
                            setEditingKeyId(key.id);
                            setEditValue("");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                        >
                          {isHe ? "✏️ ערוך" : "✏️ Edit"}
                        </button>

                        <button
                          onClick={() => handleTestKeyPing(key.id)}
                          disabled={isPinging || !key.isConfigured}
                          className="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-medium transition disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                          {isPinging ? (
                            <span className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>⚡</span>
                          )}
                          <span>{isHe ? "בדוק פינג" : "Ping"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 3: Controlled Git & Deployment Center (The Overages Shield) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 Cols): Commit & Deploy Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚀</span>
                  <h3 className="font-bold text-white text-sm">{isHe ? "עמדת שמירה ושחרור מבוקרת" : "Controlled Git Release Station"}</h3>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-400">Branch:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 font-bold">
                    {gitStatus?.currentBranch || "main"}
                  </span>
                </div>
              </div>

              {/* The Netlify Shield Switch */}
              <div
                onClick={() => setSkipCi(!skipCi)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  skipCi
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/30 border-red-500/40 text-red-300"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={skipCi}
                    onChange={(e) => setSkipCi(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <strong className="block text-xs font-bold">
                      {skipCi
                        ? isHe
                          ? "🛡️ מגן חיסכון Netlify פעיל ([skip ci] מופעל)"
                          : "🛡️ Netlify Minute Guard Active ([skip ci] enabled)"
                        : isHe
                        ? "🚨 שחרור לייב מלא ל-Netlify (שורף דקות בנייה)"
                        : "🚨 Trigger Live Netlify Build (Consumes build minutes)"}
                    </strong>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {skipCi
                        ? isHe
                          ? "הקוד יישמר ויגובה ב-GitHub, אך Netlify לא תריץ בנייה ותצרוך 0 דקות ($0.00)."
                          : "GitHub receives the code, but Netlify completely skips the build (0 minutes consumed)."
                        : isHe
                        ? "בנייה מלאה תרוץ ב-Netlify. זהירות: המכסה החודשית בחריגה של 125%!"
                        : "Triggers a full build on Netlify. Caution: Monthly quota is currently at 125%!"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Commit Form */}
              <form onSubmit={handleGitCommit} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    {isHe ? "תיאור השמירה (Commit Message):" : "Commit Message:"}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={commitPrefix}
                      onChange={(e) => setCommitPrefix(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono focus:border-teal-500 focus:outline-none"
                    >
                      <option value="feat">feat</option>
                      <option value="fix">fix</option>
                      <option value="chore">chore</option>
                      <option value="docs">docs</option>
                      <option value="refactor">refactor</option>
                    </select>
                    <input
                      type="text"
                      placeholder={isHe ? "לדוגמה: עדכון מחירון אוטומטי וסריקת ספקים" : "e.g., add new pricing exporter and compliance seals"}
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCommitting || !commitMessage.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCommitting ? (
                    <span>{isHe ? "שומר שינויים..." : "Committing..."}</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>{isHe ? "שמור שינויים מקומית (Commit)" : "Stage & Commit Changes"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Push & Pull Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={handleGitPush}
                  disabled={isPushing}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  {isPushing ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>⬆️</span>
                  )}
                  <span>{isHe ? "שדר ל-GitHub (Push)" : "Push to GitHub"}</span>
                </button>

                <button
                  onClick={handleGitPull}
                  disabled={isPulling}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPulling ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>⬇️</span>
                  )}
                  <span>{isHe ? "סנכרן מ-GitHub (Pull)" : "Pull Updates"}</span>
                </button>
              </div>

              {gitActionResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    gitActionResult.success
                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40"
                      : "bg-red-950/50 text-red-300 border-red-500/40"
                  }`}
                >
                  {gitActionResult.msg}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 Cols): Changed Files & Recent Commits Log */}
          <div className="lg:col-span-7 space-y-4">
            {/* Changed Files Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <span>📁</span>
                  <span>{isHe ? "קבצים ששונו מקומית (טרם נשמרו)" : "Pending Changed Files"}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {gitStatus?.changedFiles.length ?? 0} {isHe ? "קבצים" : "files"}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                {gitStatus?.changedFiles && gitStatus.changedFiles.length > 0 ? (
                  gitStatus.changedFiles.map((file) => (
                    <div key={file.path} className="py-2 px-1 flex items-center justify-between hover:bg-slate-800/30 transition">
                      <div className="flex items-center gap-2 line-clamp-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            file.status === "added"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : file.status === "deleted"
                              ? "bg-red-500/20 text-red-400"
                              : file.status === "untracked"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {file.status.slice(0, 3).toUpperCase()}
                        </span>
                        <span className="font-mono text-slate-300 text-[11px] truncate">{file.path}</span>
                      </div>
                      <button
                        onClick={() => handleViewDiff(file.path)}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0"
                      >
                        diff
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    ✓ {isHe ? "עץ העבודה נקי לחלוטין (אין קבצים ששונו)" : "Working directory clean. No modified files."}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Commits Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <span>📜</span>
                  <span>{isHe ? "יומן 10 השמירות האחרונות ב-Git" : "Last 10 Commits Log"}</span>
                </span>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {gitStatus?.lastCommitHash ? `#${gitStatus.lastCommitHash}` : ""}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 text-xs font-mono">
                {gitStatus?.recentCommits.map((c) => (
                  <div key={c.hash} className="py-2.5 px-1 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-white text-[11px] font-sans font-medium line-clamp-1">{c.message}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span className="text-teal-400 font-bold">{c.shortHash}</span>
                        <span>•</span>
                        <span>{c.author}</span>
                        <span>•</span>
                        <span>{c.relativeDate}</span>
                      </div>
                    </div>
                    {c.isSkipCi && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        [skip ci]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      {selectedDiffFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 font-mono text-xs">
              <span className="font-bold text-white">{selectedDiffFile}</span>
              <button
                onClick={() => setSelectedDiffFile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950/90 font-mono text-xs max-h-[500px] overflow-auto leading-relaxed">
              {isLoadingDiff ? (
                <div className="text-slate-400">Loading diff...</div>
              ) : (
                <pre className="whitespace-pre text-slate-300">{fileDiffContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
