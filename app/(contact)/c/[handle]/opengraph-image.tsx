import { ImageResponse } from "next/og";
import { getCard } from "@/lib/contactCards";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const card = getCard(handle);
  const initials = card ? card.firstName[0] + card.lastName[0] : "?";
  const name = card?.name ?? "Contact";
  const title = card?.title ?? "";
  const company = card?.company ?? "FoodXchange";
  const tagline = card?.tagline ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          padding: "64px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* FoodXchange brand — top right */}
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#f97316",
            }}
          />
          <span
            style={{
              color: "#f97316",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            FoodXchange
          </span>
        </div>

        {/* Main content row */}
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          {/* Avatar */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "white", fontSize: 56, fontWeight: 900 }}>
              {initials}
            </span>
          </div>

          {/* Name / title / company */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              style={{
                color: "white",
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {name}
            </span>
            <span style={{ color: "#f97316", fontSize: 26, fontWeight: 600 }}>
              {title}
            </span>
            <span style={{ color: "#94a3b8", fontSize: 22 }}>{company}</span>
          </div>
        </div>

        {/* Tagline */}
        {tagline && (
          <div
            style={{
              marginTop: 40,
              borderTop: "1px solid #334155",
              paddingTop: 32,
            }}
          >
            <span style={{ color: "#64748b", fontSize: 20, lineHeight: 1.5 }}>
              {tagline}
            </span>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
