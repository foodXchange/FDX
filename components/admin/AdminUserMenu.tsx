"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type AdminProfile = {
  name: string;
  role: string;
  email: string;
  avatarType: "image" | "emoji" | "initials";
  avatarUrl: string;
  avatarEmoji: string;
  avatarGradient: string;
  status: "online" | "away" | "busy";
};

const STORAGE_KEY = "fdx_admin_user_profile";

const DEFAULT_PROFILE: AdminProfile = {
  name: "Udi FDX",
  role: "Managing Director",
  email: "udi@fdx.trading",
  avatarType: "initials",
  avatarUrl: "",
  avatarEmoji: "🧑‍💼",
  avatarGradient: "from-orange-500 to-amber-600",
  status: "online",
};

const PRESET_EMOJIS = ["🧑‍💼", "👔", "👑", "🚀", "⚡", "💎", "🦅", "🦁", "🎯", "🌐"];

const PRESET_GRADIENTS = [
  { label: "Orange Flame", value: "from-orange-500 to-amber-600" },
  { label: "Indigo Ocean", value: "from-indigo-600 to-blue-500" },
  { label: "Emerald Growth", value: "from-emerald-500 to-teal-600" },
  { label: "Midnight Violet", value: "from-purple-600 to-indigo-700" },
  { label: "Sunset Rose", value: "from-rose-500 to-orange-500" },
  { label: "Slate Executive", value: "from-slate-700 to-slate-900" },
];

export default function AdminUserMenu() {
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT_PROFILE);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<AdminProfile>(DEFAULT_PROFILE);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({ ...prev, ...parsed }));
        setEditForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Save profile to state & localStorage
  const saveProfile = (newProfile: AdminProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch {
      // storage error
    }
  };

  const handleStatusChange = (status: "online" | "away" | "busy") => {
    const updated = { ...profile, status };
    saveProfile(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setEditForm((prev) => ({
        ...prev,
        avatarType: "image",
        avatarUrl: base64,
      }));
      setImageError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(editForm);
    setShowModal(false);
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Status dot color
  const statusColors = {
    online: "bg-emerald-500",
    away: "bg-amber-500",
    busy: "bg-rose-500",
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* ── HEADER PROFILE PILL TRIGGER ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition-all text-left group shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        aria-label="User account menu"
      >
        {/* Avatar Circle with Status Indicator */}
        <div className="relative shrink-0">
          {profile.avatarType === "image" && profile.avatarUrl && !imageError ? (
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-300/80 shadow-2xs relative bg-slate-200">
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                sizes="28px"
                className="object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : profile.avatarType === "emoji" ? (
            <div className={`w-7 h-7 rounded-full bg-linear-to-br ${profile.avatarGradient} flex items-center justify-center text-xs shadow-2xs`}>
              {profile.avatarEmoji}
            </div>
          ) : (
            <div className={`w-7 h-7 rounded-full bg-linear-to-br ${profile.avatarGradient} text-white flex items-center justify-center text-[10px] font-extrabold shadow-2xs tracking-tighter`}>
              {getInitials(profile.name)}
            </div>
          )}

          {/* Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[profile.status]}`}
            title={`Status: ${profile.status}`}
          />
        </div>

        {/* Text Info */}
        <div className="hidden sm:block min-w-0 pr-0.5">
          <p className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-orange-600 transition-colors">
            {profile.name}
          </p>
          <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
            {profile.role}
          </p>
        </div>

        {/* Dropdown Chevron */}
        <span className="text-slate-400 group-hover:text-slate-600 text-[10px] transition-transform">
          ▼
        </span>
      </button>

      {/* ── FLYOUT MENU DROPDOWN ── */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header Card */}
          <div className="bg-slate-900 p-4 text-white relative">
            <div className="flex items-center gap-3">
              {profile.avatarType === "image" && profile.avatarUrl && !imageError ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500/80 shadow-md relative bg-slate-800 shrink-0">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : profile.avatarType === "emoji" ? (
                <div className={`w-12 h-12 rounded-full bg-linear-to-br ${profile.avatarGradient} flex items-center justify-center text-xl shadow-md shrink-0`}>
                  {profile.avatarEmoji}
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-full bg-linear-to-br ${profile.avatarGradient} text-white flex items-center justify-center text-sm font-black shadow-md shrink-0`}>
                  {getInitials(profile.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-white truncate">{profile.name}</p>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-orange-500 text-white">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium truncate mt-0.5">{profile.role}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{profile.email}</p>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Availability:</span>
              <div className="flex items-center gap-1">
                {(["online", "away", "busy"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md capitalize transition-colors flex items-center gap-1 ${
                      profile.status === s
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[s]}`} />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-2 border-b border-slate-100 space-y-0.5">
            <Link
              href="/admin/pipeline"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <span>🎯</span>
              <span>Deal Pipeline</span>
            </Link>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <span>🔔</span>
              <span>Alerts &amp; Reminders</span>
            </Link>
            <Link
              href="/admin/scraper"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <span>🕷️</span>
              <span>Web Scraper Console</span>
            </Link>
            <Link
              href="/admin/data-quality"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <span>🏷️</span>
              <span>Data Quality &amp; Duplicates</span>
            </Link>
          </div>

          {/* Edit Profile & Avatar Button */}
          <div className="p-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditForm(profile);
                setShowModal(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span>Customize Profile &amp; Avatar</span>
              </div>
              <span className="text-[10px]">&rarr;</span>
            </button>
          </div>

          {/* Sign Out Action */}
          <div className="p-2 bg-slate-50">
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>⏻</span>
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOMIZE PROFILE & AVATAR MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveModal}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-base font-bold text-slate-900">Customize Admin Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative shrink-0">
                {editForm.avatarType === "image" && editForm.avatarUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500 relative bg-slate-200">
                    <Image
                      src={editForm.avatarUrl}
                      alt={editForm.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : editForm.avatarType === "emoji" ? (
                  <div className={`w-16 h-16 rounded-full bg-linear-to-br ${editForm.avatarGradient} flex items-center justify-center text-2xl shadow-sm`}>
                    {editForm.avatarEmoji}
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-full bg-linear-to-br ${editForm.avatarGradient} text-white flex items-center justify-center text-lg font-black shadow-sm`}>
                    {getInitials(editForm.name || "AD")}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColors[editForm.status]}`} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{editForm.name || "Admin"}</p>
                <p className="text-xs text-slate-500 truncate">{editForm.role || "Managing Director"}</p>
                <p className="text-[11px] text-slate-400 truncate">{editForm.email}</p>
              </div>
            </div>

            {/* Avatar Mode Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Avatar Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "initials", label: "Initials Badge", icon: "🔤" },
                  { type: "image", label: "Custom Photo", icon: "📷" },
                  { type: "emoji", label: "Icon / Emoji", icon: "✨" },
                ].map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, avatarType: m.type as AdminProfile["avatarType"] }))}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      editForm.avatarType === m.type
                        ? "border-orange-500 bg-orange-50 text-orange-700 font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm block mb-0.5">{m.icon}</span>
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* If Image mode */}
            {editForm.avatarType === "image" && (
              <div className="space-y-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Upload Photo (PNG, JPG, WebP)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Or Paste Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={editForm.avatarUrl}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {/* If Emoji mode */}
            {editForm.avatarType === "emoji" && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Choose Preset Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, avatarEmoji: emoji }))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-colors ${
                        editForm.avatarEmoji === emoji
                          ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Gradient Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Badge Background Gradient</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_GRADIENTS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, avatarGradient: g.value }))}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-[11px] transition-all ${
                      editForm.avatarGradient === g.value
                        ? "border-orange-500 bg-orange-50 text-orange-900 font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full bg-linear-to-br ${g.value} shrink-0`} />
                    <span className="truncate">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Role Inputs */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Udi FDX"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Managing Director"
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="udi@fdx.trading"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditForm(DEFAULT_PROFILE)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Reset to default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
