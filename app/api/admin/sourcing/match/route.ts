import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runMatch } from "@/lib/matching/runMatch";

const Schema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { requestId } = parsed.data;

  const { data: request, error: fetchError } = await supabaseAdmin
    .from("sourcing_requests")
    .select("product_name, message, category, target_market, private_label")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const text = [request.product_name, request.message, request.category]
    .filter(Boolean)
    .join(" ");

  if (!text.trim()) {
    return Response.json({ ok: true, matches: [] });
  }

  const matchOutput = await runMatch({
    text,
    market: (request.target_market as string | null | undefined) ?? undefined,
    privateLabel: (request.private_label as boolean | null | undefined) ?? undefined,
    limit: 6,
  });

  const matchedSlugs = matchOutput.results.map((r) => r.slug);

  await supabaseAdmin
    .from("sourcing_requests")
    .update({ matched_slugs: matchedSlugs })
    .eq("id", requestId);

  return Response.json({
    ok: true,
    matches: matchOutput.results.map((r) => ({
      title: r.title,
      slug: r.slug,
      score: r.score,
      hero_image: r.hero_image,
      category: r.category,
    })),
  });
}
