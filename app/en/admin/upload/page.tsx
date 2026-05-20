"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DragDropUpload from "@/components/DragDropUpload";

type Issue = {
  slug: string;
  title: string;
  cover_image: string | null;
};

type HistoryRow = {
  id: string;
  action: string;
  field_name: string;
  changed_at: string;
  trashed_object_path: string | null;
};

type TrashItem = {
  id: string;
  trashed_object_path: string;
  changed_at: string;
};

export default function UploadPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);

  const [trashEnabled, setTrashEnabled] = useState(true);
  const [trashDays, setTrashDays] = useState(14);

  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ slug: string; path: string } | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const bucket = "content-images";

  const selected = useMemo(
    () => issues.find((i) => i.slug === selectedSlug) || null,
    [issues, selectedSlug]
  );

  const publicUrl = (p: string) =>
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${p}`;

  const age = (t: string) =>
    Math.floor((Date.now() - new Date(t).getTime()) / 86400000);

  // ---------------- LOAD

  async function reloadAll() {
    await Promise.all([
      loadIssues(),
      loadHistory(),
      loadTrash(),
      loadSettings(),
    ]);
  }

  async function loadIssues() {
    const r = await fetch("/api/newsletter/issues");
    const j = await r.json();
    setIssues(j.issues || []);
    if (!selectedSlug && j.issues?.length) {
      setSelectedSlug(j.issues[0].slug);
    }
  }

  async function loadHistory() {
    if (!selectedSlug) return;
    const r = await fetch(`/api/newsletter/history?slug=${selectedSlug}`);
    const j = await r.json();
    setHistory(j.history || []);
  }

  async function loadTrash() {
    const r = await fetch("/api/trash/list");
    const j = await r.json();
    setTrash(j.items || []);
  }

  async function loadSettings() {
    const r = await fetch("/api/settings/trash");
    const j = await r.json();
    setTrashEnabled(j.trash_enabled === "true");
    setTrashDays(Number(j.trash_days));
  }

  useEffect(() => {
    if (authorized) reloadAll();
  }, [authorized]);

  useEffect(() => {
    if (authorized && selectedSlug) loadHistory();
  }, [selectedSlug]);

  // ---------------- ACTIONS

  async function replaceCover(slug: string, url: string, path: string) {
    await fetch("/api/newsletter/set-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "replace", cover_image: url, cover_object_path: path }),
    });

    reloadAll();
  }

  async function deleteCover(slug: string) {
    await fetch("/api/newsletter/set-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "delete" }),
    });

    const r = await fetch(`/api/newsletter/history?slug=${slug}`);
    const j = await r.json();
    const latest = j.history?.[0];

    if (latest?.trashed_object_path) {
      setUndo({ slug, path: latest.trashed_object_path });
      setTimeout(() => setUndo(null), 5000);
    }

    reloadAll();
  }

  async function restore(p: string) {
    await fetch("/api/newsletter/restore-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedSlug, trashed_object_path: p }),
    });

    setUndo(null);
    reloadAll();
  }

  async function deleteTrash(p: string) {
    await fetch("/api/trash/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p }),
    });

    loadTrash();
  }

  async function saveSettings() {
    await fetch("/api/settings/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trash_enabled: trashEnabled, trash_days: trashDays }),
    });
  }

  function auth() {
    if (password === "3007") setAuthorized(true);
  }

  // ---------------- UI

  return (
    <main className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <Link href="/en/admin" className="text-sm text-orange-600 hover:underline">
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold">Newsletter CMS</h1>

        {/* SELECT */}
        <div className="bg-white p-4 rounded-xl border">
          <select
            className="w-full border p-2 rounded"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          >
            {issues.map((i) => (
              <option key={i.slug} value={i.slug}>{i.title}</option>
            ))}
          </select>
        </div>

        {/* COVER */}
        <div className="bg-white p-4 rounded-xl border">
          {selected?.cover_image && (
            <img
              src={selected.cover_image}
              className="w-full h-48 object-cover rounded cursor-pointer"
              onClick={() => setModalSrc(selected.cover_image!)}
            />
          )}
          <DragDropUpload
            folder="newsletter"
            onUploaded={(u, p) => replaceCover(selectedSlug, u, p)}
          />
          <button
            className="mt-3 text-red-600"
            onClick={() => deleteCover(selectedSlug)}
          >
            Delete
          </button>
        </div>

        {/* SETTINGS */}
        <div className="bg-white p-4 rounded-xl border">
          <h2 className="font-semibold mb-2">Trash Settings</h2>

          <label className="flex gap-2 items-center text-sm">
            <input type="checkbox" checked={trashEnabled}
              onChange={(e) => setTrashEnabled(e.target.checked)} />
            Enable cleanup
          </label>

          <div className="mt-2">
            <input
              type="number"
              value={trashDays}
              onChange={(e) => setTrashDays(Number(e.target.value))}
              className="border w-20"
            /> days
          </div>

          <button onClick={saveSettings} className="mt-2 text-blue-600">
            Save
          </button>
        </div>

        {/* TRASH */}
        <div className="bg-white p-4 rounded-xl border">
          <h2 className="font-semibold mb-3">Trash</h2>

          {trash.length === 0 && <div className="text-sm text-gray-500">Empty</div>}

          {trash.map((t) => {
            const url = publicUrl(t.trashed_object_path);

            return (
              <div key={t.id} className="flex items-center gap-3 mb-2">
                <img
                  src={url}
                  className="w-12 h-12 object-cover rounded cursor-pointer"
                  onClick={() => setModalSrc(url)}
                />
                <span className="text-sm">{age(t.changed_at)}d</span>
                <button onClick={() => deleteTrash(t.trashed_object_path)}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>

        {/* HISTORY */}
        <div className="bg-white p-4 rounded-xl border">
          <h2 className="font-semibold mb-3">History</h2>

          {history.map((h) => (
            <div key={h.id} className="border p-2 mb-2">
              {h.action}
              {h.trashed_object_path && (
                <button onClick={() => restore(h.trashed_object_path!)}>
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* MODAL */}
      {modalSrc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <img src={modalSrc} className="max-h-[80vh] rounded" />
        </div>
      )}

      {/* PASSWORD */}
      {!authorized && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-80">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && auth()}
              className="w-full border p-2 mb-3"
            />
            <button onClick={auth} className="w-full bg-orange-500 text-white py-2">
              Enter
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

