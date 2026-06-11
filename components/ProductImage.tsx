"use client";

import { useEffect, useState } from "react";

// Soft tints paired with a matching foreground — same category always
// resolves to the same entry via a simple string hash.
const PALETTE = [
  { bg: "#fdf0e9", fg: "#e85d26" }, // brand orange
  { bg: "#eaf2fb", fg: "#3b82f6" }, // blue
  { bg: "#eafaf3", fg: "#10b981" }, // green
  { bg: "#f3eefb", fg: "#8b5cf6" }, // purple
  { bg: "#fdeef0", fg: "#f43f5e" }, // rose
  { bg: "#fdf6e3", fg: "#d97706" }, // amber
  { bg: "#e6f7f6", fg: "#0d9488" }, // teal
  { bg: "#eef0fd", fg: "#6366f1" }, // indigo
];

function paletteForCategory(categoryName: string | null): { bg: string; fg: string } {
  const key = (categoryName ?? "").trim().toLowerCase();
  if (!key) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function categoryLabel(categoryName: string | null): string {
  if (!categoryName) return "";
  const firstWord = categoryName.trim().split(/\s+/)[0] ?? "";
  if (firstWord.length <= 8) return firstWord;
  return `${firstWord.slice(0, 7)}…`;
}

// Generic open-box / package icon, drawn in a 24×24 grid and scaled to fit.
const ICON_PATHS = [
  "M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z",
  "M3 7.5v9l9 4.5 9-4.5v-9",
  "M12 12v9",
];

function PlaceholderTile({
  size,
  categoryName,
  productName,
}: {
  size: number;
  categoryName: string | null;
  productName: string;
}) {
  const { bg, fg } = paletteForCategory(categoryName);
  const showLabel = size >= 48;
  const label = categoryLabel(categoryName);

  const iconSize = size * (showLabel ? 0.4 : 0.5);
  const scale = iconSize / 24;
  const tx = (size - iconSize) / 2;
  const ty = showLabel ? size * 0.14 : tx;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={categoryName || productName}
    >
      <rect width={size} height={size} rx="8" fill={bg} />
      <g
        transform={`translate(${tx} ${ty}) scale(${scale})`}
        stroke={fg}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {showLabel && label && (
        <text
          x={size / 2}
          y={size - 8}
          textAnchor="middle"
          fontSize={Math.max(8, size * 0.13)}
          fontWeight={600}
          fill={fg}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

interface ProductImageProps {
  imageUrl: string | null;
  categoryName: string | null;
  productName: string;
  size: number;
}

export default function ProductImage({ imageUrl, categoryName, productName, size }: ProductImageProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={productName}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-lg object-cover border border-gray-200 shrink-0"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return <PlaceholderTile size={size} categoryName={categoryName} productName={productName} />;
}
