"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";

function AdminLocaleSwitcherInner() {
  const [locale, setLocale] = useState<"en" | "he">("en");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLang = sp.get("lang") || sp.get("locale");
      if (urlLang === "he" || urlLang === "en") {
        setLocale(urlLang);
        return;
      }

      try {
        const saved = localStorage.getItem("fdx_admin_locale");
        if (saved === "he" || saved === "en") {
          setLocale(saved);
          return;
        }
      } catch {
        // ignore
      }
    }
  }, [pathname]);

  // Listen to external admin_locale_change events
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<"en" | "he">;
      if (customEvent.detail === "en" || customEvent.detail === "he") {
        setLocale(customEvent.detail);
      }
    };
    window.addEventListener("admin_locale_change", handleEvent);
    return () => window.removeEventListener("admin_locale_change", handleEvent);
  }, []);

  const handleSwitch = (newLocale: "en" | "he") => {
    setLocale(newLocale);
    try {
      localStorage.setItem("fdx_admin_locale", newLocale);
      document.cookie = `fdx_admin_locale=${newLocale}; path=/; max-age=31536000`;
      window.dispatchEvent(new CustomEvent("admin_locale_change", { detail: newLocale }));

      if (typeof window !== "undefined" && pathname) {
        const params = new URLSearchParams(window.location.search);
        params.set("lang", newLocale);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="inline-flex items-center bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold shadow-2xs transition"
      title="Switch Admin Language (English / עברית)"
    >
      <button
        type="button"
        onClick={() => handleSwitch("en")}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px] ${
          locale === "en"
            ? "bg-white text-slate-900 shadow-2xs font-bold"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => handleSwitch("he")}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px] ${
          locale === "he"
            ? "bg-white text-slate-900 shadow-2xs font-bold"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <span>🇮🇱</span>
        <span>עב</span>
      </button>
    </div>
  );
}

export default function AdminLocaleSwitcher() {
  return (
    <Suspense fallback={null}>
      <AdminLocaleSwitcherInner />
    </Suspense>
  );
}
