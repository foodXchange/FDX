"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PipV1 } from "@/lib/pip/buildPipV1";

interface Props {
  requestId: string;
  initialPip: Record<string, unknown> | null;
}

type Mode = "display" | "edit" | "regenerating" | "saving";

function asPip(raw: Record<string, unknown> | null): PipV1 | null {
  if (!raw || raw.version !== "1.0") return null;
  return raw as unknown as PipV1;
}

function Chip({
  label,
  color,
}: {
  label: string;
  color: "green" | "blue" | "orange" | "slate";
}) {
  const cls = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }[color];
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${cls}`}>
      {label}
    </span>
  );
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
    product: {
      name: s.product_name,
      raw_description: s.raw_description,
    },
    category: {
      ...base.category,
      raw_text: s.category_raw,
    },
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

export default function PipPanel({ requestId, initialPip }: Props) {
  const router = useRouter();
  const [raw, setRaw] = useState<Record<string, unknown> | null>(initialPip);
  const [mode, setMode] = useState<Mode>("display");
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<ReturnType<typeof pipToEditState> | null>(null);

  const pip = asPip(raw);

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

  const sHdr = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2";
  const inputCls =
    "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400";
  const labelCls = "block text-xs text-gray-400 mb-0.5";

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className={sHdr + " mb-0"}>PIP</h3>
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
          <p className="text-xs text-gray-400">No PIP yet</p>
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
                {pip.specifications.formats.map((f) => (
                  <Chip key={f} label={f} color="slate" />
                ))}
              </div>
            </div>
          )}
          <Row label="Packaging" value={pip.specifications.packaging} />
          {pip.compliance.kosher_required && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Kosher</span>
              <div className="flex flex-wrap gap-1">
                {pip.compliance.kosher_types.length > 0 ? (
                  pip.compliance.kosher_types.map((k) => (
                    <Chip key={k} label={k} color="orange" />
                  ))
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
                {pip.compliance.certifications.map((c) => (
                  <Chip key={c} label={c} color="slate" />
                ))}
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
                {pip.match_config.must_have.map((t) => (
                  <Chip key={t} label={t} color="green" />
                ))}
              </div>
            </div>
          )}
          {pip.match_config.nice_to_have.length > 0 && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">Nice to have</span>
              <div className="flex flex-wrap gap-1">
                {pip.match_config.nice_to_have.map((t) => (
                  <Chip key={t} label={t} color="blue" />
                ))}
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
                  setEditState((prev) => prev ? { ...prev, [field]: e.target.value } : prev)
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
                    setEditState((prev) => prev ? { ...prev, [field]: e.target.checked } : prev)
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
    </section>
  );
}
