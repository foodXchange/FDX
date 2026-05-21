import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Israeli Food Import Guide | FoodXchange";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            color: "#ea580c",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          FREE RESOURCE
        </div>
        <div
          style={{
            color: "white",
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          Israeli Food Import Guide
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: 28,
            marginTop: 32,
          }}
        >
          FoodXchange · fdx.trading
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
