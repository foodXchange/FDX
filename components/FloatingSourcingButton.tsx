"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SourcingWidget from "@/components/SourcingWidget";

export default function FloatingSourcingButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (
    pathname.includes("/sourcing") ||
    pathname.includes("/contact") ||
    pathname.includes("/buyers")
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-lg shadow-orange-500/30 flex items-center gap-2 transition active:scale-95"
      >
        🔍 Find a product
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900 transition z-10"
              aria-label="Close"
            >
              ×
            </button>
            <SourcingWidget source="floating" onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
