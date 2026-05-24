import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PortfolioPayload = {
  title?: string;
  slug?: string;
  category?: string | null;
  summary?: string | null;
  certifications?: string[];
  formats?: string[];
  tags?: string[];
  priority?: number;
  private_label?: boolean;
  markets?: string[];
  countries?: string[];
  content?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  let body: PortfolioPayload;
  try {
    body = await req.json() as PortfolioPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.slug?.trim()) {
    return NextResponse.json({ error: "title and slug are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("portfolio_items")
    .insert({
      title: body.title.trim(),
      slug: body.slug.trim(),
      category: body.category ?? null,
      summary: body.summary ?? null,
      certifications: body.certifications ?? [],
      formats: body.formats ?? [],
      tags: body.tags ?? [],
      priority: body.priority ?? 5,
      private_label: body.private_label ?? false,
      markets: body.markets ?? [],
      countries: body.countries ?? [],
      content: body.content ?? {},
      published: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Portfolio create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
