"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ImageUpload({
  onUpload,
}: {
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const filePath = `newsletter/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("content-images")
      .upload(filePath, file);

    if (error) {
      console.error(error);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("content-images")
      .getPublicUrl(filePath);

    onUpload(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} />

      {uploading && <p>Uploading...</p>}
    </div>
  );
}