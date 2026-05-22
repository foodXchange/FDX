"use client";

import { useState, useTransition } from "react";
import SupplierForm from "@/components/admin/SupplierForm";
import type { SupplierInput, ContactInput, DocumentInput } from "@/app/admin/suppliers/actions";
import {
  addContact,
  deleteContact,
  addDocument,
  deleteDocument,
  getSupplierMatches,
} from "@/app/admin/suppliers/actions";
import { FactoriesTab, type SupplierFactory } from "@/components/admin/FactoriesTab";
import { SupplierProductsTab, type SupplierProduct } from "@/components/admin/SupplierProductsTab";
import { ScraperConsole } from "@/components/admin/ScraperConsole";

type Tab = "details" | "contacts" | "documents" | "matches" | "factories" | "products" | "scraper";

interface Contact {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean | null;
}

interface Document {
  id: string;
  title: string | null;
  type: string | null;
  url: string | null;
  notes: string | null;
  created_at: string | null;
}

type MatchRow = {
  id: string;
  match_score: number | null;
  match_breakdown: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
  sourcing_requests: {
    id: string;
    product_name: string | null;
    category: string | null;
    message: string | null;
    status: string | null;
    created_at: string;
  } | null;
};

interface Props {
  supplierId: string;
  initialData: Record<string, unknown>;
  contacts: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  factories: SupplierFactory[];
  products: SupplierProduct[];
  action: (data: SupplierInput) => Promise<{ ok: boolean; error?: string }>;
}

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const labelCls =
  "text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>;
  const cls =
    score >= 20
      ? "bg-green-100 text-green-700"
      : score >= 10
      ? "bg-orange-100 text-orange-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {score} pts
    </span>
  );
}

function ContactsTab({
  supplierId,
  initialContacts,
}: {
  supplierId: string;
  initialContacts: Contact[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  function handleAdd() {
    setError("");
    const data: ContactInput = {
      name,
      role: role || null,
      email: email || null,
      phone: phone || null,
      is_primary: isPrimary,
    };
    startTransition(async () => {
      const result = await addContact(supplierId, data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContacts((prev) => [
        ...prev,
        {
          id: result.id,
          name,
          role: role || null,
          email: email || null,
          phone: phone || null,
          is_primary: isPrimary,
        },
      ]);
      setName("");
      setRole("");
      setEmail("");
      setPhone("");
      setIsPrimary(false);
      setShowForm(false);
    });
  }

  function handleDelete(contactId: string) {
    if (!confirm("Remove this contact?")) return;
    startTransition(async () => {
      const result = await deleteContact(supplierId, contactId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Contacts ({contacts.length})
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
        >
          {showForm ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Export Manager"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 …"
                className={inputCls}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-gray-300 text-orange-500"
            />
            Primary contact
          </label>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={pending || !name}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save contact"}
          </button>
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No contacts yet.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Role", "Email", "Phone", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                    {c.is_primary && (
                      <span className="ml-2 text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5">
                        primary
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.role ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="hover:text-orange-600 transition"
                      >
                        {c.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={pending}
                      className="text-xs text-red-500 hover:text-red-700 transition"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({
  supplierId,
  initialDocuments,
}: {
  supplierId: string;
  initialDocuments: Document[];
}) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  function handleAdd() {
    setError("");
    const data: DocumentInput = {
      title,
      type: type || null,
      url: url || null,
      notes: notes || null,
    };
    startTransition(async () => {
      const result = await addDocument(supplierId, data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDocuments((prev) => [
        ...prev,
        {
          id: result.id,
          title,
          type: type || null,
          url: url || null,
          notes: notes || null,
          created_at: new Date().toISOString(),
        },
      ]);
      setTitle("");
      setType("");
      setUrl("");
      setNotes("");
      setShowForm(false);
    });
  }

  function handleDelete(documentId: string) {
    if (!confirm("Remove this document?")) return;
    startTransition(async () => {
      const result = await deleteDocument(supplierId, documentId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Documents ({documents.length})
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
        >
          {showForm ? "Cancel" : "+ Add document"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. BRC Certificate 2024"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={`${inputCls}`}
              >
                <option value="">— Select —</option>
                <option value="certificate">Certificate</option>
                <option value="audit_report">Audit report</option>
                <option value="product_sheet">Product sheet</option>
                <option value="company_profile">Company profile</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={pending || !title}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save document"}
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No documents yet.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900">
                    {d.title}
                  </span>
                  {d.type && (
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                      {d.type.replace("_", " ")}
                    </span>
                  )}
                </div>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-700 transition truncate block"
                  >
                    {d.url}
                  </a>
                )}
                {d.notes && (
                  <p className="text-xs text-gray-500 mt-1">{d.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                className="text-xs text-red-500 hover:text-red-700 transition shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesTab({ supplierId }: { supplierId: string }) {
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [loading, startTransition] = useTransition();

  function loadMatches() {
    startTransition(async () => {
      const data = await getSupplierMatches(supplierId);
      setMatches(data);
    });
  }

  if (matches === null) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm text-gray-500">
          View sourcing requests matched to this supplier.
        </p>
        <button
          onClick={loadMatches}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load demand signals"}
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400 py-12">
        No matches found yet. Matches are created automatically when buyers submit
        sourcing requests.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Demand signals ({matches.length})
        </h3>
        <button
          onClick={loadMatches}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 transition"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Request", "Category", "Score", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matches.map((m) => {
              const req = m.sourcing_requests;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {req?.product_name ?? "—"}
                    </span>
                    {req?.message && (
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                        {req.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {req?.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreChip score={m.match_score} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {m.status ?? "suggested"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SupplierDetailTabs({
  supplierId,
  initialData,
  contacts: rawContacts,
  documents: rawDocuments,
  factories,
  products,
  action,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const contacts = rawContacts as unknown as Contact[];
  const documents = rawDocuments as unknown as Document[];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "details", label: "Details" },
    { id: "contacts", label: "Contacts", count: contacts.length },
    { id: "documents", label: "Documents", count: documents.length },
    { id: "matches", label: "Demand signals" },
    { id: "factories", label: "Factories", count: factories.length },
    { id: "products", label: "Products", count: products.length },
    { id: "scraper", label: "Scraper" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === tab.id
                      ? "bg-orange-100 text-orange-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <SupplierForm
          action={action}
          initialData={initialData as Parameters<typeof SupplierForm>[0]["initialData"]}
        />
      )}
      {activeTab === "contacts" && (
        <ContactsTab supplierId={supplierId} initialContacts={contacts} />
      )}
      {activeTab === "documents" && (
        <DocumentsTab supplierId={supplierId} initialDocuments={documents} />
      )}
      {activeTab === "matches" && <MatchesTab supplierId={supplierId} />}
      {activeTab === "factories" && (
        <FactoriesTab supplierId={supplierId} initialFactories={factories} />
      )}
      {activeTab === "products" && (
        <SupplierProductsTab supplierId={supplierId} initialProducts={products} />
      )}
      {activeTab === "scraper" && (
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">
              Status:{" "}
              <span className="font-medium">
                {String(initialData.scrape_status ?? "not scraped")}
              </span>
            </p>
            {typeof initialData.last_scraped_at === "string" && (
              <p className="text-sm text-gray-600 mb-1">
                Last scraped:{" "}
                {new Date(initialData.last_scraped_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="text-sm text-gray-600">
              Products found:{" "}
              <span className="font-medium">
                {typeof initialData.products_found === "number" ? initialData.products_found : 0}
              </span>
            </p>
          </div>
          {typeof initialData.scrape_log === "string" && initialData.scrape_log && (
            <details className="mb-4">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Show scrape log
              </summary>
              <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                {initialData.scrape_log}
              </pre>
            </details>
          )}
          <ScraperConsole supplierId={supplierId} />
        </div>
      )}
    </div>
  );
}
