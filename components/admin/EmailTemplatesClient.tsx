"use client";

import { useState } from "react";
import { createTemplate, updateTemplate, deleteTemplate, type TemplateInput } from "@/app/admin/settings/email-templates/actions";

export type EmailTemplateRow = {
  id: string;
  name: string;
  channel: "email" | "whatsapp" | "both";
  subject: string | null;
  body: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  both: "Email + WhatsApp",
};

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-50 text-blue-700",
  whatsapp: "bg-green-50 text-green-700",
  both: "bg-purple-50 text-purple-700",
};

const EMPTY_FORM: TemplateInput = { name: "", channel: "email", subject: "", body: "" };

const PLACEHOLDER_HINT = "Available placeholders: {{company_name}}, {{product_name}}, {{country}}, {{match_score}}";

export default function EmailTemplatesClient({ templates }: { templates: EmailTemplateRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TemplateInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCreating(true);
    setError(null);
  }

  function startEdit(t: EmailTemplateRow) {
    setForm({ name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body });
    setEditingId(t.id);
    setCreating(false);
    setError(null);
  }

  function cancelForm() {
    setEditingId(null);
    setCreating(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = editingId ? await updateTemplate(editingId, form) : await createTemplate(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await deleteTemplate(id);
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-gray-800">Email Templates</h1>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className="text-sm px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
          >
            New template
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
            <select
              value={form.channel}
              onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as TemplateInput["channel"] }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="both">Email + WhatsApp</option>
            </select>
          </div>

          {(form.channel === "email" || form.channel === "both") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Sourcing inquiry: {{product_name}} — FoodXchange"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-y"
            />
            <p className="text-[11px] text-gray-400 mt-1">{PLACEHOLDER_HINT}</p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.body}
              className="text-sm px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No templates yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
          {templates.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{t.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHANNEL_BADGE[t.channel]}`}>
                    {CHANNEL_LABEL[t.channel]}
                  </span>
                </div>
                {t.subject && <p className="text-xs text-gray-400 truncate mt-0.5">{t.subject}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
