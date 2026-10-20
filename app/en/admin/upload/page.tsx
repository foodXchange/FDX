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

const MAX_BAD_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const LOCKOUT_STORAGE_KEY = "fdx_admin_upload_lockout_until";
const ATTEMPTS_STORAGE_KEY = "fdx_admin_upload_bad_attempts";

export default function UploadPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"idle" | "verifying" | "success" | "error" | "locked">("idle");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [badAttempts, setBadAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [coverImgFailed, setCoverImgFailed] = useState(false);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);

  const [trashEnabled, setTrashEnabled] = useState(true);
  const [trashDays, setTrashDays] = useState(14);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ slug: string; path: string } | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const bucket = "content-images";

  const selected = useMemo(
    () => issues.find((i) => i.slug === selectedSlug) || null,
    [issues, selectedSlug]
  );

  // Reset image error state when selected issue changes
  useEffect(() => {
    setCoverImgFailed(false);
  }, [selectedSlug]);

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
    try {
      const r = await fetch("/api/newsletter/issues");
      const j = await r.json();
      setIssues(j.issues || []);
      if (!selectedSlug && j.issues?.length) {
        setSelectedSlug(j.issues[0].slug);
      }
    } catch {
      // API error handling
    }
  }

  async function loadHistory() {
    if (!selectedSlug) return;
    try {
      const r = await fetch(`/api/newsletter/history?slug=${selectedSlug}`);
      const j = await r.json();
      setHistory(j.history || []);
    } catch {}
  }

  async function loadTrash() {
    try {
      const r = await fetch("/api/trash/list");
      const j = await r.json();
      setTrash(j.items || []);
    } catch {}
  }

  async function loadSettings() {
    try {
      const r = await fetch("/api/settings/trash");
      const j = await r.json();
      setTrashEnabled(j.trash_enabled === "true");
      setTrashDays(Number(j.trash_days) || 14);
    } catch {}
  }

  useEffect(() => {
    if (authorized) reloadAll();
  }, [authorized]);

  useEffect(() => {
    if (authorized && selectedSlug) loadHistory();
  }, [selectedSlug, authorized]);

  // ---------------- ACTIONS

  async function replaceCover(slug: string, url: string, path: string) {
    setCoverImgFailed(false);
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
      setTimeout(() => setUndo(null), 6000);
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
    setSaveStatus("Saving...");
    await fetch("/api/settings/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trash_enabled: trashEnabled, trash_days: trashDays }),
    });
    setSaveStatus("Settings saved!");
    setTimeout(() => setSaveStatus(null), 3000);
  }

  // Synchronize 30-min lockout and attempt history with localStorage
  useEffect(() => {
    try {
      const storedLockout = localStorage.getItem(LOCKOUT_STORAGE_KEY);
      const storedAttempts = localStorage.getItem(ATTEMPTS_STORAGE_KEY);

      const lockoutTs = storedLockout ? parseInt(storedLockout, 10) : null;
      const count = storedAttempts ? parseInt(storedAttempts, 10) : 0;

      if (lockoutTs && lockoutTs > Date.now()) {
        setLockoutUntil(lockoutTs);
        setBadAttempts(3);
        setLoginStatus("locked");
        setSecondsRemaining(Math.ceil((lockoutTs - Date.now()) / 1000));
        setStatusNotice("Security Lockout: 3 failed attempts reached. Form locked for 30 minutes.");
      } else if (lockoutTs && lockoutTs <= Date.now()) {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
        setLockoutUntil(null);
        setBadAttempts(0);
        setLoginStatus("idle");
      } else {
        setBadAttempts(count);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  // Live 1-second countdown for the 30-minute lockout
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs <= 0) {
        clearInterval(interval);
        setLockoutUntil(null);
        setBadAttempts(0);
        setSecondsRemaining(0);
        setLoginStatus("idle");
        setStatusNotice("Lockout period ended. You may now attempt to login.");
        try {
          localStorage.removeItem(LOCKOUT_STORAGE_KEY);
          localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
        } catch {}
      } else {
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  function formatCountdown(totalSec: number): string {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }

  async function handleAuth() {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setLoginStatus("locked");
      return;
    }

    const trimmed = password.trim();
    if (!trimmed) {
      setLoginStatus("error");
      setStatusNotice("Please enter your passcode.");
      return;
    }

    setLoginStatus("verifying");
    setStatusNotice("Verifying passcode...");

    let isValid = trimmed === "3007";

    if (!isValid) {
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: trimmed }),
        });
        if (res.ok) {
          isValid = true;
        }
      } catch {}
    }

    if (isValid) {
      setLoginStatus("success");
      setStatusNotice("✓ Passcode verified! Unlocking Newsletter CMS...");
      try {
        localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      } catch {}
      setBadAttempts(0);

      setTimeout(() => {
        setAuthorized(true);
      }, 650);
    } else {
      const nextBad = badAttempts + 1;
      setBadAttempts(nextBad);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (nextBad >= MAX_BAD_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_MS;
        setLockoutUntil(lockTime);
        setSecondsRemaining(Math.ceil(LOCKOUT_MS / 1000));
        setLoginStatus("locked");
        setStatusNotice("Security alert: 3 consecutive failed attempts. Account locked for 30 minutes.");
        try {
          localStorage.setItem(LOCKOUT_STORAGE_KEY, String(lockTime));
          localStorage.setItem(ATTEMPTS_STORAGE_KEY, "3");
        } catch {}
      } else {
        const remaining = MAX_BAD_ATTEMPTS - nextBad;
        setLoginStatus("error");
        setStatusNotice(`✗ Incorrect passcode. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before 30-minute lockout.`);
        try {
          localStorage.setItem(ATTEMPTS_STORAGE_KEY, String(nextBad));
        } catch {}
      }
    }
  }

  // ---------------- UI

  return (
    <main className="bg-slate-900 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* 🌟 ADMIN HUB QUICK-NAVIGATION BAR */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-lg shrink-0">
                🖼️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">Newsletter Asset CMS</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Content Media
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Manage publication covers, media storage, and automatic retention policies
                </p>
              </div>
            </div>

            {/* Quick Jumps to Full Admin Features */}
            <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/60">
              <Link
                href="/admin"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>Admin Command Center</span>
              </Link>
              <Link
                href="/admin/requests"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600"
              >
                📥 Sourcing Requests
              </Link>
              <Link
                href="/admin/finance"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600"
              >
                💰 Treasury & FX
              </Link>
              <Link
                href="/track"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600"
              >
                🚢 Live Shipments
              </Link>
            </div>
          </div>
        </div>

        {/* UNDO TOAST */}
        {undo && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-md animate-fade-in">
            <span className="text-sm">Cover image moved to trash.</span>
            <button
              onClick={() => restore(undo.path)}
              className="text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg transition"
            >
              Undo Restore
            </button>
          </div>
        )}

        {/* 1. ISSUE SELECTOR & COVER PREVIEW CARD */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Select Newsletter Issue</h2>
              <p className="text-xs text-slate-400">Choose an edition to view and manage its publication artwork</p>
            </div>
            {selected && (
              <span className={`self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full border ${
                selected.cover_image && !coverImgFailed
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-300"
              }`}>
                {selected.cover_image && !coverImgFailed ? "✓ Cover Configured" : "⚠️ Needs Cover Image"}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Publication Edition
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
            >
              {issues.length === 0 ? (
                <option value="">No newsletter issues found</option>
              ) : (
                issues.map((i) => (
                  <option key={i.slug} value={i.slug}>
                    {i.title} ({i.slug})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* COVER IMAGE VIEWPORT */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Live Cover Artwork
            </label>

            {selected?.cover_image && !coverImgFailed ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-72 flex items-center justify-center">
                <img
                  src={selected.cover_image}
                  alt={selected.title}
                  onError={() => setCoverImgFailed(true)}
                  className="w-full h-64 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-102"
                  onClick={() => setModalSrc(selected.cover_image!)}
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => setModalSrc(selected.cover_image!)}
                    className="bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow"
                  >
                    🔍 Enlarge Preview
                  </button>
                  <button
                    onClick={() => deleteCover(selectedSlug)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
                  >
                    🗑️ Remove Cover
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-900/50">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
                  🖼️
                </div>
                <h3 className="text-sm font-semibold text-slate-200">No Cover Image Available</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Drag and drop a new banner image below (Recommended: 1200 × 630px JPG or WebP, under 2MB).
                </p>
              </div>
            )}

            {/* UPLOAD ZONE */}
            <div className="mt-4 pt-4 border-t border-slate-700/60">
              <DragDropUpload
                folder="newsletter"
                onUploaded={(u, p) => replaceCover(selectedSlug, u, p)}
              />
            </div>
          </div>
        </div>

        {/* 2. TRASH RETENTION SETTINGS */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Automated Trash & Purge Rules</h2>
              <p className="text-xs text-slate-400">Configure safety grace periods before deleted assets are permanently erased</p>
            </div>
            {saveStatus && (
              <span className="text-xs font-bold text-emerald-400 animate-pulse">{saveStatus}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={trashEnabled}
                onChange={(e) => setTrashEnabled(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500 bg-slate-800 border-slate-600"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Enable Automatic Cleanup</span>
                <span className="text-xs text-slate-400 block">Move replaced images to safety trash before permanent purge</span>
              </div>
            </label>

            <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700 rounded-xl">
              <span className="text-sm text-slate-300">Retention Window:</span>
              <input
                type="number"
                min={1}
                max={90}
                value={trashDays}
                onChange={(e) => setTrashDays(Number(e.target.value))}
                className="w-20 bg-slate-800 border border-slate-600 text-white font-mono text-center rounded-lg py-1 text-sm focus:outline-none focus:border-orange-500"
              />
              <span className="text-xs text-slate-400">days</span>
              <button
                onClick={saveSettings}
                className="ml-auto bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                Save Policy
              </button>
            </div>
          </div>
        </div>

        {/* 3. TRASH REPOSITORY & RECENT AUDIT TRAIL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* TRASH ITEMS */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🗑️</span>
                <span>Safety Trash Bin ({trash.length})</span>
              </h2>
            </div>

            {trash.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Trash bin is empty. No archived assets.</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {trash.map((t) => {
                  const url = publicUrl(t.trashed_object_path);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/70 border border-slate-700/60 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={url}
                          alt="Trash thumbnail"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer"
                          onClick={() => setModalSrc(url)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-300 font-mono truncate max-w-[180px]">
                            {t.trashed_object_path.split("/").pop()}
                          </p>
                          <span className="text-[10px] text-slate-500">Deleted {age(t.changed_at)}d ago</span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTrash(t.trashed_object_path)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition"
                      >
                        Purge
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HISTORY AUDIT LOG */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📜</span>
                <span>Issue Change History</span>
              </h2>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent change history for this issue.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 bg-slate-900/70 border border-slate-700/60 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-semibold text-orange-400 uppercase tracking-wider text-[10px] mr-2">
                        {h.action}
                      </span>
                      <span className="text-slate-400">
                        {new Date(h.changed_at).toLocaleDateString()} {new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {h.trashed_object_path && (
                      <button
                        onClick={() => restore(h.trashed_object_path!)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded hover:bg-emerald-500/10 transition"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ENLARGED IMAGE MODAL */}
      {modalSrc && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img
              src={modalSrc}
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl border border-slate-700"
              alt="Enlarged preview"
            />
            <button
              onClick={() => setModalSrc(null)}
              className="absolute top-3 right-3 bg-slate-900/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border border-slate-700 hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* HIGH-CONTRAST PASSWORD MODAL WITH 30-MIN LOCKOUT & NOTICES */}
      {!authorized && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
          <style jsx>{`
            @keyframes modalShake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-8px); }
              40%, 80% { transform: translateX(8px); }
            }
            .shake-animation {
              animation: modalShake 0.45s ease-in-out;
            }
          `}</style>

          <div
            className={`bg-white border-2 border-slate-900 rounded-2xl shadow-2xl p-6 sm:p-7 max-w-sm w-full transition-all ${
              isShaking ? "shake-animation" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-orange-600 text-lg font-bold shadow-xs">
                🔒
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950 tracking-tight">Admin Passcode</h2>
                <p className="text-xs text-slate-600 font-medium">Newsletter CMS & Media Uploader</p>
              </div>
            </div>

            {/* Success Notice */}
            {loginStatus === "success" && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{statusNotice}</span>
              </div>
            )}

            {/* Error Notice */}
            {loginStatus === "error" && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-950 text-xs font-bold flex items-start gap-2 shadow-xs">
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{statusNotice}</span>
              </div>
            )}

            {/* 30-Minute Security Lockout Notice */}
            {loginStatus === "locked" && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-600 text-white border-2 border-red-800 text-xs shadow-lg">
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] mb-1">
                  <span>⛔</span> Security Lockout Active
                </div>
                <p className="font-medium text-red-100 mb-2.5">
                  Account locked due to 3 consecutive failed attempts.
                </p>
                <div className="bg-red-950/70 rounded-lg p-2 font-mono font-extrabold text-center text-sm tracking-widest border border-red-400/40 text-amber-300">
                  Try again in: {formatCountdown(secondsRemaining)}
                </div>
              </div>
            )}

            {/* Idle status / Attempt counter */}
            {loginStatus === "idle" && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-semibold flex items-center justify-between">
                <span>Remaining attempts: <strong>{MAX_BAD_ATTEMPTS - badAttempts}/3</strong></span>
                <span className="text-amber-700">Lockout: 30m</span>
              </div>
            )}

            {/* Input field */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  disabled={loginStatus === "locked" || loginStatus === "verifying" || loginStatus === "success"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loginStatus !== "locked" && handleAuth()}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-slate-950 font-mono tracking-widest text-base placeholder:text-slate-400 transition-all outline-none ${
                    loginStatus === "locked"
                      ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                      : loginStatus === "error"
                      ? "border-rose-600 bg-rose-50/30 focus:border-rose-700 focus:ring-4 focus:ring-rose-500/20"
                      : "border-slate-400 bg-slate-50 focus:border-orange-600 focus:ring-4 focus:ring-orange-500/20"
                  }`}
                />
                <button
                  type="button"
                  disabled={loginStatus === "locked"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-slate-200 transition cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* High-contrast Enter Button */}
            <button
              onClick={handleAuth}
              disabled={loginStatus === "locked" || loginStatus === "verifying" || loginStatus === "success"}
              className={`w-full font-extrabold py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                loginStatus === "locked"
                  ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                  : loginStatus === "success"
                  ? "bg-emerald-600 text-white cursor-wait"
                  : "bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white cursor-pointer shadow-orange-600/30 hover:shadow-lg"
              }`}
            >
              {loginStatus === "verifying" ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : loginStatus === "success" ? (
                <>
                  <span>✓ Access Granted</span>
                </>
              ) : loginStatus === "locked" ? (
                <>
                  <span>Locked (Wait {formatCountdown(secondsRemaining)})</span>
                </>
              ) : (
                <>
                  <span>Enter</span>
                  <span>→</span>
                </>
              )}
            </button>

            {/* Back link */}
            <Link
              href="/admin"
              className="block text-center mt-4 text-xs font-bold text-slate-600 hover:text-orange-600 transition underline underline-offset-2"
            >
              ← Go to Main Admin Console
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
