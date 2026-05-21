import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runMatch } from "@/lib/matching/runMatch";
import { supabase } from "@/lib/supabase";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
  market: z.string().optional(),
  privateLabel: z.boolean().optional().nullable(),
  limit: z.number().int().min(1).max(10).default(6),
  session_id: z.string().max(100).optional().nullable(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { text, market, privateLabel, limit, session_id } = parsed.data;

  let output;
  try {
    output = await runMatch({ text, market, privateLabel, limit });
  } catch (err) {
    Sentry.captureException(err);
    console.error("runMatch failed:", err);
    return NextResponse.json({ error: "Matching unavailable" }, { status: 500 });
  }

  // Fire-and-forget match_shown event
  void (async () => {
    try {
      await supabase.from("portfolio_match_events").insert({
        event_type: "match_shown",
        query_text: text.slice(0, 2000),
        intent_json: output.intent as Record<string, unknown>,
        shown_slugs: output.results.map((r) => r.slug),
        page_path: req.headers.get("referer") ?? null,
        session_id: session_id ?? null,
      });
    } catch (err) {
      Sentry.captureException(err);
      console.error("match_shown log failed:", err);
    }
  })();

  return NextResponse.json(output);
}
