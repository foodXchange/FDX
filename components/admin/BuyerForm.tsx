"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BuyerInput } from "@/app/admin/buyers/actions";
import { uploadBuyerLogo } from "@/app/admin/buyers/actions";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";

type ActionResult = { ok: boolean; id?: string; error?: string };
type Action = (data: BuyerInput) => Promise<ActionResult>;

interface Props {
  action: Action;
  initialData?: Partial<BuyerInput> & { id?: string };
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

export default function BuyerForm({ action, initialData, redirectOnCreate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState(initialData?.company_name ?? "");
  const [website, setWebsite] = useState(initialData?.website ?? "");
  const [country, setCountry] = useState(initialData?.country ?? "");
  const [buyerType, setBuyerType] = useState(initialData?.buyer_type ?? "");
  const [kosherStandard, setKosherStandard] = useState(initialData?.kosher_standard ?? "");
  const [contactName, setContactName] = useState(initialData?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(initialData?.contact_whatsapp ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [active, setActive] = useState(initialData?.active ?? true);

  // ── Logo section state ───────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData?.logo_url ?? null);
  const [logoUrlInput, setLogoUrlInput] = useState(initialData?.logo_url ?? "");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Storage path needs an id even for not-yet-saved buyers.
  const [tempId] = useState(() => initialData?.id ?? crypto.randomUUID());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setPreviewBroken(false);
  }, [logoUrl]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxImage) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage]);

  function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    (async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadBuyerLogo(tempId, fd);
        if (!result.ok) {
          setUploadError(result.error);
          return;
        }
        setLogoUrl(result.url);
        setLogoUrlInput(result.url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    })();
  }

  function clearLogo() {
    setLogoUrl(null);
    setLogoUrlInput("");
    setUploadError(null);
  }

  function handleSave() {
    setError("");
    const data: BuyerInput = {
      company_name: companyName,
      website: website || null,
      country: country || null,
      buyer_type: buyerType || null,
      kosher_standard: kosherStandard || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_whatsapp: contactWhatsapp || null,
      notes: notes || null,
      active,
      logo_url: logoUrl,
    };

    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      if (redirectOnCreate && result.id) {
        router.push(`/admin/buyers/${result.id}`);
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

      {/* LOGO */}
      <div className={cardCls}>
        <label className={labelCls}>Logo</label>
        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            {logoUrl && !previewBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Buyer logo"
                className="w-20 h-20 rounded-full object-cover border border-gray-200 cursor-pointer"
                onError={() => setPreviewBroken(true)}
                onClick={() => setLightboxImage(logoUrl)}
              />
            ) : (
              (() => {
                const { bg, text } = avatarColors(companyName || "?");
                return (
                  <div
                    className={`w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center text-xl font-bold ${bg} ${text}`}
                  >
                    {getInitials(companyName || "?")}
                  </div>
                );
              })()
            )}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <label className={labelCls}>Logo URL</label>
              <input
                type="text"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                onBlur={() => {
                  const trimmed = logoUrlInput.trim();
                  if (trimmed.startsWith("http")) {
                    setLogoUrl(trimmed);
                  }
                }}
                placeholder="https://example.com/logo.png"
                className={inputCls}
              />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 text-xs text-gray-400 transition ${
                dragOver ? "border-orange-300 bg-orange-50" : "border-gray-200"
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2 text-gray-500">
                  <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                  Uploading…
                </span>
              ) : (
                <>
                  <span>or drag &amp; drop an image</span>
                  <label className="text-orange-600 hover:text-orange-700 cursor-pointer underline">
                    browse
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

            {logoUrl && (
              <button
                type="button"
                onClick={clearLogo}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕ Remove logo
              </button>
            )}
          </div>
        </div>
      </div>

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
            <label className={labelCls}>Website</label>
            <input type="url" value={website ?? ""} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input type="text" value={country ?? ""} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Israel" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Buyer type</label>
            <input type="text" value={buyerType ?? ""} onChange={(e) => setBuyerType(e.target.value)} placeholder="e.g. Importer, Retailer" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Kosher standard</label>
            <input type="text" value={kosherStandard ?? ""} onChange={(e) => setKosherStandard(e.target.value)} placeholder="e.g. OU, Badatz" className={inputCls} />
          </div>
        </div>
      </div>

      {/* CONTACT */}
      <div className={cardCls}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact name</label>
            <input type="text" value={contactName ?? ""} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Jane Doe" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact email</label>
            <input type="email" value={contactEmail ?? ""} onChange={(e) => setContactEmail(e.target.value)} placeholder="buyer@company.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact WhatsApp</label>
            <input type="tel" value={contactWhatsapp ?? ""} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+972 …" className={inputCls} />
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className={cardCls}>
        <label className={labelCls}>Notes</label>
        <textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Internal notes about this buyer…" className={`${inputCls} resize-none`} />
      </div>

      {/* SETTINGS */}
      <div className={cardCls}>
        <Toggle checked={active} onChange={setActive} label="Active" />
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
        <a href="/admin/buyers" className="text-sm text-gray-500 hover:text-gray-700 transition">
          Cancel
        </a>
      </div>

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[80vw] max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
