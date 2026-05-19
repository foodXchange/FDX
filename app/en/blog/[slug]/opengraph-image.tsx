import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// --- Supabase (server/edge) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Helpers ---
function clamp(text: string, max = 120) {
  const t = (text || "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function titleWrap(text: string) {
  // Simple line breaks for long titles (OG needs big readable text)
  const t = clamp(text, 110);
  // Add a soft wrap near 42–52 chars if possible
  if (t.length <= 52) return t;
  const cut = t.lastIndexOf(" ", 52);
  if (cut <= 0) return t;
  return t.slice(0, cut) + "\n" + t.slice(cut + 1);
}

// Pick category from tags/slug (robust even if tags are missing)
function getCategory(input: { slug: string; tags?: string[] | null }) {
  const tags = (input.tags || []).map((x) => x.toLowerCase());
  const slug = (input.slug || "").toLowerCase();

  if (tags.includes("tomato") || tags.includes("paste") || slug.includes("tomato")) return "tomato";
  if (tags.includes("snacks") || tags.includes("snack") || tags.includes("chips") || slug.includes("snack")) return "snacks";
  if (tags.includes("pasta") || slug.includes("pasta")) return "pasta";

  return "default";
}

const THEMES: Record<
  string,
  {
    label: string;
    accent: string;      // orange-ish brand accent per category
    badgeBg: string;
    badgeText: string;
    bgFile: string;      // file under /public/og
  }
> = {
  tomato: {
    label: "Tomato Paste • Retail Cups",
    accent: "#fb7185", // rose
    badgeBg: "rgba(251, 113, 133, 0.18)",
    badgeText: "#fecdd3",
    bgFile: "bg-tomato.png",
  },
  snacks: {
    label: "Snacks • Import Readiness",
    accent: "#f59e0b", // amber
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeText: "#fde68a",
    bgFile: "bg-snacks.png",
  },
  pasta: {
    label: "Premium Pasta • Private Label",
    accent: "#34d399", // emerald
    badgeBg: "rgba(52, 211, 153, 0.18)",
    badgeText: "#bbf7d0",
    bgFile: "bg-pasta.png",
  },
  default: {
    label: "FoodXchange Insights",
    accent: "#f97316", // orange brand
    badgeBg: "rgba(249, 115, 22, 0.18)",
    badgeText: "#fed7aa",
    bgFile: "bg-default.png",
  },
};

// Load a local image from /public using fetch + import.meta.url (edge-safe)
async function loadPublicPng(relativePathFromThisFile: string) {
  const res = await fetch(new URL(relativePathFromThisFile, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load ${relativePathFromThisFile}`);
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

export default async function OpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, slug, tags")
    .eq("slug", slug)
    .eq("lang", "en")
    .eq("published", true)
    .single();

  const title = post?.title || "FoodXchange Insights";
  const excerpt = post?.excerpt || "Practical sourcing insights from active market work.";
  const category = getCategory({ slug, tags: post?.tags });
  const theme = THEMES[category] || THEMES.default;

  // OPTIONAL future override (if you later add these columns)
  // theme/bg could come from DB. For now we use the mapping above.

  // Background image from /public/og/*
  // File location: app/en/blog/[slug]/opengraph-image.tsx
  // Up to root: ../../../../ then public/og/...
  const bgDataUrl = await loadPublicPng(`../../../../public/og/${theme.bgFile}`);

  // Optional logo mark
  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadPublicPng(`../../../../public/og/logo-mark.png`);
  } catch {
    // ok if you don’t have it
  }

  const titleText = titleWrap(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          backgroundColor: "#0b1220",
          overflow: "hidden",
        }}
      >
        {/* Background */}
        <img
          src={bgDataUrl}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
            opacity: 0.95,
          }}
        />

        {/* Dark overlay for contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.75) 55%, rgba(2,6,23,0.25) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px",
            width: "100%",
            height: "100%",
            color: "white",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                width={44}
                height={44}
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
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.75)" }}>
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
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {theme.label}
            </div>
          </div>

          {/* Middle: Title + excerpt */}
          <div style={{ maxWidth: 980 }}>
            <div
              style={{
                whiteSpace: "pre-line",
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -1,
                marginTop: 18,
              }}
            >
              {titleText}
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 26,
                lineHeight: 1.25,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 900,
              }}
            >
              {clamp(excerpt, 140)}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              Real sourcing notes • Israel market • Private label
            </div>

            <div style={{ flex: 1 }} />

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.accent,
              }}
            >
              FoodXchange
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
