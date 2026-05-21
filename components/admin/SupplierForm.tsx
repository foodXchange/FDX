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

  const [companyName, setCompanyName] = useState(initialData?.company_name ?? "");
  const [legalEntity, setLegalEntity] = useState(initialData?.legal_entity ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(initialData?.contact_phone ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialData?.country_of_origin ?? "");
  const [headquarters, setHeadquarters] = useState(initialData?.headquarters ?? "");
  const [region, setRegion] = useState(initialData?.region ?? "");
  const [founded, setFounded] = useState(initialData?.founded ?? "");
  const [companySize, setCompanySize] = useState(initialData?.company_size ?? "");
  const [website, setWebsite] = useState(initialData?.website ?? "");
  const [productType, setProductType] = useState<SupplierInput["product_type"]>(
    initialData?.product_type ?? null
  );
  const [categories, setCategories] = useState<string[]>(initialData?.categories ?? []);
  const [productDescription, setProductDescription] = useState(
    initialData?.product_description ?? ""
  );
  const [formats, setFormats] = useState<string[]>(initialData?.formats ?? []);
  const [certifications, setCertifications] = useState<string[]>(
    initialData?.certifications ?? []
  );
  const [marketsSered, setMarketsServed] = useState<string[]>(
    initialData?.markets_served ?? []
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [primaryIngredients, setPrimaryIngredients] = useState<string[]>(
    initialData?.primary_ingredients ?? []
  );
  const [competitiveAdvantages, setCompetitiveAdvantages] = useState<string[]>(
    initialData?.competitive_advantages ?? []
  );
  const [weaknesses, setWeaknesses] = useState<string[]>(
    initialData?.weaknesses ?? []
  );
  const [privateLabel, setPrivateLabel] = useState(initialData?.private_label ?? false);
  const [ownBrand, setOwnBrand] = useState(initialData?.own_brand ?? false);
  const [verified, setVerified] = useState(initialData?.verified ?? false);
  const [priority, setPriority] = useState(initialData?.priority ?? 0);
  const [status, setStatus] = useState<SupplierInput["status"]>(
    initialData?.status ?? "pending"
  );
  const [pricePositioning, setPricePositioning] = useState<
    SupplierInput["price_positioning"]
  >(initialData?.price_positioning ?? null);
  const [israeliMarketFit, setIsraeliMarketFit] = useState(
    initialData?.israeli_market_fit ?? ""
  );
  const [sourcingNotes, setSourcingNotes] = useState(initialData?.sourcing_notes ?? "");
  const [annualCapacity, setAnnualCapacity] = useState(initialData?.annual_capacity ?? "");

  function handleSave() {
    setError("");
    const data: SupplierInput = {
      company_name: companyName,
      legal_entity: legalEntity,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      country_of_origin: countryOfOrigin || null,
      headquarters: headquarters || null,
      region: region || null,
      founded: founded || null,
      company_size: companySize || null,
      website: website || null,
      product_type: productType,
      categories,
      product_description: productDescription || null,
      formats,
      certifications,
      markets_served: marketsSered,
      tags,
      primary_ingredients: primaryIngredients,
      competitive_advantages: competitiveAdvantages,
      weaknesses,
      private_label: privateLabel,
      own_brand: ownBrand,
      verified,
      priority,
      status,
      price_positioning: pricePositioning,
      israeli_market_fit: israeliMarketFit || null,
      sourcing_notes: sourcingNotes || null,
      annual_capacity: annualCapacity || null,
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
    <div className="max-w-3xl mx-auto px-6 py-8">

      {/* COMPANY NAME */}
      <div className="mb-6">
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company name…"
          className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 outline-none focus:border-orange-400 bg-transparent placeholder:text-gray-300"
        />
      </div>

      {/* IDENTITY */}
      <div className={cardCls}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Legal entity</label>
            <input type="text" value={legalEntity} onChange={(e) => setLegalEntity(e.target.value)} placeholder="Full legal name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Founded</label>
            <input type="text" value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="e.g. 1992" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country of origin</label>
            <input type="text" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} placeholder="e.g. Italy" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Region</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Emilia-Romagna" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Headquarters</label>
            <input type="text" value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="City, Country" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Company size</label>
            <input type="text" value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="e.g. 40-50 employees" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputCls} />
          </div>
        </div>
      </div>

      {/* CONTACT */}
      <div className={cardCls}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="export@company.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact phone</label>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+39 …" className={inputCls} />
          </div>
        </div>
      </div>

      {/* PRODUCT */}
      <div className={cardCls}>
        <div className="mb-4">
          <label className={labelCls}>Product type</label>
          <select value={productType ?? ""} onChange={(e) => setProductType((e.target.value || null) as SupplierInput["product_type"])} className={`${inputCls} w-56`}>
            <option value="">— Select —</option>
            <option value="pure_ingredient">Pure ingredient</option>
            <option value="processed_food">Processed food</option>
            <option value="semi_processed">Semi-processed</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="mb-4">
          <label className={labelCls}>Product description</label>
          <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={4} placeholder="Describe the supplier's main products…" className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Annual capacity</label>
          <input type="text" value={annualCapacity} onChange={(e) => setAnnualCapacity(e.target.value)} placeholder="e.g. 230,000+ tonnes/year" className={inputCls} />
        </div>
      </div>

      {/* ARRAYS */}
      <div className={cardCls}>
        <div className="space-y-5">
          <ArrayInput values={categories} onChange={setCategories} label="Categories" placeholder="e.g. Tomato Products, Dairy" />
          <ArrayInput values={certifications} onChange={setCertifications} label="Certifications" placeholder="e.g. BRC, IFS, Kosher" />
          <ArrayInput values={formats} onChange={setFormats} label="Formats" placeholder="e.g. Bag-in-box 5kg" />
          <ArrayInput values={marketsSered} onChange={setMarketsServed} label="Markets served" placeholder="e.g. Foodservice, Retail" />
          <ArrayInput values={primaryIngredients} onChange={setPrimaryIngredients} label="Primary ingredients" placeholder="e.g. fresh Italian tomatoes" />
          <ArrayInput values={tags} onChange={setTags} label="Tags" placeholder="e.g. kosher tomato, halal" />
        </div>
      </div>

      {/* INTEL */}
      <div className={cardCls}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Israeli market fit</label>
            <textarea value={israeliMarketFit} onChange={(e) => setIsraeliMarketFit(e.target.value)} rows={3} placeholder="Score X/10. Key considerations…" className={`${inputCls} resize-none`} />
          </div>
          <ArrayInput values={competitiveAdvantages} onChange={setCompetitiveAdvantages} label="Competitive advantages" placeholder="Add one per enter…" />
          <ArrayInput values={weaknesses} onChange={setWeaknesses} label="Weaknesses" placeholder="Add one per enter…" />
          <div>
            <label className={labelCls}>Sourcing notes</label>
            <textarea value={sourcingNotes} onChange={(e) => setSourcingNotes(e.target.value)} rows={3} placeholder="Internal notes for sourcing team…" className={`${inputCls} resize-none`} />
          </div>
        </div>
      </div>

      {/* SETTINGS */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as SupplierInput["status"])} className={`${inputCls} w-36`}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Price positioning</label>
            <select value={pricePositioning ?? ""} onChange={(e) => setPricePositioning((e.target.value || null) as SupplierInput["price_positioning"])} className={`${inputCls} w-36`}>
              <option value="">— Select —</option>
              <option value="premium">Premium</option>
              <option value="mid-range">Mid-range</option>
              <option value="budget">Budget</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority (0–100)</label>
            <input type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={`${inputCls} w-24`} />
          </div>
          <div className="flex flex-col gap-3 pt-5">
            <Toggle checked={privateLabel} onChange={setPrivateLabel} label="Private label" />
            <Toggle checked={ownBrand} onChange={setOwnBrand} label="Own brand" />
            <Toggle checked={verified} onChange={setVerified} label="Verified" />
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={pending || !companyName}
          className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <a href="/admin/suppliers" className="text-sm text-gray-500 hover:text-gray-700 transition">
          Cancel
        </a>
      </div>
    </div>
  );
}
