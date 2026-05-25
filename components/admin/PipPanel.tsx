"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PipV1 } from "@/lib/pip/buildPipV1";
import type { MergedAttr, PipV2DataJson, PipStatus } from "@/lib/pip/pipTypes";

// ── Shared types ─────────────────────────────────────────────────────────────

export type PipV2CardData = {
  id: string;
  product_family_key: string | null;
  data_json: PipV2DataJson;
  status: PipStatus;
};

interface Props {
  requestId: string;
  initialPip: Record<string, unknown> | null;
  initialV2Pips?: PipV2CardData[];
}

// ── v1 PIP helpers ────────────────────────────────────────────────────────────

type Mode = "display" | "edit" | "regenerating" | "saving";

function asPip(raw: Record<string, unknown> | null): PipV1 | null {
  if (!raw || raw.version !== "1.0") return null;
  return raw as unknown as PipV1;
}

function pipToEditState(pip: PipV1) {
  return {
    product_name: pip.product.name,
    raw_description: pip.product.raw_description,
    category_raw: pip.category.raw_text,
    formats: pip.specifications.formats.join(", "),
    packaging: pip.specifications.packaging ?? "",
    sizes: pip.specifications.sizes.join(", "),
    kosher_types: pip.compliance.kosher_types.join(", "),
    certifications: pip.compliance.certifications.join(", "),
    halal: pip.compliance.halal,
    organic: pip.compliance.organic,
    private_label: pip.commercial.private_label,
    volume: pip.commercial.volume ?? "",
    urgency: pip.commercial.urgency ?? "",
    target_market: pip.commercial.target_market ?? "",
    budget: pip.commercial.budget ?? "",
    must_have: pip.match_config.must_have.join(", "),
    nice_to_have: pip.match_config.nice_to_have.join(", "),
    dealbreakers: pip.match_config.dealbreakers.join(", "),
  };
}

function editStateToPip(s: ReturnType<typeof pipToEditState>, base: PipV1): PipV1 {
  return {
    ...base,
    product: { name: s.product_name, raw_description: s.raw_description },
    category: { ...base.category, raw_text: s.category_raw },
    specifications: {
      formats: s.formats.split(",").map((v) => v.trim()).filter(Boolean),
      packaging: s.packaging || null,
      sizes: s.sizes.split(",").map((v) => v.trim()).filter(Boolean),
    },
    compliance: {
      kosher_required: s.kosher_types.trim().length > 0,
      kosher_types: s.kosher_types.split(",").map((v) => v.trim()).filter(Boolean),
      certifications: s.certifications.split(",").map((v) => v.trim()).filter(Boolean),
      halal: s.halal,
      organic: s.organic,
    },
    commercial: {
      private_label: s.private_label,
      volume: s.volume || null,
      urgency: s.urgency || null,
      target_market: s.target_market || null,
      budget: s.budget || null,
    },
    match_config: {
      must_have: s.must_have.split(",").map((v) => v.trim()).filter(Boolean),
      nice_to_have: s.nice_to_have.split(",").map((v) => v.trim()).filter(Boolean),
      dealbreakers: s.dealbreakers.split(",").map((v) => v.trim()).filter(Boolean),
    },
  };
}

// ── v2 PIP helpers ────────────────────────────────────────────────────────────

function strVal(attr: MergedAttr | undefined | null): string {
  return typeof attr?.value === "string" ? attr.value : "";
}

function strVals(attrs: MergedAttr[] | undefined | null): string[] {
  return (attrs ?? [])
    .map((a) => (typeof a.value === "string" ? a.value : ""))
    .filter(Boolean);
}

function splitComma(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function prettyFamilyKey(key: string | null, fallback: string): string {
  if (!key) return fallback;
  const cleaned = key
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/::+/g, "::")
    .replace(/^::|::$/g, "")
    .replace(/::/g, " · ")
    .trim();
  return cleaned || fallback;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: "green" | "blue" | "orange" | "slate" }) {
  const cls = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }[color];
  return <span className={`text-xs border rounded-full px-2 py-0.5 ${cls}`}>{label}</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}

// ── v2 PIP card ───────────────────────────────────────────────────────────────

type V2Mode = "display" | "edit" | "saving" | "regrouping" | "matching";

type V2EditState = {
  product_name: string;
  category_raw: string;
  formats: string;
  sizes: string;
  kosher_required: boolean;
  kosher_types: string;
  must_have: string;
  nice_to_have: string;
};

function v2ToEdit(pip: PipV2CardData): V2EditState {
  const d = pip.data_json;
  return {
    product_name: strVal(d.product?.name),
    category_raw: strVal(d.category?.raw_text),
    formats: strVals(d.specifications?.formats).join(", "),
    sizes: strVals(d.specifications?.sizes).join(", "),
    kosher_required: Boolean(d.compliance?.kosher_required?.value),
    kosher_types: strVals(d.compliance?.kosher_types).join(", "),
    must_have: (d.match_config?.must_have ?? []).join(", "),
    nice_to_have: (d.match_config?.nice_to_have ?? []).join(", "),
  };
}

const STATUS_CLS: Record<string, string> = {
  needs_review: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  matched: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
};

function PipV2Card({
  pip,
  requestId,
  onRegroup,
  onUpdate,
}: {
  pip: PipV2CardData;
  requestId: string;
  onRegroup: (pips: PipV2CardData[]) => void;
  onUpdate: (pipId: string, dataJson: PipV2DataJson) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<V2Mode>("display");
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);
  const [editState, setEditState] = useState<V2EditState | null>(null);

  const d = pip.data_json;
  const productName = strVal(d.product?.name) || "—";
  const categoryName = strVal(d.category?.category_name) || strVal(d.category?.raw_text) || "—";
  const formats = strVals(d.specifications?.formats);
  const sizes = strVals(d.specifications?.sizes);
  const kosherRequired = Boolean(d.compliance?.kosher_required?.value);
  const kosherTypes = strVals(d.compliance?.kosher_types);
  const mustHave = d.match_config?.must_have ?? [];
  const familyLabel = prettyFamilyKey(pip.product_family_key, productName);
  const isBusy = mode !== "display" && mode !== "edit";

  async function regroup() {
    setMode("regrouping");
    setError(null);
    try {
      const res = await fetch("/api/pip/regroup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const data = await res.json() as { ok?: boolean; pips?: PipV2CardData[]; error?: string };
      setMode("display");
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Regroup failed");
      } else {
        onRegroup(data.pips ?? []);
        router.refresh();
      }
    } catch {
      setMode("display");
      setError("Network error");
    }
  }

  async function runMatching() {
    setMode("matching");
    setMatchMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/matching/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const data = await res.json() as { ok?: boolean; inserted?: number; topScore?: number; error?: string };
      setMode("display");
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Matching failed");
      } else {
        setMatchMsg(`${data.inserted ?? 0} suppliers found (top score ${data.topScore ?? 0})`);
        router.refresh();
      }
    } catch {
      setMode("display");
      setError("Network error");
    }
  }

  function startEdit() {
    setEditState(v2ToEdit(pip));
    setMode("edit");
  }

  function cancelEdit() {
    setEditState(null);
    setMode("display");
  }

  async function saveEdit() {
    if (!editState) return;
    setMode("saving");
    setError(null);
    try {
      const res = await fetch(`/api/pip/${pip.id}/patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: editState.product_name,
          category_raw: editState.category_raw,
          formats: splitComma(editState.formats),
          sizes: splitComma(editState.sizes),
          kosher_required: editState.kosher_required,
          kosher_types: splitComma(editState.kosher_types),
          must_have: splitComma(editState.must_have),
          nice_to_have: splitComma(editState.nice_to_have),
        }),
      });
      const data = await res.json() as { ok?: boolean; data_json?: PipV2DataJson; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed");
        setMode("edit");
      } else {
        onUpdate(pip.id, data.data_json!);
        setEditState(null);
        setMode("display");
      }
    } catch {
      setError("Network error");
      setMode("edit");
    }
  }

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400";
  const labelCls = "block text-xs text-gray-400 mb-0.5";

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-700 truncate">{familyLabel}</span>
          <span
            className={`text-xs border rounded-full px-1.5 py-0.5 font-medium shrink-0 ${
              STATUS_CLS[pip.status] ?? STATUS_CLS.draft
            }`}
          >
            {pip.status.replace("_", " ")}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0 ml-2">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}
          {matchMsg && (
            <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
              {matchMsg}
            </div>
          )}

          {mode === "regrouping" && (
            <p className="text-xs text-gray-400 py-2">Regrouping images…</p>
          )}

          {mode === "matching" && (
            <p className="text-xs text-gray-400 py-2">Finding suppliers…</p>
          )}

          {mode === "display" && (
            <>
              <div className="space-y-2">
                <Row label="Product" value={productName !== "—" ? productName : null} />
                <Row label="Category" value={categoryName !== "—" ? categoryName : null} />
                {formats.length > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Formats</span>
                    <div className="flex flex-wrap gap-1">
                      {formats.map((f) => <Chip key={f} label={f} color="slate" />)}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Sizes</span>
                    <div className="flex flex-wrap gap-1">
                      {sizes.map((s) => <Chip key={s} label={s} color="slate" />)}
                    </div>
                  </div>
                )}
                {kosherRequired && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Kosher</span>
                    <div className="flex flex-wrap gap-1">
                      {kosherTypes.length > 0
                        ? kosherTypes.map((k) => <Chip key={k} label={k} color="orange" />)
                        : <Chip label="Required" color="orange" />}
                    </div>
                  </div>
                )}
                {mustHave.length > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Must have</span>
                    <div className="flex flex-wrap gap-1">
                      {mustHave.map((t) => <Chip key={t} label={t} color="green" />)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={regroup}
                  disabled={isBusy}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Regroup
                </button>
                <button
                  onClick={startEdit}
                  disabled={isBusy}
                  className="text-xs px-2.5 py-1 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={runMatching}
                  disabled={isBusy}
                  className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  Find Suppliers
                </button>
              </div>
            </>
          )}

          {(mode === "edit" || mode === "saving") && editState && (
            <>
              <div className="space-y-2.5">
                {(
                  [
                    ["product_name", "Product name"],
                    ["category_raw", "Category"],
                    ["formats", "Formats (comma-separated)"],
                    ["sizes", "Sizes (comma-separated)"],
                    ["kosher_types", "Kosher types (comma-separated)"],
                    ["must_have", "Must have (comma-separated)"],
                    ["nice_to_have", "Nice to have (comma-separated)"],
                  ] as [keyof V2EditState, string][]
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={editState[field] as string}
                      onChange={(e) =>
                        setEditState((prev) => (prev ? { ...prev, [field]: e.target.value } : prev))
                      }
                      disabled={mode === "saving"}
                    />
                  </div>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editState.kosher_required}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, kosher_required: e.target.checked } : prev
                      )
                    }
                    disabled={mode === "saving"}
                    className="rounded"
                  />
                  Kosher required
                </label>
              </div>

              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={cancelEdit}
                  disabled={mode === "saving"}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={mode === "saving"}
                  className="text-xs px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
                >
                  {mode === "saving" ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main PipPanel export ──────────────────────────────────────────────────────

export default function PipPanel({ requestId, initialPip, initialV2Pips = [] }: Props) {
  const router = useRouter();
  const [v2Pips, setV2Pips] = useState<PipV2CardData[]>(initialV2Pips);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(initialPip);
  const [mode, setMode] = useState<Mode>("display");
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<ReturnType<typeof pipToEditState> | null>(null);

  const pip = asPip(raw);

  function handleV2Update(pipId: string, dataJson: PipV2DataJson) {
    setV2Pips((prev) => prev.map((p) => (p.id === pipId ? { ...p, data_json: dataJson } : p)));
  }

  async function regenerate() {
    setMode("regenerating");
    setError(null);
    try {
      const res = await fetch("/api/pip/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const data = await res.json() as { ok?: boolean; pip?: Record<string, unknown>; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Regeneration failed");
      } else {
        setRaw(data.pip ?? null);
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setMode("display");
  }

  function startEdit() {
    if (!pip) return;
    setEditState(pipToEditState(pip));
    setMode("edit");
  }

  function cancelEdit() {
    setEditState(null);
    setMode("display");
  }

  async function saveEdit() {
    if (!editState || !pip) return;
    setMode("saving");
    setError(null);
    const updated = editStateToPip(editState, pip);
    try {
      const res = await fetch("/api/pip/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, pip: updated }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed");
        setMode("edit");
      } else {
        setRaw(updated as unknown as Record<string, unknown>);
        setEditState(null);
        setMode("display");
      }
    } catch {
      setError("Network error");
      setMode("edit");
    }
  }

  const sHdr = "text-xs font-semibold text-gray-500 uppercase tracking-wide";
  const inputCls =
    "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400";
  const labelCls = "block text-xs text-gray-400 mb-0.5";

  return (
    <section className="space-y-4">
      {/* ── v2 PIP cards ── */}
      {v2Pips.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className={sHdr}>Image PIPs</h3>
            <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-1.5 py-0.5 font-semibold">
              v2 · {v2Pips.length}
            </span>
          </div>
          <div className="space-y-2">
            {v2Pips.map((p) => (
              <PipV2Card
                key={p.id}
                pip={p}
                requestId={requestId}
                onRegroup={setV2Pips}
                onUpdate={handleV2Update}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── v1 PIP section ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className={sHdr}>Text PIP</h3>
            {pip && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5 font-semibold">
                v1.0
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {mode === "display" && (
              <>
                <button
                  onClick={regenerate}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Regenerate
                </button>
                {pip && (
                  <button
                    onClick={startEdit}
                    className="text-xs px-2.5 py-1 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
            {mode === "regenerating" && (
              <span className="text-xs text-gray-400">Regenerating…</span>
            )}
            {(mode === "edit" || mode === "saving") && (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={mode === "saving"}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={mode === "saving"}
                  className="text-xs px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
                >
                  {mode === "saving" ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {error}
          </div>
        )}

        {!pip && mode !== "regenerating" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">No text PIP yet</p>
            <button
              onClick={regenerate}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              Generate PIP
            </button>
          </div>
        )}

        {pip && mode === "display" && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <Row label="Product" value={pip.product.name || null} />
            <Row
              label="Category"
              value={(pip.category.category_name ?? pip.category.raw_text) || null}
            />
            {pip.specifications.formats.length > 0 && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Formats</span>
                <div className="flex flex-wrap gap-1">
                  {pip.specifications.formats.map((f) => <Chip key={f} label={f} color="slate" />)}
                </div>
              </div>
            )}
            <Row label="Packaging" value={pip.specifications.packaging} />
            {pip.compliance.kosher_required && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Kosher</span>
                <div className="flex flex-wrap gap-1">
                  {pip.compliance.kosher_types.length > 0 ? (
                    pip.compliance.kosher_types.map((k) => <Chip key={k} label={k} color="orange" />)
                  ) : (
                    <Chip label="Required" color="orange" />
                  )}
                </div>
              </div>
            )}
            {pip.compliance.certifications.length > 0 && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Certs</span>
                <div className="flex flex-wrap gap-1">
                  {pip.compliance.certifications.map((c) => <Chip key={c} label={c} color="slate" />)}
                </div>
              </div>
            )}
            <Row
              label="Private label"
              value={
                pip.commercial.private_label === true
                  ? "Yes"
                  : pip.commercial.private_label === false
                  ? "No"
                  : null
              }
            />
            <Row label="Market" value={pip.commercial.target_market} />
            <Row label="Urgency" value={pip.commercial.urgency} />
            <Row label="Volume" value={pip.commercial.volume} />
            {pip.match_config.must_have.length > 0 && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Must have</span>
                <div className="flex flex-wrap gap-1">
                  {pip.match_config.must_have.map((t) => <Chip key={t} label={t} color="green" />)}
                </div>
              </div>
            )}
            {pip.match_config.nice_to_have.length > 0 && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Nice to have</span>
                <div className="flex flex-wrap gap-1">
                  {pip.match_config.nice_to_have.map((t) => <Chip key={t} label={t} color="blue" />)}
                </div>
              </div>
            )}
          </div>
        )}

        {pip && editState && (mode === "edit" || mode === "saving") && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            {(
              [
                ["product_name", "Product name"],
                ["category_raw", "Category"],
                ["formats", "Formats (comma-separated)"],
                ["packaging", "Packaging"],
                ["sizes", "Sizes (comma-separated)"],
                ["kosher_types", "Kosher types (comma-separated)"],
                ["certifications", "Other certs (comma-separated)"],
                ["volume", "Volume"],
                ["urgency", "Urgency"],
                ["target_market", "Target market"],
                ["budget", "Budget"],
                ["must_have", "Must have (comma-separated)"],
                ["nice_to_have", "Nice to have (comma-separated)"],
                ["dealbreakers", "Dealbreakers (comma-separated)"],
              ] as [keyof typeof editState, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <input
                  type="text"
                  className={inputCls}
                  value={editState[field] as string}
                  onChange={(e) =>
                    setEditState((prev) => (prev ? { ...prev, [field]: e.target.value } : prev))
                  }
                  disabled={mode === "saving"}
                />
              </div>
            ))}
            <div className="flex gap-4">
              {(
                [
                  ["halal", "Halal"],
                  ["organic", "Organic"],
                ] as [keyof typeof editState, string][]
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editState[field] as boolean}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, [field]: e.target.checked } : prev))
                    }
                    disabled={mode === "saving"}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editState.private_label === true}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, private_label: e.target.checked ? true : null } : prev
                    )
                  }
                  disabled={mode === "saving"}
                  className="rounded"
                />
                Private label
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
