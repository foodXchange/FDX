"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const HIDDEN_ON = ["/sourcing", "/contact", "/buyers", "/start", "/signup"];

export default function FloatingSourcingButton() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 5000);

    function handleScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable > 0.4) {
        setVisible(true);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  if (HIDDEN_ON.some((path) => pathname.includes(path))) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-40 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={() => router.push("/en/start")}
        className="text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
        style={{
          background: "#E8632A",
          boxShadow: "0 4px 20px rgba(232,99,42,0.35)",
        }}
      >
        <span>🔍</span>
        <span>Get matched</span>
      </button>
    </div>
  );
}
