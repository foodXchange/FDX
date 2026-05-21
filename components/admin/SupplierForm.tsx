"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ArrayInput from "@/components/admin/ArrayInput";
import type { SupplierInput } from "@/app/admin/suppliers/actions";

type ActionResult = { ok: boolean; id?: string; error?: string };
type Action = (data: SupplierInput) => Promise<ActionResult>;

interface Props {
  action: Action;
  initialData?: Partial<SupplierInput> & { id?: string };
  redirectOnCreate?: string;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-orange-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
  );
}

export default function SupplierForm({ action, initialData, redirectOnCreate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(initialData?.name ?? "");
  const [company, setCompany] = useState(initialData?.company ?? "");
  const [country, setCountry] = useState(initialData?.country ?? "");
  const [categories, setCategories] = useState<string[]>(initialData?.categories ?? []);
  const [certifications, setCertifications] = useState<string[]>(initialData?.certifications ?? []);
  const [formats, setFormats] = useState<string[]>(initialData?.formats ?? []);
  const [markets, setMarkets] = useState<string[]>(initialData?.markets ?? []);
  const [privateLabel, setPrivateLabel] = useState<boolean>(initialData?.private_label ?? false);
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(initialData?.contact_whatsapp ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [status, setStatus] = useState<"active" | "inactive" | "prospect">(
    (initialData?.status as "active" | "inactive" | "prospect") ?? "active"
  );
  const [priority, setPriority] = useState(initialData?.priority ?? 0);

  function handleSave() {
    setError("");
    const data: SupplierInput = {
      name,
      company,
      country,
      categories,
      certifications,
      formats,
      markets,
      private_label: privateLabel,
      contact_email: contactEmail,
      contact_whatsapp: contactWhatsapp,
      notes,
      status,
      priority,
    };

    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      if (redirectOnCreate && result.id) {
        router.push(`/admin/suppliers/${result.id}`);
      } else if (redirectOnCreate) {
        router.push(redirectOnCreate);
      }
    });
  }

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
  const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";
  const cardCls = "bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm";

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">

      {/* NAME */}
      <div className="mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supplier name…"
          className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300"
        />
      </div>

      {/* COMPANY + COUNTRY */}
      <div className={cardCls}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Italy, Belgium"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ARRAY FIELDS */}
      <div className={cardCls}>
        <div className="space-y-5">
          <ArrayInput values={categories} onChange={setCategories} label="Categories" placeholder="e.g. dairy, snacks" />
          <ArrayInput values={certifications} onChange={setCertifications} label="Certifications" placeholder="e.g. kosher, organic, ifs" />
          <ArrayInput values={formats} onChange={setFormats} label="Formats" placeholder="e.g. bulk, retail-pack" />
          <ArrayInput values={markets} onChange={setMarkets} label="Markets" placeholder="e.g. israel, germany" />
        </div>
      </div>

      {/* CONTACT */}
      <div className={cardCls}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Contact email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@supplier.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input
              type="tel"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="+39 000 000 0000"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className={cardCls}>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Internal notes about this supplier…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* STATUS + PRIORITY + PRIVATE LABEL */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "prospect")}
              className={`${inputCls} w-36`}
            >
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`${inputCls} w-24`}
            />
          </div>
          <div className="pt-5">
            <Toggle checked={privateLabel} onChange={setPrivateLabel} label="Private label" />
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={pending || !name}
          className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <a
          href="/admin/suppliers"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
