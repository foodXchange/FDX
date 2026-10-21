import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (!sessionCookie || !(await verifySession(sessionCookie))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim().toLowerCase();
    const categoryId = searchParams.get("categoryId") ?? "";

    const [{ data: categories }, { data: articles }] = await Promise.all([
      supabaseAdmin
        .from("kb_categories")
        .select("id, slug, title, description, display_order, is_public")
        .order("display_order"),
      supabaseAdmin
        .from("kb_articles")
        .select("id, slug, title, content_text, category_id, status, is_public, display_order, updated_at")
        .order("display_order"),
    ]);

    const catMap = new Map((categories ?? []).map((c) => [c.id, c]));

    let filtered = articles ?? [];
    if (categoryId && categoryId !== "all") {
      filtered = filtered.filter((a) => a.category_id === categoryId);
    }

    if (query) {
      filtered = filtered.filter((a) => {
        const cat = catMap.get(a.category_id);
        const titleMatch = (a.title ?? "").toLowerCase().includes(query);
        const textMatch = (a.content_text ?? "").toLowerCase().includes(query);
        const catMatch = (cat?.title ?? "").toLowerCase().includes(query);
        return titleMatch || textMatch || catMatch;
      });
    }

    const results = filtered.map((a) => {
      const cat = catMap.get(a.category_id);
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        categoryTitle: cat?.title ?? "General",
        categorySlug: cat?.slug ?? "general",
        isPublic: a.is_public,
        snippet: (a.content_text ?? "").slice(0, 240).trim(),
        updatedAt: a.updated_at,
      };
    });

    return NextResponse.json({
      categories: categories ?? [],
      articles: results,
      totalCount: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to search knowledge base." },
      { status: 500 }
    );
  }
}
