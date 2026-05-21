// TODO: Add per-article OG image.
// No existing [slug]/opengraph-image.tsx pattern was found in this project.
// When ready, implement using Next.js ImageResponse with generateImageMetadata:
//
// import { ImageResponse } from "next/og";
// import { supabase } from "@/lib/supabase";
// export const runtime = "edge";
// export const size = { width: 1200, height: 630 };
// export const contentType = "image/png";
//
// export default async function Image({ params }: { params: { slug: string } }) {
//   const { data } = await supabase
//     .from("import_guide_articles")
//     .select("title, category")
//     .eq("slug", params.slug)
//     .single();
//
//   return new ImageResponse(
//     <div style={{ background: "#0f172a", width: "100%", height: "100%",
//       display: "flex", flexDirection: "column", padding: 80,
//       justifyContent: "flex-end" }}>
//       <div style={{ color: "#ea580c", fontSize: 18, fontWeight: 700,
//         marginBottom: 16 }}>
//         {data?.category?.toUpperCase()}
//       </div>
//       <div style={{ color: "white", fontSize: 52, fontWeight: 700,
//         lineHeight: 1.2, maxWidth: 900 }}>
//         {data?.title}
//       </div>
//       <div style={{ color: "#64748b", fontSize: 22, marginTop: 32 }}>
//         FoodXchange Import Guide · fdx.trading
//       </div>
//     </div>
//   );
// }
export {};
