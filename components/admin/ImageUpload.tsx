'use client';
import { useRef, useState } from "react";
import Image from "next/image";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  bucket = "portfolio",
  folder = "hero",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large — max 5MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      formData.append("folder", folder);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json() as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadError(json.error ?? "Upload failed — please try again");
        return;
      }
      onChange(json.url);
    } catch {
      setUploadError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {value ? (
        <div>
          <div className="relative w-full h-48 rounded-xl overflow-hidden">
            <Image
              src={value}
              alt="Hero image preview"
              fill
              className="object-cover"
              sizes="100vw"
            />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <span className="text-sm text-slate-600 font-medium">Uploading...</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition relative"
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <span className="text-sm text-slate-600 font-medium">Uploading...</span>
          ) : (
            <>
              <span className="text-3xl mb-2">☁️</span>
              <p className="text-sm text-slate-600 font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP up to 5MB</p>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 mt-2">{uploadError}</p>
      )}
    </div>
  );
}
