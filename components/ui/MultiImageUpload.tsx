"use client";

import { useEffect, useRef, useState } from "react";

export interface UploadedImage {
  id: string;
  url: string;
  preview: string;
  source: "file" | "url";
  uploading: boolean;
  error: string | null;
}

interface Props {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  bucket?: string;
  exampleTypes?: { label: string; color: string }[];
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.82;

const DEFAULT_EXAMPLES = [
  { label: "Product shot", color: "bg-emerald-100" },
  { label: "Barcode/label", color: "bg-blue-100" },
  { label: "Supermarket shelf", color: "bg-amber-100" },
  { label: "Packaging detail", color: "bg-rose-100" },
];

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

async function uploadFile(file: File, bucket: string): Promise<string> {
  let blob: Blob = file;
  if (file.size > COMPRESS_THRESHOLD) {
    try { blob = await compressImage(file); } catch { /* upload original if compression fails */ }
  }
  const fd = new FormData();
  fd.append("file", blob, file.name);
  const res = await fetch(`/api/sourcing/upload-image?bucket=${bucket}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Upload failed");
  return data.url!;
}

export default function MultiImageUpload({
  value,
  onChange,
  maxImages = 5,
  bucket = "requests",
  exampleTypes = DEFAULT_EXAMPLES,
}: Props) {
  const [images, setImages] = useState<UploadedImage[]>(value);
  const imagesRef = useRef<UploadedImage[]>(images);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    imagesRef.current = images;
    onChange(images);
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value.length === 0 && images.length > 0) {
      setImages([]);
    }
  }, [value.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const canAdd = images.length < maxImages;

  function updateImage(id: string, patch: Partial<UploadedImage>) {
    setImages(imagesRef.current.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const slots = maxImages - imagesRef.current.length;
    if (slots <= 0) return;
    const toAdd = arr.slice(0, slots);

    const newImages: UploadedImage[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      url: "",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      source: "file" as const,
      uploading: true,
      error: null,
    }));

    setImages([...imagesRef.current, ...newImages]);

    newImages.forEach((img, idx) => {
      const file = toAdd[idx];
      if (!file.type.startsWith("image/")) {
        updateImage(img.id, { uploading: false, error: "Only image files are supported" });
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        updateImage(img.id, { uploading: false, error: "File too large (max 5 MB)" });
        return;
      }
      uploadFile(file, bucket)
        .then((url) => updateImage(img.id, { url, uploading: false }))
        .catch((err: unknown) =>
          updateImage(img.id, {
            uploading: false,
            error: err instanceof Error ? err.message : "Upload failed",
          })
        );
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!canAdd) return;
    addFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function addUrl() {
    const raw = urlInput.trim();
    if (!raw) return;
    if (!raw.startsWith("http")) {
      setUrlError("Please enter a valid URL starting with http");
      return;
    }
    if (!canAdd) {
      setUrlError(`Maximum ${maxImages} images reached`);
      return;
    }
    setUrlError(null);
    const img: UploadedImage = {
      id: crypto.randomUUID(),
      url: raw,
      preview: raw,
      source: "url",
      uploading: false,
      error: null,
    };
    setImages([...imagesRef.current, img]);
    setUrlInput("");
  }

  function remove(id: string) {
    const img = images.find((m) => m.id === id);
    if (img?.source === "file" && img.preview.startsWith("blob:")) {
      URL.revokeObjectURL(img.preview);
    }
    setImages(imagesRef.current.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-3">
      {images.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragging
              ? "border-orange-400 bg-orange-50"
              : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
          }`}
        >
          <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-slate-700">Drop images here</p>
          <p className="text-xs text-slate-400 mt-1">or click to browse</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              {img.uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : img.error ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <svg className="w-5 h-5 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-400 text-[10px] text-center leading-tight">{img.error}</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.preview}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                />
              )}
              {idx === 0 && !img.uploading && !img.error && (
                <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow text-slate-500 hover:text-red-500 transition-colors"
                aria-label="Remove image"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {canAdd && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-300 transition-colors ${
                dragging ? "border-orange-400 bg-orange-50" : "border-slate-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs mt-1">Add</span>
            </button>
          )}
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-xs text-slate-400 text-center">Maximum {maxImages} images reached</p>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
          placeholder="Or paste an image URL..."
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-slate-300"
          disabled={!canAdd}
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim() || !canAdd}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg disabled:opacity-40 transition"
        >
          Add
        </button>
      </div>
      {urlError && <p className="text-xs text-red-500">{urlError}</p>}

      {exampleTypes.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {exampleTypes.map((ex) => (
            <div key={ex.label} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded ${ex.color} shrink-0`} />
              <span className="text-xs text-slate-400">{ex.label}</span>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
    </div>
  );
}
