"use client";

import { useRef, useEffect } from "react";

interface Props {
  token: string;
  productId: string;
  children: React.ReactNode;
}

export default function ProposalProductView({ token, productId, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || tracked.current) return;

    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            if (!tracked.current) {
              tracked.current = true;
              fetch("/api/proposals/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  event_type: "product_view",
                  product_id: productId,
                }),
              }).catch(() => {});
            }
          }, 1000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [token, productId]);

  return <div ref={ref}>{children}</div>;
}
