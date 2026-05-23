"use client";

import { useEffect, useState } from "react";

export default function ManufacturerStickyCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("manufacturer-intake");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function scrollToForm() {
    document.getElementById("manufacturer-intake")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!visible) return null;

  return (
    <div className="hidden lg:block fixed right-6 bottom-28 z-40 w-52">
      <div className="dark-card-elevated rounded-2xl shadow-xl p-4">
        <p className="text-xs text-slate-500 mb-1">Ready to apply?</p>
        <p className="text-sm font-semibold text-dark-text-primary mb-3 leading-snug">
          Submit your product line
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          Apply now →
        </button>
      </div>
    </div>
  );
}
