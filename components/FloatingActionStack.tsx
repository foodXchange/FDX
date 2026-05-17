"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function FloatingActionStack() {
  // WhatsApp
  const phone = "972525222291";
  const message = encodeURIComponent(
    "Hi, I came across FoodXchange and would like to explore potential collaboration."
  );
  const whatsappUrl = useMemo(
    () => `https://wa.me/${phone}?text=${message}`,
    [phone, message]
  );

  // Accessibility state
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Apply accessibility styles
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;

    if (highContrast) document.documentElement.classList.add("high-contrast");
    else document.documentElement.classList.remove("high-contrast");
  }, [fontScale, highContrast]);

  // Close on click outside / ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onMouseDown(e: MouseEvent) {
      if (!open) return;
      const panel = panelRef.current;
      if (panel && !panel.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  function resetAccessibility() {
    setFontScale(1);
    setHighContrast(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Accessibility panel (opens above buttons) */}
      {open && (
        <div
          ref={panelRef}
          className="w-72 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Accessibility</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-white transition"
              aria-label="Close accessibility panel"
            >
              ✕
            </button>
          </div>

          {/* Text size */}
          <div className="mb-4">
            <p className="text-xs text-slate-300 mb-2">Text size</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFontScale(0.95)}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontScale(1)}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontScale(1.15)}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                A+
              </button>
            </div>
          </div>

          {/* High contrast */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-300">High contrast</span>
            <button
              type="button"
              onClick={() => setHighContrast((v) => !v)}
              className={`w-11 h-6 rounded-full transition relative ${
                highContrast ? "bg-orange-500" : "bg-slate-600"
              }`}
              aria-label="Toggle high contrast"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  highContrast ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={resetAccessibility}
            className="w-full px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
          >
            Reset
          </button>

          <p className="mt-3 text-[11px] text-slate-400">
            Tip: Press <span className="font-semibold">ESC</span> to close this panel.
          </p>
        </div>
      )}

      {/* Accessibility button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open accessibility options"
        className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition hover:scale-[1.05] flex items-center justify-center text-lg"
      >
        ♿
      </button>

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition hover:scale-[1.03]"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline font-semibold">WhatsApp</span>
      </a>
    </div>
  );
}
