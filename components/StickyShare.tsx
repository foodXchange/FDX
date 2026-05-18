"use client";

import { useEffect, useState } from "react";

export default function StickyShare() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  function copyLink() {
    navigator.clipboard.writeText(url);
    alert("Link copied ✅");
  }

  return (
    <div className="fixed left-6 top-1/3 z-50 hidden md:flex flex-col gap-3">

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-md"
      >
        💬
      </a>

      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-md"
      >
        in
      </a>

      {/* Copy */}
      <button
        onClick={copyLink}
        className="bg-slate-700 hover:bg-slate-800 text-white p-3 rounded-full shadow-md"
      >
        🔗
      </button>

    </div>
  );
}