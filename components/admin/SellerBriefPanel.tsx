"use client";

import { useState } from "react";

export interface SellerBriefPanelProps {
  requestId: string;
  initialBrief: string;
  productName: string;
  category: string | null;
  benchmarkBrand: string | null;
  packagingPreference: string | null;
  certifications: string[];
  privateLabel: boolean | null;
  createdAt: string | null;
  imageUrls?: string[];
}

const AI_PRESETS = [
  {
    label: "✨ Warmer & More Appealing",
    instruction:
      "Rewrite this brief in an even warmer, more welcoming, and commercially appealing tone for food manufacturers and wholesale sourcing agents while keeping all product specs accurate.",
  },
  {
    label: "📦 Emphasize Packaging & Hardware",
    instruction:
      "Emphasize the exact packaging format, container material, unit weight, and any dispensing hardware (such as catering pumps, squeeze caps, or sachets) in a clear structured layout.",
  },
  {
    label: "🏷️ Highlight Private Label & Compliance",
    instruction:
      "Clearly highlight the Private Label / branding requirements, Kosher certification level, and dietary or functional claims (Gluten-Free, Organic, Sugar-Free, Diabetic-friendly, Protein-enriched).",
  },
  {
    label: "⚡ Shorten for Outreach",
    instruction:
      "Make this brief concise, punchy, and easy to scan in 6–8 lines so a sales director or sourcing agent can read it in 15 seconds on WhatsApp or email.",
  },
  {
    label: "🔄 Regenerate from Request",
    instruction:
      "Regenerate a complete, well-structured Wholesale / Seller Agent Sourcing Brief from the request details with an engaging opening, clear bulleted product & packaging specs, and a warm call to action.",
  },
];

export default function SellerBriefPanel({
  requestId,
  initialBrief,
  productName,
  category,
  benchmarkBrand,
  packagingPreference,
  certifications,
  privateLabel,
  createdAt,
  imageUrls = [],
}: SellerBriefPanelProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [draftText, setDraftText] = useState(initialBrief);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiBar, setShowAiBar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSaveManual() {
    if (!draftText.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerBrief: draftText }),
      });
      const data = (await res.json()) as { ok: boolean; sellerBrief?: string; error?: string };
      if (!data.ok) {
        setErrorMsg(data.error ?? "Failed to save brief");
        return;
      }
      setBrief(data.sellerBrief ?? draftText);
      setIsEditingManual(false);
      setStatusMsg("Saved ✓");
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      setErrorMsg("Network error while saving brief");
    } finally {
      setSaving(false);
    }
  }

  async function handleAiEdit(instructionText: string) {
    if (!instructionText.trim()) return;
    setAiLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instructionText,
          currentBrief: isEditingManual ? draftText : brief,
        }),
      });
      const data = (await res.json()) as { ok: boolean; sellerBrief?: string; error?: string };
      if (!data.ok || !data.sellerBrief) {
        setErrorMsg(data.error ?? "AI edit failed");
        return;
      }
      setBrief(data.sellerBrief);
      setDraftText(data.sellerBrief);
      setAiPrompt("");
      setStatusMsg("Updated with AI ✨");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setErrorMsg("Network error during AI edit");
    } finally {
      setAiLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrintPdf() {
    const activeBrief = isEditingManual ? draftText : brief;
    const printWin = window.open("", "_blank", "width=900,height=1050");
    if (!printWin) {
      window.print();
      return;
    }

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const formattedDate = createdAt
      ? new Date(createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

    const brandingLabel =
      privateLabel === true
        ? "Private Label (Buyer's Brand)"
        : privateLabel === false
          ? "Branded (Supplier's Brand)"
          : "Private Label or Supplier Brand";

    const refCode = `FDX-${requestId.slice(0, 8).toUpperCase()}`;

    const photosHtml =
      imageUrls.length > 0
        ? `
        <div class="section">
          <div class="section-title">Benchmark Reference Photos</div>
          <div class="photos">
            ${imageUrls
              .slice(0, 3)
              .map(
                (url, i) => `
              <div class="photo-card">
                <img src="${escapeHtml(url)}" alt="Benchmark ${i + 1}" />
                <div class="photo-caption">Reference Photo #${i + 1}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>`
        : "";

    printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Wholesale Sourcing Brief — ${escapeHtml(productName || refCode)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.55;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #ea580c;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .brand span { color: #ea580c; }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-top: 3px;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .meta strong { color: #0f172a; }
    .hero-box {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .hero-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #c2410c;
      margin-bottom: 4px;
    }
    .hero-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #fdba74;
      color: #9a3412;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .spec-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      background: #f8fafc;
    }
    .spec-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .spec-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #ea580c;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }
    .brief-box {
      border: 1px solid #cbd5e1;
      border-left: 4px solid #ea580c;
      border-radius: 8px;
      padding: 18px 20px;
      background: #ffffff;
      font-size: 14px;
      color: #1e293b;
      white-space: pre-wrap;
      line-height: 1.65;
    }
    .photos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .photo-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .photo-card img {
      max-width: 100%;
      height: 130px;
      object-fit: contain;
      border-radius: 4px;
    }
    .photo-caption {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Food<span>X</span>change</div>
      <div class="brand-sub">Wholesale &amp; Agent Sourcing Brief · Israeli Import Desk</div>
    </div>
    <div class="meta">
      <div><strong>Ref:</strong> ${escapeHtml(refCode)}</div>
      <div><strong>Date:</strong> ${escapeHtml(formattedDate)}</div>
      <div><strong>Destination Market:</strong> Israel</div>
    </div>
  </div>

  <div class="hero-box">
    <div class="hero-label">Sourcing Mandate</div>
    <h1 class="hero-title">${escapeHtml(productName || "Food & Beverage Sourcing Request")}</h1>
    <div class="badges">
      ${category ? `<span class="badge">Category: ${escapeHtml(category)}</span>` : ""}
      ${benchmarkBrand ? `<span class="badge">Benchmark Reference: ${escapeHtml(benchmarkBrand)}</span>` : ""}
      <span class="badge">${escapeHtml(brandingLabel)}</span>
    </div>
  </div>

  <div class="specs-grid">
    <div class="spec-item">
      <div class="spec-label">Target Benchmark Brand</div>
      <div class="spec-value">${escapeHtml(benchmarkBrand || "Open / Equivalent Market Leader")}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Branding Mode</div>
      <div class="spec-value">${escapeHtml(brandingLabel)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Packaging &amp; Hardware Format</div>
      <div class="spec-value">${escapeHtml(packagingPreference || "Standard Retail / Foodservice Format")}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Certifications &amp; Dietary Compliance</div>
      <div class="spec-value">${escapeHtml(certifications.length > 0 ? certifications.join(", ") : "Standard Export Quality (BRC / IFS / Kosher)")}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Wholesale / Seller Agent Sourcing Brief</div>
    <div class="brief-box">${escapeHtml(activeBrief)}</div>
  </div>

  ${photosHtml}

  <div class="footer">
    <div>Prepared by FoodXchange Sourcing Intelligence · www.fdx.trading</div>
    <div>To submit product specs, packaging formats &amp; FOB/CIF quotes, reply with Ref ${escapeHtml(refCode)}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50/70 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
              🤝 Wholesale / Seller Agent Sourcing Brief
            </span>
            {statusMsg && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                {statusMsg}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Admin-only brief attached to this request — edit with AI or manually, and print/export as PDF for suppliers & agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAiBar((v) => !v)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              showAiBar
                ? "border-orange-500 bg-orange-600 text-white"
                : "border-orange-300 bg-white text-orange-700 hover:bg-orange-50"
            }`}
          >
            ✨ Edit with AI
          </button>

          <button
            type="button"
            onClick={() => {
              if (isEditingManual) {
                setIsEditingManual(false);
                setDraftText(brief);
              } else {
                setDraftText(brief);
                setIsEditingManual(true);
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {isEditingManual ? "Cancel Edit" : "✏️ Edit Text"}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-sm"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* AI Edit Toolbar */}
      {showAiBar && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-900">
              ✨ AI Brief Refiner (Gemini 3.5 Flash)
            </span>
            {aiLoading && (
              <span className="text-xs font-medium text-orange-700 animate-pulse">
                AI is rewriting the brief...
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {AI_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={aiLoading}
                onClick={() => void handleAiEdit(preset.instruction)}
                className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 transition disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && aiPrompt.trim()) {
                  e.preventDefault();
                  void handleAiEdit(aiPrompt);
                }
              }}
              placeholder="Or type custom AI instruction (e.g. 'Add 5kg catering tub with Burger King pump & Kosher Parve')..."
              className="flex-1 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={aiLoading || !aiPrompt.trim()}
              onClick={() => void handleAiEdit(aiPrompt)}
              className="rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition disabled:opacity-40"
            >
              {aiLoading ? "Applying..." : "Apply AI"}
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-xs font-medium text-red-600">{errorMsg}</p>
      )}

      {/* Brief Content or Manual Editor */}
      <div className="mt-3">
        {isEditingManual ? (
          <div className="space-y-2.5">
            <textarea
              rows={8}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full rounded-xl border border-orange-300 bg-white p-3 text-sm text-gray-800 leading-relaxed focus:border-orange-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingManual(false);
                  setDraftText(brief);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveManual()}
                className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Brief"}
              </button>
            </div>
          </div>
        ) : brief ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed bg-white/80 rounded-xl border border-orange-100 p-3.5">
            {brief}
          </pre>
        ) : (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white/60 p-4 text-center">
            <p className="text-xs text-gray-500 mb-2">
              No Wholesale / Seller Agent Sourcing Brief generated yet for this request.
            </p>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                void handleAiEdit(
                  "Generate a warm, appealing, and structured Wholesale / Seller Agent Sourcing Brief from this request."
                )
              }
              className="rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {aiLoading ? "✨ Generating..." : "✨ Generate Brief with AI"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
