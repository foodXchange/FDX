"use client";

import { useState, useEffect } from "react";

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  // ✅ Apply styles to <html>
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;

    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [fontScale, highContrast]);

  function resetSettings() {
    setFontScale(1);
    setHighContrast(false);
  }

  return (
    <div className="fixed bottom-20 right-6 z-50">

      {/* ✅ TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Accessibility options"
        className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center text-lg"
      >
        ♿
      </button>

      {/* ✅ PANEL */}
      {open && (
        <div className="mt-3 w-64 bg-slate-900 text-white rounded-lg p-4 shadow-xl space-y-4 border border-slate-700">

          <h3 className="text-sm font-semibold">
            Accessibility
          </h3>

          {/* FONT SIZE */}
          <div>
            <p className="text-xs mb-1">Text Size</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFontScale(0.9)}
                className="px-2 py-1 bg-slate-800 rounded text-xs"
              >
                A-
              </button>
              <button
                onClick={() => setFontScale(1)}
                className="px-2 py-1 bg-slate-800 rounded text-xs"
              >
                A
              </button>
              <button
                onClick={() => setFontScale(1.2)}
                className="px-2 py-1 bg-slate-800 rounded text-xs"
              >
                A+
              </button>
            </div>
          </div>

          {/* HIGH CONTRAST */}
          <div className="flex items-center justify-between">
            <span className="text-xs">High Contrast</span>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`w-10 h-5 rounded-full transition ${
                highContrast ? "bg-orange-500" : "bg-slate-600"
              }`}
            />
          </div>

          {/* RESET */}
          <button
            onClick={resetSettings}
            className="w-full text-xs mt-2 px-3 py-2 bg-slate-800 rounded hover:bg-slate-700"
          >
            Reset
          </button>

        </div>
      )}
    </div>
  );
}