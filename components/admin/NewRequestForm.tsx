"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRequestForBuyer } from "@/app/admin/requests/actions";

const CATEGORY_OPTIONS = [
  "Tomato Products",
  "Pasta & Grains",
  "Snacks",
  "Dairy",
  "Beverages",
  "Sauces & Condiments",
  "Canned Foods",
  "Frozen Foods",
  "Oils & Fats",
  "Fish & Seafood",
  "Bakery",
  "Spices & Herbs",
  "Meat & Poultry",
  "Pulses & Legumes",
  "Organic & Natural",
  "Ingredients & Additives",
  "Other",
];

const CERT_OPTIONS = [
  "Organic",
  "Halal",
  "Kosher",
  "Gluten Free",
  "Vegan",
  "Non-GMO",
  "BRC",
  "IFS",
  "ISO 22000",
  "HACCP",
];

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";

export default function NewRequestForm({
  buyerId,
  company,
  name,
  email,
}: {
  buyerId: string;
  company: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name,
    email,
    company,
    product_name: "",
    category: "",
    message: "",
    target_market: "",
    private_label: false,
  });
  const [certifications, setCertifications] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleCert(cert: string) {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRequestForBuyer({
        buyer_id: buyerId,
        name: form.name,
        email: form.email || null,
        company: form.company || null,
        product_name: form.product_name || null,
        category: form.category || null,
        message: form.message || null,
        certifications,
        target_market: form.target_market || null,
        private_label: form.private_label,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/admin/requests/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact name</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
        <input
          className={inputCls}
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Product name</label>
          <input
            className={inputCls}
            value={form.product_name}
            onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Target market</label>
        <input
          className={inputCls}
          value={form.target_market}
          onChange={(e) => setForm((f) => ({ ...f, target_market: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Message / description</label>
        <textarea
          className={inputCls}
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Certifications</label>
        <div className="flex flex-wrap gap-2">
          {CERT_OPTIONS.map((cert) => (
            <button
              key={cert}
              type="button"
              onClick={() => toggleCert(cert)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                certifications.includes(cert)
                  ? "bg-orange-100 text-orange-700 border-orange-200"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.private_label}
          onChange={(e) => setForm((f) => ({ ...f, private_label: e.target.checked }))}
        />
        Private label
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create request"}
      </button>
    </form>
  );
}
