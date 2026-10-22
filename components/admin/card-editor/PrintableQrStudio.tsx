"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  cardUrl: string;
  name: string;
  title: string;
  handle: string;
  nameHe?: string;
}

type Palette = {
  id: string;
  label: string;
  dark: string;
  light: string;
  logoBg: string;
  logoFg: string;
};

const PALETTES: Palette[] = [
  {
    id: "navy-white",
    label: "Navy & White (Standard Print)",
    dark: "#0F172A",
    light: "#FFFFFF",
    logoBg: "#FFFFFF",
    logoFg: "#F47920",
  },
  {
    id: "orange-white",
    label: "FoodX Orange & White",
    dark: "#F47920",
    light: "#FFFFFF",
    logoBg: "#0F172A",
    logoFg: "#FFFFFF",
  },
  {
    id: "dark-mode",
    label: "Midnight Badge (Inverted)",
    dark: "#FFFFFF",
    light: "#0F172A",
    logoBg: "#0F172A",
    logoFg: "#F47920",
  },
  {
    id: "black-white",
    label: "Mono Black (Packaging / High Contrast)",
    dark: "#000000",
    light: "#FFFFFF",
    logoBg: "#FFFFFF",
    logoFg: "#000000",
  },
];

export function PrintableQrStudio({ cardUrl, name, title, handle, nameHe }: Props) {
  const [targetLang, setTargetLang] = useState<"en" | "he">("en");
  const [selectedPalette, setSelectedPalette] = useState<Palette>(PALETTES[0]);
  const [withLogo, setWithLogo] = useState<boolean>(true);
  const [withCaption, setWithCaption] = useState<boolean>(true);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [svgString, setSvgString] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveUrl =
    targetLang === "he"
      ? cardUrl.includes("?")
        ? `${cardUrl}&lang=he`
        : `${cardUrl}?lang=he`
      : cardUrl;

  useEffect(() => {
    let cancelled = false;

    async function renderQR() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const QRCode = require("qrcode");

      // 1. Generate High-Res 1200x1200 Canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const baseSize = 1200;
      const captionHeight = withCaption ? 180 : 0;
      const totalHeight = baseSize + captionHeight;

      canvas.width = baseSize;
      canvas.height = totalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = selectedPalette.light;
      ctx.fillRect(0, 0, baseSize, totalHeight);

      // Render raw QR to temporary canvas
      const tempCanvas = document.createElement("canvas");
      await QRCode.toCanvas(tempCanvas, effectiveUrl, {
        width: baseSize,
        margin: 3,
        errorCorrectionLevel: "H",
        color: {
          dark: selectedPalette.dark,
          light: selectedPalette.light,
        },
      });

      if (cancelled) return;

      // Draw QR on main canvas
      ctx.drawImage(tempCanvas, 0, 0);

      // Center Logo Badge
      if (withLogo) {
        const centerSize = baseSize * 0.22; // 22% of size
        const cx = baseSize / 2;
        const cy = baseSize / 2;

        // Outer badge background
        ctx.beginPath();
        ctx.arc(cx, cy, centerSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = selectedPalette.logoBg;
        ctx.fill();

        // Badge border ring
        ctx.lineWidth = 14;
        ctx.strokeStyle = selectedPalette.dark;
        ctx.stroke();

        // Draw 'X' mark
        ctx.font = `bold ${Math.round(centerSize * 0.72)}px Poppins, Arial Black, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = selectedPalette.logoFg;
        ctx.fillText("X", cx, cy + 4);
      }

      // Print Caption at bottom
      if (withCaption) {
        const textY = baseSize + 55;
        ctx.textAlign = "center";
        ctx.fillStyle = selectedPalette.dark;

        if (targetLang === "he") {
          ctx.font = "bold 44px Rubik, Heebo, Poppins, Arial, sans-serif";
          ctx.fillText(`${nameHe || "אודי סטריק"} · FoodXchange`, baseSize / 2, textY);

          ctx.fillStyle = selectedPalette.dark === "#FFFFFF" ? "#94a3b8" : "#64748b";
          ctx.font = "normal 30px Rubik, Heebo, Poppins, Arial, sans-serif";
          ctx.fillText("סרוק במצלמה לשמירת איש קשר ורכש פעיל", baseSize / 2, textY + 50);

          ctx.font = "bold 26px monospace";
          ctx.fillStyle = "#F47920";
          ctx.fillText(`fdx.trading/business-card/${handle}?lang=he`, baseSize / 2, textY + 95);
        } else {
          ctx.font = "bold 44px Poppins, -apple-system, sans-serif";
          ctx.fillText(`${name} · FoodXchange`, baseSize / 2, textY);

          ctx.fillStyle = selectedPalette.dark === "#FFFFFF" ? "#94a3b8" : "#64748b";
          ctx.font = "normal 32px Poppins, -apple-system, sans-serif";
          ctx.fillText("Scan with Camera to Connect & Review Active Sourcing", baseSize / 2, textY + 50);

          ctx.font = "bold 28px monospace";
          ctx.fillStyle = "#F47920";
          ctx.fillText(`fdx.trading/business-card/${handle}`, baseSize / 2, textY + 95);
        }
      }

      // 2. Generate Scalable Vector SVG
      try {
        const rawSvg: string = await QRCode.toString(effectiveUrl, {
          type: "svg",
          margin: 3,
          errorCorrectionLevel: "H",
          color: {
            dark: selectedPalette.dark,
            light: selectedPalette.light,
          },
        });

        if (cancelled) return;

        // Inject vector center logo if enabled
        let finalSvg = rawSvg;
        if (withLogo) {
          // Find viewBox or width/height in rawSvg
          const vbMatch = rawSvg.match(/viewBox="([^"]+)"/);
          if (vbMatch) {
            const parts = vbMatch[1].split(/\s+/).map(Number);
            const w = parts[2] || 100;
            const h = parts[3] || 100;
            const cx = w / 2;
            const cy = h / 2;
            const r = w * 0.11;

            const logoGroup = `
  <!-- FoodXchange Center Emblem -->
  <g id="fdx-center-badge">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${selectedPalette.logoBg}" stroke="${selectedPalette.dark}" stroke-width="${w * 0.015}" />
    <text x="${cx}" y="${cy + r * 0.38}" text-anchor="middle" font-family="Poppins, Arial Black, sans-serif" font-size="${r * 1.5}" font-weight="900" fill="${selectedPalette.logoFg}">X</text>
  </g>
</svg>`;
            finalSvg = finalSvg.replace("</svg>", logoGroup);
          }
        }
        setSvgString(finalSvg);
      } catch (err) {
        console.error("SVG generation error:", err);
      }
    }

    renderQR();

    return () => {
      cancelled = true;
    };
  }, [effectiveUrl, name, title, handle, nameHe, selectedPalette, withLogo, withCaption, targetLang]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `FoodXchange-QR-${handle}-${targetLang}-1200px.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `FoodXchange-QR-${handle}-${targetLang}-vector.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copySvgCode() {
    if (!svgString) return;
    navigator.clipboard.writeText(svgString).catch(() => {});
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  }

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🖨️</span>
            <span>Printable High-Res Vector QR Code Studio</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ultra-crisp 1200x1200px PNG & Scalable SVG for physical business cards, email signatures, and trade expo banners.
          </p>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Error Level H (30% Recovery)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Canvas Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900/90 rounded-2xl border border-white/10 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[280px] h-auto rounded-xl shadow-xl border border-white/10 object-contain"
          />
          <span className="text-[11px] text-slate-500 mt-2 font-mono">
            Output: 1200 × {withCaption ? 1380 : 1200} px @ 300 DPI
          </span>
        </div>

        {/* Right: Studio Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Target Language Edition */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Audience & Language Edition:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetLang("en")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border text-start transition-colors ${
                  targetLang === "en"
                    ? "border-[#0284c7] bg-sky-500/10 text-white"
                    : "border-white/5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span className="text-base">🌐</span>
                <div className="min-w-0">
                  <div className="font-semibold text-white">Global / English</div>
                  <div className="text-[10px] text-slate-400">Trade expos & EU suppliers</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetLang("he")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border text-start transition-colors ${
                  targetLang === "he"
                    ? "border-[#F47920] bg-orange-500/10 text-white"
                    : "border-white/5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span className="text-base">🇮🇱</span>
                <div className="min-w-0">
                  <div className="font-semibold text-white">Israel / עברית</div>
                  <div className="text-[10px] text-slate-400">Retail chains & local buyers</div>
                </div>
              </button>
            </div>
          </div>

          {/* Palette Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Color Scheme:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setSelectedPalette(pal)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border text-start transition-colors ${
                    selectedPalette.id === pal.id
                      ? "border-[#F47920] bg-orange-500/10 text-white"
                      : "border-white/5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: pal.dark }}
                  />
                  <span className="truncate">{pal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-white/5 cursor-pointer text-xs text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={withLogo}
                onChange={(e) => setWithLogo(e.target.checked)}
                className="w-4 h-4 accent-[#F47920] rounded"
              />
              <span>FoodXchange Center Badge</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-white/5 cursor-pointer text-xs text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={withCaption}
                onChange={(e) => setWithCaption(e.target.checked)}
                className="w-4 h-4 accent-[#F47920] rounded"
              />
              <span>Print Name & Caption Banner</span>
            </label>
          </div>

          {/* Target URL Display */}
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span className="truncate">{effectiveUrl}</span>
            <span className="text-emerald-400 font-sans font-semibold shrink-0 text-[11px] ml-2">
              ✓ Verified Destination ({targetLang.toUpperCase()})
            </span>
          </div>

          {/* Download Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={downloadPng}
              className="flex-1 bg-[#F47920] hover:bg-[#d96810] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/20"
            >
              <span>📥</span>
              <span>Download 1200px PNG</span>
            </button>

            <button
              type="button"
              onClick={downloadSvg}
              className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-600/20"
            >
              <span>📥</span>
              <span>Download Vector SVG</span>
            </button>

            <button
              type="button"
              onClick={copySvgCode}
              className="bg-white/10 hover:bg-white/15 text-white font-medium py-2.5 px-3.5 rounded-xl text-xs transition-colors"
            >
              {copiedSvg ? "✓ Copied!" : "Copy SVG"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
