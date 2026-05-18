"use client";

import { useEffect, useMemo, useState } from "react";

type TocItem = { id: string; text: string };

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function StickyToc({
  targetId = "article",
  headingSelector = "h2",
  title = "On this page",
}: {
  targetId?: string;
  headingSelector?: string; // default: h2
  title?: string;
}) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Build TOC from headings inside target element
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;

    const headings = Array.from(root.querySelectorAll(headingSelector)) as HTMLElement[];
    const toc: TocItem[] = [];

    headings.forEach((h) => {
      const text = (h.textContent || "").trim();
      if (!text) return;

      // Ensure heading has an id (stable)
      if (!h.id) h.id = slugify(text);

      toc.push({ id: h.id, text });
    });

    setItems(toc);
    if (toc.length && !activeId) setActiveId(toc[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, headingSelector]);

  // Track active heading as you scroll
  useEffect(() => {
    if (!items.length) return;

    const headings = items
      .map((it) => document.getElementById(it.id))
      .filter(Boolean) as HTMLElement[];

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Prefer the entry that is intersecting and nearest to top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        if (visible.length) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      {
        root: null,
        // Trigger a little before the heading hits top
        rootMargin: "-15% 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  const hasItems = useMemo(() => items.length >= 2, [items.length]); // show only if useful

  if (!hasItems) return null;

  return (
    <aside className="hidden lg:block sticky top-28 self-start w-64">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {title}
        </p>

        <nav className="space-y-2">
          {items.map((it) => {
            const isActive = it.id === activeId;
            return (
              <a
                key={it.id}
                href={`#${it.id}`}
                className={[
                  "block text-sm leading-snug transition",
                  "hover:text-slate-900",
                  isActive ? "text-orange-600 font-semibold" : "text-slate-600",
                ].join(" ")}
              >
                {it.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}