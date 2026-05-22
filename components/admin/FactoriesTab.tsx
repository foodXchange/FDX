"use client";

import { useState, useTransition } from "react";
import {
  saveFactory,
  deleteFactory,
  propagateFactoryCertifications,
  type FactoryFormData,
} from "@/app/admin/suppliers/[id]/actions";

export interface SupplierFactory {
  id: string;
  factory_name: string;
  country: string | null;
  city: string | null;
  is_primary: boolean;
  kosher_types: string[];
  kosher_certifying_body: string | null;
  kosher_passover: boolean;
  kosher_year_round: boolean;
  certifications_quality: string[];
  brc_grade: string | null;
  ifs_grade: string | null;
  certifications_dietary: string[];
  production_capacity: string | null;
  notes: string | null;
}

const KOSHER_OPTIONS = [
  "Chief Rabbinate",
  "Badatz Beit Yosef",
  "Badatz Eida Chareidis",
  "Mehadrin",
  "OU",
  "OK Kosher",
  "KF Kosher",
  "Star-K",
];

const QUALITY_CERTS = [
  "BRC",
  "IFS",
  "FSSC 22000",
  "ISO 22000",
  "ISO 9001",
  "HACCP",
  "SQF",
  "GlobalG.A.P.",
  "FDA Registered",
];

const DIETARY_CERTS = [
  "Organic (EU)",
  "Organic (USDA)",
  "Halal",
  "Gluten Free",
  "Vegan",
  "Non-GMO",
  "Rainforest Alliance",
  "Fairtrade",
];

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelCls =
  "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";
const sectionLabel =
  "text-xs font-semibold text-gray-700 uppercase tracking-wider mt-4 mb-2";

function CheckGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }
  return (
    <div>
      <p className={sectionLabel}>{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-gray-300 text-orange-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function EMPTY_FORM(): FactoryFormData {
  return {
    factory_name: "Main Factory",
    country: null,
    city: null,
    kosher_types: [],
    kosher_certifying_body: null,
    kosher_passover: false,
    kosher_year_round: true,
    certifications_quality: [],
    brc_grade: null,
    ifs_grade: null,
    certifications_dietary: [],
    production_capacity: null,
    notes: null,
  };
}

function FactorySlideOver({
  supplierId,
  factory,
  onSave,
  onClose,
}: {
  supplierId: string;
  factory: SupplierFactory | null;
  onSave: (factory: SupplierFactory) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FactoryFormData>(
    factory
      ? {
          factory_name: factory.factory_name,
          country: factory.country,
          city: factory.city,
          kosher_types: factory.kosher_types,
          kosher_certifying_body: factory.kosher_certifying_body,
          kosher_passover: factory.kosher_passover,
          kosher_year_round: factory.kosher_year_round,
          certifications_quality: factory.certifications_quality,
          brc_grade: factory.brc_grade,
          ifs_grade: factory.ifs_grade,
          certifications_dietary: factory.certifications_dietary,
          production_capacity: factory.production_capacity,
          notes: factory.notes,
        }
      : EMPTY_FORM()
  );
  const [pending, startTransition] = useTransition();
  const [propagating, setPropagating] = useState(false);
  const [propagateMsg, setPropagateMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FactoryFormData>(key: K, val: FactoryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveFactory(
        supplierId,
        factory?.id ?? null,
        form
      );
      if (!result.ok) {
        setError(result.error ?? "Save failed");
        return;
      }
      onSave({
        id: result.id ?? factory?.id ?? "",
        is_primary: factory?.is_primary ?? false,
        ...form,
      });
    });
  }

  async function handlePropagate() {
    if (!factory) return;
    if (
      !confirm(
        `Update certifications on all products from "${factory.factory_name}"?\n\nProducts with a manual override will not be changed.`
      )
    )
      return;
    setPropagating(true);
    setPropagateMsg(null);
    const result = await propagateFactoryCertifications(supplierId, factory.id);
    setPropagating(false);
    if (result.ok) {
      setPropagateMsg(`✓ ${result.updated} products updated`);
    } else {
      setPropagateMsg(`Error: ${result.error ?? "Propagation failed"}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {factory ? "Edit factory" : "Add factory"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Factory name</label>
              <input
                type="text"
                value={form.factory_name}
                onChange={(e) => set("factory_name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input
                type="text"
                value={form.country ?? ""}
                onChange={(e) => set("country", e.target.value || null)}
                placeholder="e.g. Italy"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                type="text"
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value || null)}
                placeholder="e.g. Naples"
                className={inputCls}
              />
            </div>
          </div>

          {/* Kosher */}
          <CheckGroup
            label="Kosher certification"
            options={KOSHER_OPTIONS}
            selected={form.kosher_types}
            onChange={(v) => set("kosher_types", v)}
          />

          {form.kosher_types.length > 0 && (
            <>
              <div>
                <label className={labelCls}>Certifying body</label>
                <input
                  type="text"
                  value={form.kosher_certifying_body ?? ""}
                  onChange={(e) =>
                    set("kosher_certifying_body", e.target.value || null)
                  }
                  placeholder="e.g. OU Kosher, KSA"
                  className={inputCls}
                />
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.kosher_passover}
                      onChange={(e) => set("kosher_passover", e.target.checked)}
                      className="rounded"
                    />
                    Passover kosher
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.kosher_year_round}
                      onChange={(e) => set("kosher_year_round", e.target.checked)}
                      className="rounded"
                    />
                    Year-round kosher
                  </label>
                </div>
              </div>

              {/* Inheritance preview + propagate button (only when editing existing factory) */}
              {factory && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 space-y-2">
                  <p className="text-sm text-orange-800 font-medium">
                    ✡ These certifications will be inherited by all products from this factory
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePropagate}
                      disabled={propagating}
                      className="text-xs font-semibold text-orange-700 hover:text-orange-900 underline underline-offset-2 disabled:opacity-50"
                    >
                      {propagating ? "Propagating…" : "Propagate to all products now →"}
                    </button>
                    {propagateMsg && (
                      <span className="text-xs text-gray-600">{propagateMsg}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quality certs */}
          <CheckGroup
            label="Food safety certifications"
            options={QUALITY_CERTS}
            selected={form.certifications_quality}
            onChange={(v) => set("certifications_quality", v)}
          />
          {form.certifications_quality.includes("BRC") && (
            <div>
              <label className={labelCls}>BRC Grade</label>
              <div className="flex gap-3">
                {["AA", "A", "B", "C"].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="brc_grade"
                      value={g}
                      checked={form.brc_grade === g}
                      onChange={() => set("brc_grade", g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          )}
          {form.certifications_quality.includes("IFS") && (
            <div>
              <label className={labelCls}>IFS Grade</label>
              <div className="flex gap-3">
                {["Higher", "Foundation"].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="ifs_grade"
                      value={g}
                      checked={form.ifs_grade === g}
                      onChange={() => set("ifs_grade", g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dietary certs */}
          <CheckGroup
            label="Dietary & sustainability"
            options={DIETARY_CERTS}
            selected={form.certifications_dietary}
            onChange={(v) => set("certifications_dietary", v)}
          />

          {/* Capacity */}
          <div>
            <label className={labelCls}>Production capacity</label>
            <input
              type="text"
              value={form.production_capacity ?? ""}
              onChange={(e) =>
                set("production_capacity", e.target.value || null)
              }
              placeholder="e.g. 2800 tons/day"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              rows={3}
              placeholder="Internal notes…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending || !form.factory_name}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save factory"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FactoryCard({
  factory,
  productCount,
  onEdit,
  onDelete,
}: {
  factory: SupplierFactory;
  productCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const allCerts = [
    ...factory.certifications_quality,
    ...factory.certifications_dietary,
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-medium text-gray-900 text-sm">
            {factory.factory_name}
          </span>
          {factory.is_primary && (
            <span className="ml-2 text-xs bg-orange-50 text-orange-600 rounded-full px-2 py-0.5">
              primary
            </span>
          )}
          <span className="ml-2 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
            {productCount} product{productCount !== 1 ? "s" : ""}
          </span>
          {(factory.country || factory.city) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[factory.city, factory.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {factory.kosher_types.map((k) => (
          <span
            key={k}
            className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 font-medium"
          >
            ✡ {k}
          </span>
        ))}
        {allCerts.map((c) => (
          <span
            key={c}
            className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5"
          >
            {c}
            {c === "BRC" && factory.brc_grade ? ` ${factory.brc_grade}` : ""}
            {c === "IFS" && factory.ifs_grade ? ` ${factory.ifs_grade}` : ""}
          </span>
        ))}
        {factory.kosher_types.length === 0 && allCerts.length === 0 && (
          <span className="text-xs text-gray-400">No certifications recorded</span>
        )}
      </div>

      {factory.production_capacity && (
        <p className="text-xs text-gray-500 mt-2">
          Capacity: {factory.production_capacity}
        </p>
      )}
    </div>
  );
}

export function FactoriesTab({
  supplierId,
  initialFactories,
  products,
}: {
  supplierId: string;
  initialFactories: SupplierFactory[];
  products: { factory_id: string | null }[];
}) {
  const [factories, setFactories] = useState<SupplierFactory[]>(initialFactories);
  const [slideOver, setSlideOver] = useState<{
    open: boolean;
    factory: SupplierFactory | null;
  }>({ open: false, factory: null });
  const [pending, startTransition] = useTransition();

  function handleSave(saved: SupplierFactory) {
    setFactories((prev) => {
      const idx = prev.findIndex((f) => f.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setSlideOver({ open: false, factory: null });
  }

  function handleDelete(factory: SupplierFactory) {
    if (!confirm(`Delete "${factory.factory_name}"?`)) return;
    startTransition(async () => {
      const result = await deleteFactory(supplierId, factory.id);
      if (!result.ok) {
        alert(result.error ?? "Delete failed");
        return;
      }
      setFactories((prev) => prev.filter((f) => f.id !== factory.id));
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Factories ({factories.length})
        </h3>
        <button
          onClick={() => setSlideOver({ open: true, factory: null })}
          className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
        >
          + Add factory
        </button>
      </div>

      {factories.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No factories recorded. Add one to track certifications.
        </p>
      ) : (
        <div className="space-y-3">
          {factories.map((f) => (
            <FactoryCard
              key={f.id}
              factory={f}
              productCount={products.filter((p) => p.factory_id === f.id).length}
              onEdit={() => setSlideOver({ open: true, factory: f })}
              onDelete={() => handleDelete(f)}
            />
          ))}
        </div>
      )}

      {pending && (
        <p className="text-xs text-gray-400 mt-2">Saving...</p>
      )}

      {slideOver.open && (
        <FactorySlideOver
          supplierId={supplierId}
          factory={slideOver.factory}
          onSave={handleSave}
          onClose={() => setSlideOver({ open: false, factory: null })}
        />
      )}
    </div>
  );
}
