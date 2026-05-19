import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Supabase (server/edge)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- helpers ----------
function clamp(text: string, max = 140) {
  const t = (text || "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function wrapTitle(text: string) {
  const t = clamp(text, 110);
  if (t.length <= 56) return t;
  const cut = t.lastIndexOf(" ", 56);
  if (cut <= 0) return t;
  return t.slice(0, cut) + "\n" + t.slice(cut + 1);
}

async function loadPublicPng(relativePathFromThisFile: string) {
  const res = await fetch(new URL(relativePathFromThisFile, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load ${relativePathFromThisFile}`);
  const arrayBuffer = await res.arrayBuffer();
  // Edge-safe base64
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

type Theme = {
  label: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  bgFile: string; // under /public/og
};

const THEMES: Record<string, Theme> = {
  tomato: {
    label: "Tomato • Packaging",
    accent: "#fb7185",
    badgeBg: "rgba(251,113,133,0.18)",
    badgeText: "#fecdd3",
    bgFile: "bg-tomato.png",
  },
  snacks: {
    label: "Snacks • Import",
    accent: "#f59e0b",
    badgeBg: "rgba(245,158,11,0.18)",
    badgeText: "#fde68a",
    bgFile: "bg-snacks.png",
  },
  pasta: {
    label: "Pasta • Private Label",
    accent: "#34d399",
    badgeBg: "rgba(52,211,153,0.18)",
    badgeText: "#bbf7d0",
    bgFile: "bg-pasta.png",
  },
  default: {
    label: "Market Notes",
    accent: "#f97316",
    badgeBg: "rgba(249,115,22,0.18)",
    badgeText: "#fed7aa",
    bgFile: "bg-default.png",
  },
};

// Decide theme from DB category or slug keywords
function chooseTheme(category?: string | null, slug?: string) {
  const c = (category || "").toLowerCase().trim();
  const s = (slug || "").toLowerCase();

  if (THEMES[c]) return THEMES[c];
  if (s.includes("tomato")) return THEMES.tomato;
  if (s.includes("snack") || s.includes("chips")) return THEMES.snacks;
  if (s.includes("pasta")) return THEMES.pasta;

  return THEMES.default;
}

export default async function OpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const { data: issue } = await supabase
    .from("newsletter_issues")
    .select("title, excerpt, slug, category")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  const title = issue?.title || "FoodXchange Market Notes";
  const excerpt =
    issue?.excerpt ||
    "Short sourcing insights from ongoing activity — focused, practical, real.";

  const theme = chooseTheme(issue?.category, slug);

  // Load background + optional logo from /public
  // File lives at: app/en/newsletter/[slug]/opengraph-image.tsx
  const bgDataUrl = await loadPublicPng(
    `../../../../public/og/${theme.bgFile}`
  );

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadPublicPng(`../../../../public/og/logo-mark.png`);
  } catch {
    // ok if you don't have it yet
  }

  const titleText = wrapTitle(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0b1220",
        }}
      >
        {/* Background image */}
        <img
          src={bgDataUrl}
          width="1200"
          height="630"
          style={{
            position: "absolute",
            inset: 0,
            objectFit: "cover",
          }}
        />

        {/* Contrast overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.78) 55%, rgba(2,6,23,0.30) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
            color: "white",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                width="44"
                height="44"
                style={{ borderRadius: 10 }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.78)" }}>
                FoodXchange
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
                fdx.trading
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Category badge */}
            <div
              style={{
                fontSize: 16,
                padding: "10px 14px",
                borderRadius: 999,
                background: theme.badgeBg,
                color: theme.badgeText,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {theme.label}
            </div>
          </div>

          <div
            style={{
              marginTop: 42,
              fontSize: 60,
              lineHeight: 1.02,
              fontWeight: 800,
              whiteSpace: "pre-wrap",
            }}
          >
            {titleText}
          </div>

          <div
            style={{
              marginTop: 26,
              fontSize: 28,
              maxWidth: 760,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            {excerpt}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

