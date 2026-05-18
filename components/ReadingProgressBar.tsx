"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar({
  targetId = "article",
  color = "#f97316", // orange-500
  height = 3,
}: {
  targetId?: string;
  color?: string;
  height?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function calc() {
      const el = document.getElementById(targetId);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const elTop = rect.top + scrollTop;
      const elHeight = el.offsetHeight;

      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + window.innerHeight;

      // progress starts when top of article enters viewport
      const start = elTop;
      // progress ends when bottom of article reaches top of viewport
      const end = elTop + elHeight - window.innerHeight;

      const raw = (viewportTop - start) / (end - start);
      const clamped = Math.max(0, Math.min(1, raw));

      setProgress(isFinite(clamped) ? clamped : 0);
    }

    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [targetId]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-transparent"
      aria-hidden="true"
    >
      <div
        style={{
          height,
          width: `${progress * 100}%`,
          background: color,
          transition: "width 120ms linear",
        }}
      />
    </div>
  );
}
