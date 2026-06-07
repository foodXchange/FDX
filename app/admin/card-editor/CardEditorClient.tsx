"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardView, type CardViewData } from "@/components/contact/CardView";

export interface CardEditorPhoto {
  src: string;
  alt: string;
  caption: string;
  offsetX: number;
  offsetY: number;
}

export interface CardEditorData {
  handle: string;
  name: string;
  title: string;
  company: string;
  tagline: string;
  pitch: string;
  email: string;
  phone: string;
  whatsapp_buyer: string;
  whatsapp_manufacturer: string;
  website: string;
  linkedin: string;
  photos: CardEditorPhoto[];
  active_sourcing: string[];
}

interface Props {
  initialData: CardEditorData;
  siteUrl: string;
}

function editorToViewData(d: CardEditorData): CardViewData {
  return {
    handle: d.handle,
    name: d.name,
    title: d.title,
    company: d.company,
    tagline: d.tagline,
    pitch: d.pitch || undefined,
    email: d.email,
    phone: d.phone,
    whatsappBuyer: d.whatsapp_buyer.replace(/^\+/, ""),
    whatsappManufacturer: d.whatsapp_manufacturer.replace(/^\+/, ""),
    website: d.website,
    linkedin: d.linkedin || undefined,
    photos: d.photos.map((p) => ({
      src: p.src,
      alt: p.alt,
      caption: p.caption || undefined,
      offsetX: p.offsetX,
      offsetY: p.offsetY,
    })),
    activeSourcing: d.active_sourcing,
  };
}

const inputCls =
  "w-full bg-transparent border-b border-white/10 focus:border-orange-400 outline-none text-white text-sm py-1.5 transition-colors placeholder-slate-600";
const labelCls = "block text-xs text-slate-500 mb-0.5";
const panelCls = "bg-slate-800/60 border border-white/8 rounded-2xl p-5 mb-4";

export function CardEditorClient({ initialData, siteUrl }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CardEditorData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [positioningPhoto, setPositioningPhoto] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Photo drag-to-reorder state
  const [dragPhotoFrom, setDragPhotoFrom] = useState<number | null>(null);
  const [dragPhotoOver, setDragPhotoOver] = useState<number | null>(null);

  // Sourcing drag-to-reorder state
  const [dragSourcingFrom, setDragSourcingFrom] = useState<number | null>(null);
  const [dragSourcingOver, setDragSourcingOver] = useState<number | null>(null);

  // Photo position drag state
  const posDragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    photoIndex: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardUrl = `${siteUrl}/business-card/${data.handle}`;

  // ── Field helpers ──────────────────────────────────────────────

  function setField<K extends keyof CardEditorData>(key: K, value: CardEditorData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function updatePhoto(index: number, patch: Partial<CardEditorPhoto>) {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  // ── Photos ────────────────────────────────────────────────────

  function handlePhotoDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    setDragPhotoFrom(index);
  }

  function handlePhotoDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragPhotoOver(index);
  }

  function handlePhotoDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragPhotoFrom === null || dragPhotoFrom === targetIndex) {
      setDragPhotoFrom(null);
      setDragPhotoOver(null);
      return;
    }
    const newPhotos = [...data.photos];
    const [moved] = newPhotos.splice(dragPhotoFrom, 1);
    newPhotos.splice(targetIndex, 0, moved);
    setData((prev) => ({ ...prev, photos: newPhotos }));
    setDragPhotoFrom(null);
    setDragPhotoOver(null);
  }

  function removePhoto(index: number) {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    if (positioningPhoto === index) setPositioningPhoto(null);
  }

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/card/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!json.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      const newPhoto: CardEditorPhoto = {
        src: json.url,
        alt: file.name.replace(/\.[^.]+$/, ""),
        caption: "",
        offsetX: 0,
        offsetY: 0,
      };
      setData((prev) => ({ ...prev, photos: [...prev.photos, newPhoto] }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Photo position adjuster ────────────────────────────────────

  function startPositionDrag(e: React.MouseEvent<HTMLDivElement>, photoIndex: number) {
    e.preventDefault();
    const photo = data.photos[photoIndex];
    posDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: photo.offsetX,
      startOffsetY: photo.offsetY,
      photoIndex,
    };

    function onMove(ev: MouseEvent) {
      if (!posDragRef.current) return;
      const dx = ev.clientX - posDragRef.current.startX;
      const dy = ev.clientY - posDragRef.current.startY;
      const newOffsetX = Math.max(-200, Math.min(200, posDragRef.current.startOffsetX + dx));
      const newOffsetY = Math.max(-110, Math.min(110, posDragRef.current.startOffsetY + dy));
      setData((prev) => ({
        ...prev,
        photos: prev.photos.map((p, i) =>
          i === posDragRef.current!.photoIndex ? { ...p, offsetX: newOffsetX, offsetY: newOffsetY } : p
        ),
      }));
    }

    function onUp() {
      posDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Active sourcing ────────────────────────────────────────────

  function handleSourcingDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    setDragSourcingFrom(index);
  }

  function handleSourcingDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragSourcingOver(index);
  }

  function handleSourcingDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragSourcingFrom === null || dragSourcingFrom === targetIndex) {
      setDragSourcingFrom(null);
      setDragSourcingOver(null);
      return;
    }
    const items = [...data.active_sourcing];
    const [moved] = items.splice(dragSourcingFrom, 1);
    items.splice(targetIndex, 0, moved);
    setData((prev) => ({ ...prev, active_sourcing: items }));
    setDragSourcingFrom(null);
    setDragSourcingOver(null);
  }

  function updateSourcingItem(index: number, value: string) {
    setData((prev) => ({
      ...prev,
      active_sourcing: prev.active_sourcing.map((s, i) => (i === index ? value : s)),
    }));
  }

  function removeSourcingItem(index: number) {
    setData((prev) => ({
      ...prev,
      active_sourcing: prev.active_sourcing.filter((_, i) => i !== index),
    }));
  }

  function addSourcingItem() {
    setData((prev) => ({ ...prev, active_sourcing: [...prev.active_sourcing, ""] }));
  }

  // ── Save ──────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    } catch (err) {
      console.error("Card save failed:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left column — editor */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6" style={{ maxWidth: "60%" }}>
        <h1 className="text-lg font-semibold text-white mb-6">Card Editor</h1>

        {/* Panel 1 — Photos */}
        <div className={panelCls}>
          <h2 className="text-sm font-semibold text-white mb-0.5">Photos</h2>
          <p className="text-xs text-slate-500 mb-4">
            Drag to reorder. Click &ldquo;Set position&rdquo; to adjust which part of the photo shows.
          </p>

          {data.photos.map((photo, index) => (
            <div key={photo.src}>
              {/* Photo card */}
              <div
                draggable
                onDragStart={(e) => handlePhotoDragStart(e, index)}
                onDragOver={(e) => handlePhotoDragOver(e, index)}
                onDrop={(e) => handlePhotoDrop(e, index)}
                onDragEnd={() => { setDragPhotoFrom(null); setDragPhotoOver(null); }}
                className={`flex items-center gap-3 p-3 rounded-xl border mb-2 transition-colors ${
                  dragPhotoOver === index && dragPhotoFrom !== index
                    ? "border-orange-500/50 bg-orange-500/5"
                    : "border-white/8 bg-white/3"
                }`}
              >
                <span className="text-slate-600 cursor-grab select-none text-lg leading-none">⋮⋮</span>
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="rounded-lg object-cover shrink-0"
                  style={{
                    width: 60,
                    height: 60,
                    objectPosition: `calc(50% + ${photo.offsetX}px) calc(0% + ${photo.offsetY}px)`,
                  }}
                />
                {/* Alt/filename */}
                <div className="flex-1 min-w-0">
                  <input
                    value={photo.alt}
                    onChange={(e) => updatePhoto(index, { alt: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-300 outline-none border-b border-white/10 focus:border-orange-400 py-0.5"
                    placeholder="Alt text"
                  />
                  <input
                    value={photo.caption}
                    onChange={(e) => updatePhoto(index, { caption: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-500 outline-none border-b border-white/5 focus:border-orange-400 py-0.5 mt-1"
                    placeholder="Caption (optional)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPositioningPhoto(positioningPhoto === index ? null : index)}
                  className={`text-xs px-2 py-1 rounded-lg border transition shrink-0 ${
                    positioningPhoto === index
                      ? "border-orange-500/50 text-orange-400 bg-orange-500/10"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  Set position
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-slate-600 hover:text-red-400 transition text-lg leading-none shrink-0"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>

              {/* Position adjuster — inline when active */}
              {positioningPhoto === index && (
                <div className="mb-3 p-3 bg-slate-900 border border-orange-500/20 rounded-xl">
                  <p className="text-xs text-slate-500 mb-2">
                    Drag the photo to adjust position. Crosshair = crop anchor.
                  </p>
                  <div
                    className="relative overflow-hidden rounded-xl select-none"
                    style={{ width: "100%", maxWidth: 320, height: 220, cursor: "crosshair" }}
                    onMouseDown={(e) => startPositionDrag(e, index)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                        objectPosition: `calc(50% + ${photo.offsetX}px) calc(0% + ${photo.offsetY}px)`,
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                    {/* Crosshair overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)",
                        backgroundSize: "33.33% 33.33%",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-600">
                      X: {Math.round(photo.offsetX)}px &nbsp; Y: {Math.round(photo.offsetY)}px
                    </p>
                    <button
                      type="button"
                      onClick={() => { updatePhoto(index, { offsetX: 0, offsetY: 0 }); }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setPositioningPhoto(null)}
                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-1 w-full border border-dashed border-white/15 text-slate-500 hover:border-orange-500/40 hover:text-orange-400 text-xs py-2.5 rounded-xl transition"
          >
            {uploadingPhoto ? "Uploading…" : "+ Add photo"}
          </button>
        </div>

        {/* Panel 2 — Text Content */}
        <div className={panelCls}>
          <h2 className="text-sm font-semibold text-white mb-4">Text Content</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Name</label>
              <input value={data.name} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input value={data.title} onChange={(e) => setField("title", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input value={data.company} onChange={(e) => setField("company", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input value={data.tagline} onChange={(e) => setField("tagline", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pitch (bio box)</label>
              <textarea
                value={data.pitch}
                onChange={(e) => setField("pitch", e.target.value)}
                rows={4}
                className="w-full bg-transparent border border-white/10 focus:border-orange-400 outline-none text-white text-sm p-2 rounded-lg transition-colors resize-none placeholder-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Panel 3 — Contact Details */}
        <div className={panelCls}>
          <h2 className="text-sm font-semibold text-white mb-4">Contact Details</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input value={data.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={data.phone} onChange={(e) => setField("phone", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp — Buyer number</label>
              <p className="text-[11px] text-slate-600 mb-1">Phone number shown to buyers (include country code)</p>
              <input value={data.whatsapp_buyer} onChange={(e) => setField("whatsapp_buyer", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp — Manufacturer number</label>
              <p className="text-[11px] text-slate-600 mb-1">Phone number shown to manufacturers</p>
              <input value={data.whatsapp_manufacturer} onChange={(e) => setField("whatsapp_manufacturer", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input value={data.website} onChange={(e) => setField("website", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input value={data.linkedin} onChange={(e) => setField("linkedin", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Panel 4 — Active Sourcing */}
        <div className={panelCls}>
          <h2 className="text-sm font-semibold text-white mb-0.5">Currently Sourcing</h2>
          <p className="text-xs text-slate-500 mb-4">Shown at bottom of card. Update weekly. Max 6 items.</p>

          {data.active_sourcing.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleSourcingDragStart(e, index)}
              onDragOver={(e) => handleSourcingDragOver(e, index)}
              onDrop={(e) => handleSourcingDrop(e, index)}
              onDragEnd={() => { setDragSourcingFrom(null); setDragSourcingOver(null); }}
              className={`flex items-center gap-2 mb-2 p-2 rounded-lg border transition-colors ${
                dragSourcingOver === index && dragSourcingFrom !== index
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-white/6 bg-white/2"
              }`}
            >
              <span className="text-slate-600 cursor-grab select-none">⋮⋮</span>
              <input
                value={item}
                onChange={(e) => updateSourcingItem(index, e.target.value)}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600"
                placeholder="e.g. Kosher EVOO 750ml — Chief Rabbinate"
              />
              <button
                type="button"
                onClick={() => removeSourcingItem(index)}
                className="text-slate-600 hover:text-red-400 transition shrink-0"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}

          {data.active_sourcing.length < 6 && (
            <button
              type="button"
              onClick={addSourcingItem}
              className="w-full border border-dashed border-white/15 text-slate-500 hover:border-orange-500/40 hover:text-orange-400 text-xs py-2 rounded-lg transition"
            >
              + Add item
            </button>
          )}
        </div>

        {/* Save button */}
        <div className="sticky bottom-0 bg-slate-950/90 backdrop-blur-sm pt-4 pb-6 border-t border-white/8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            {saving
              ? "Saving…"
              : saveStatus === "saved"
              ? "Saved ✓"
              : saveStatus === "error"
              ? "Save failed — retry"
              : "Save card"}
          </button>
          <p className="text-center text-xs text-slate-600 mt-3">
            Live at{" "}
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition"
            >
              {cardUrl.replace("https://", "")} ↗
            </a>
          </p>
        </div>
      </div>

      {/* Right column — live preview */}
      <div
        className="shrink-0 border-l border-white/8 bg-slate-950 overflow-y-auto"
        style={{ width: "45%", maxWidth: 500 }}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-slate-950/95 backdrop-blur-sm border-b border-white/8">
          <span className="text-sm font-semibold text-white">Live preview</span>
          <span className="text-xs bg-slate-800 text-slate-400 border border-white/10 px-2 py-0.5 rounded-full">
            Mobile view
          </span>
        </div>

        <div className="flex justify-center py-8 px-4">
          <div
            className="overflow-hidden"
            style={{
              width: 320,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              background: "#0f1923",
            }}
          >
            <CardView card={editorToViewData(data)} cardUrl={cardUrl} preview={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
