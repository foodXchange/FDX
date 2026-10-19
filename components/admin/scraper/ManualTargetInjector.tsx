"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualTargetInjector() {
  const router = useRouter();
  const [target, setTarget] = useState<"supplier" | "buyer">("supplier");
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single mode state
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");

  // Bulk mode state
  const [bulkText, setBulkText] = useState("");
  const [bulkCountry, setBulkCountry] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function cleanUrl(u: string): string {
    const trimmed = u.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formattedUrl = cleanUrl(website);
    if (!companyName.trim()) {
      setErrorMsg("Company name is required.");
      return;
    }
    if (!formattedUrl) {
      setErrorMsg("A valid website URL is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/scraper/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          companyName: companyName.trim(),
          website: formattedUrl,
          country: country.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create record");
      }

      setSuccessMsg(
        `✓ Successfully queued ${data.record.company_name} (${data.record.website}) as pending ${target}!`
      );
      setCompanyName("");
      setWebsite("");
      setNotes("");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const rawLines = bulkText
      .split(/[\r\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const validUrls: string[] = [];
    for (const line of rawLines) {
      const cleaned = cleanUrl(line);
      try {
        new URL(cleaned);
        validUrls.push(cleaned);
      } catch {}
    }

    if (validUrls.length === 0) {
      setErrorMsg("Please enter at least one valid URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/scraper/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          urls: validUrls,
          defaultCountry: bulkCountry.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to queue bulk URLs");
      }

      setSuccessMsg(
        `✓ Successfully injected ${data.insertedCount} new ${target}(s) for scraping! (${data.skippedCount} duplicates skipped)`
      );
      setBulkText("");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const detectedBulkCount = bulkText
    .split(/[\r\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header & Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Manual Scraping Injection
          </h3>
          <p className="text-xs text-slate-500">
            Quickly add any company website to scrape without preparing a spreadsheet.
          </p>
        </div>

        {/* Target Entity Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTarget("supplier")}
            className={`px-2.5 py-1 rounded transition ${
              target === "supplier"
                ? "bg-white text-orange-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🏭 Supplier
          </button>
          <button
            type="button"
            onClick={() => setTarget("buyer")}
            className={`px-2.5 py-1 rounded transition ${
              target === "buyer"
                ? "bg-white text-blue-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🛒 Buyer Chain
          </button>
        </div>
      </div>

      {/* Sub Mode Selector */}
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
          <input
            type="radio"
            name="injector_mode"
            checked={mode === "single"}
            onChange={() => setMode("single")}
            className="text-orange-600"
          />
          Single Detailed Record
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
          <input
            type="radio"
            name="injector_mode"
            checked={mode === "bulk"}
            onChange={() => setMode("bulk")}
            className="text-orange-600"
          />
          Bulk URL Paste List
        </label>
      </div>

      {/* Form Area */}
      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={target === "supplier" ? "e.g. Barilla G. e R. Fratelli" : "e.g. Rami Levy / Shufersal"}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Website URL *
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Country of Origin
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Italy, Spain, Israel, Turkey"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sourcing Notes / Focus
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Private label pasta, BRC Kosher certified"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Queueing Target..." : `Queue ${target === "supplier" ? "Supplier" : "Buyer"} for Scraping →`}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Paste URLs (One per line)
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {detectedBulkCount} URLs detected
              </span>
            </div>
            <textarea
              rows={4}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"https://supplier-one.it\nhttps://supplier-two.es\nhttps://buyer-brand.co.il"}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Country (Applied if not specified)
            </label>
            <input
              type="text"
              value={bulkCountry}
              onChange={(e) => setBulkCountry(e.target.value)}
              placeholder="e.g. Italy or Israel"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || detectedBulkCount === 0}
            className="w-full py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Injecting URLs..." : `Inject & Queue ${detectedBulkCount} URLs for Scraping →`}
          </button>
        </form>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
