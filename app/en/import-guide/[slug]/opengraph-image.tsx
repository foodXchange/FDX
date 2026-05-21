import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data } = await supabase
    .from("import_guide_articles")
    .select("title, category")
    .eq("slug", slug)
    .single();

  const title = data?.title ?? "Israeli Food Import Guide";
  const category = data?.category ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          justifyContent: "flex-end",
        }}
      >
        {category && (
          <div
            style={{
              color: "#ea580c",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {category}
          </div>
        )}
        <div
          style={{
            color: "white",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 22,
            marginTop: 32,
          }}
        >
          FoodXchange Import Guide · fdx.trading
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
