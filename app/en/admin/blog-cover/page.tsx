"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DragDropUpload from "@/components/DragDropUpload";

type Post = {
  slug: string;
  title: string;
  cover_image: string | null;
  hero_image: string | null;
};

type HistoryRow = {
  id: string;
  action: "replace" | "delete";
  field_name: string; // cover_image / hero_image
  old_url: string | null;
  new_url: string | null;
  changed_at: string;
};

type StatusState = {
  stage: "idle" | "uploading" | "saving" | "done" | "error";
  progress: number;
  message: string;
};

export default function BlogCoverAdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [status, setStatus] = useState<StatusState>({
    stage: "idle",
    progress: 0,
    message: "Ready",
  });

  const selectedPost = useMemo(
    () => posts.find((p) => p.slug === selectedSlug),
    [posts, selectedSlug]
  );

  const showGate = !authorized;

  useEffect(() => {
    if (!authorized) return;

    (async () => {
      const res = await fetch("/api/blog/posts");
      const json = await res.json();
      const list: Post[] = json.posts || [];
      setPosts(list);
      if (list.length) setSelectedSlug((prev) => prev || list[0].slug);
    })();
  }, [authorized]);

  useEffect(() => {
    if (!authorized || !selectedSlug) return;

    (async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/blog/history?slug=${encodeURIComponent(selectedSlug)}`);
        const json = await res.json();
        setHistory(json.history || []);
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [authorized, selectedSlug]);

  function tryAuthorize() {
    if (password === "3007") {
      setAuthorized(true);
      setPassword("");
      setStatus({ stage: "idle", progress: 0, message: "Ready" });
    } else {
      setStatus({ stage: "error", progress: 0, message: "Wrong password" });
    }
  }

  function formatTime(ts: string) {
    try {
      return new Date(ts).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  }

  async function refreshHistory() {
    if (!selectedSlug) return;
    try {
      const res = await fetch(`/api/blog/history?slug=${encodeURIComponent(selectedSlug)}`);
      const json = await res.json();
      setHistory(json.history || []);
    } catch {
      // ignore
    }
  }

  async function saveImage(field: "cover" | "hero", url: string, object_path: string) {
    setStatus({ stage: "saving", progress: 92, message: "Saving to database…" });

    const res = await fetch("/api/blog/set-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedSlug, field, action: "replace", url, object_path }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setStatus({ stage: "error", progress: 0, message: json.error || "Save failed." });
      return;
    }

    // update local preview immediately
    setPosts((prev) =>
      prev.map((p) =>
        p.slug !== selectedSlug
          ? p
          : {
              ...p,
              cover_image: field === "cover" ? url : p.cover_image,
              hero_image: field === "hero" ? url : p.hero_image,
            }
      )
    );

    setStatus({ stage: "done", progress: 100, message: "Saved ✅" });
    await refreshHistory();
    setTimeout(() => setStatus({ stage: "idle", progress: 0, message: "Ready" }), 1500);
  }

  async function deleteImage(field: "cover" | "hero") {
    const ok = confirm(`Delete ${field} image?`);
    if (!ok) return;

    setStatus({ stage: "saving", progress: 70, message: "Deleting…" });

    const res = await fetch("/api/blog/set-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedSlug, field, action: "delete" }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setStatus({ stage: "error", progress: 0, message: json.error || "Delete failed." });
      return;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.slug !== selectedSlug
          ? p
          : {
              ...p,
              cover_image: field === "cover" ? null : p.cover_image,
              hero_image: field === "hero" ? null : p.hero_image,
            }
      )
    );

    setStatus({ stage: "done", progress: 100, message: "Deleted ✅" });
    await refreshHistory();
    setTimeout(() => setStatus({ stage: "idle", progress: 0, message: "Ready" }), 1500);
  }

  return (
    <main className="bg-slate-50 min-h-screen py-14 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Internal CMS — Blog Images
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Manage cover + hero images with history and delete.
            </p>
          </div>

          <Link href="/en/admin" className="text-sm text-orange-600 hover:underline">
            ← Back to Internal Tools
          </Link>
        </div>

        {/* Status / Progress */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-slate-800">{status.message}</div>
            <div className="text-xs text-slate-500">{status.stage}</div>
          </div>
          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status.stage === "error"
                  ? "bg-red-500"
                  : status.stage === "done"
                  ? "bg-green-500"
                  : "bg-orange-500"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, status.progress))}%` }}
            />
          </div>
        </div>

        {/* Main */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Select blog post
          </label>

          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={!authorized}
          >
            {posts.length === 0 ? (
              <option value="">{authorized ? "Loading posts…" : "Locked"}</option>
            ) : (
              posts.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} ({p.slug})
                </option>
              ))
            )}
          </select>

          {/* Previews */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="px-4 py-3 text-sm font-semibold text-slate-800 border-b border-slate-200 bg-white">
                Current Cover
              </div>
              <div className="p-4">
                {selectedPost?.cover_image ? (
                  <img src={selectedPost.cover_image} alt="cover" className="w-full h-[180px] object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-[180px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500">
                    No cover image set
                  </div>
                )}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => deleteImage("cover")}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                >
                  Delete cover
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="px-4 py-3 text-sm font-semibold text-slate-800 border-b border-slate-200 bg-white">
                Current Hero
              </div>
              <div className="p-4">
                {selectedPost?.hero_image ? (
                  <img src={selectedPost.hero_image} alt="hero" className="w-full h-[180px] object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-[180px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500">
                    No hero image set
                  </div>
                )}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => deleteImage("hero")}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                >
                  Delete hero
                </button>
              </div>
            </div>
          </div>

          {/* Uploaders */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-2">
                Upload NEW Cover
              </div>
              <DragDropUpload
                folder="blog"
                onStatus={(s: any) => {
                  if (s.stage === "uploading") setStatus({ stage: "uploading", progress: s.progress, message: s.message || "Uploading…" });
                  if (s.stage === "done") setStatus({ stage: "saving", progress: 92, message: "Upload complete. Saving…" });
                  if (s.stage === "error") setStatus({ stage: "error", progress: 0, message: s.message || "Upload error." });
                  if (s.stage === "canceled") setStatus({ stage: "idle", progress: 0, message: "Canceled." });
                }}
                onUploaded={async (url: string, objectPath: string) => {
                  if (!selectedSlug) return;
                  await saveImage("cover", url, objectPath);
                }}
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900 mb-2">
                Upload NEW Hero
              </div>
              <DragDropUpload
                folder="blog"
                onStatus={(s: any) => {
                  if (s.stage === "uploading") setStatus({ stage: "uploading", progress: s.progress, message: s.message || "Uploading…" });
                  if (s.stage === "done") setStatus({ stage: "saving", progress: 92, message: "Upload complete. Saving…" });
                  if (s.stage === "error") setStatus({ stage: "error", progress: 0, message: s.message || "Upload error." });
                  if (s.stage === "canceled") setStatus({ stage: "idle", progress: 0, message: "Canceled." });
                }}
                onUploaded={async (url: string, objectPath: string) => {
                  if (!selectedSlug) return;
                  await saveImage("hero", url, objectPath);
                }}
              />
            </div>
          </div>

          {/* History */}
          <div className="mt-10 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">History</div>
              <div className="text-xs text-slate-500">
                {loadingHistory ? "Loading…" : `${history.length} items`}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-sm text-slate-500">No history yet.</div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm font-medium text-slate-900">
                        {h.action === "replace" ? "Replaced" : "Deleted"} — {h.field_name}
                      </div>
                      <div className="text-xs text-slate-500">{formatTime(h.changed_at)}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Old: {h.old_url ? h.old_url : "—"} <br />
                      New: {h.new_url ? h.new_url : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password overlay */}
      {showGate ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-7">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-500">Internal Access</div>
              <h2 className="text-xl font-semibold text-slate-900 mt-2">Enter password</h2>
              <p className="text-sm text-slate-600 mt-2">This area is for internal tools only.</p>
            </div>

            <div className="mt-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" ? tryAuthorize() : null)}
                placeholder="Password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={tryAuthorize}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold"
              >
                Unlock
              </button>
              <p className="mt-3 text-xs text-slate-500 text-center">Tip: press Enter to submit</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
``