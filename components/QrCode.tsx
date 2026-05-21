"use client";
import { useEffect, useRef, useState } from "react";

type QRLib = {
  toDataURL: (text: string, opts?: Record<string, unknown>) => Promise<string>;
};

interface Props {
  url: string;
  size?: number;
  onRendered?: () => void;
}

export function QrCode({ url, size = 180, onRendered }: Props) {
  const [dataUrl, setDataUrl] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QRCode = require("qrcode") as QRLib;
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((d: string) => {
        if (cancelled) return;
        setDataUrl(d);
        if (!fired.current) {
          fired.current = true;
          onRendered?.();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, size, onRendered]);

  if (!dataUrl) {
    return (
      <div
        className="rounded-2xl bg-slate-800 animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Scan to open this contact card"
      width={size}
      height={size}
      className="rounded-2xl"
    />
  );
}
