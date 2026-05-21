import { z } from "zod";
import { supabase } from "@/lib/supabase";

const EventSchema = z.object({
  event_type: z.union([z.literal("match_shown"), z.literal("match_clicked")]),
  query_text: z.string().max(2000).optional().nullable(),
  intent_json: z.record(z.string(), z.unknown()).optional().nullable(),
  shown_slugs: z.array(z.string()).max(20).optional().nullable(),
  clicked_slug: z.string().max(200).optional().nullable(),
  page_path: z.string().max(500).optional().nullable(),
  session_id: z.string().max(100).optional().nullable(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: true }); // silently accept malformed tracking payloads
  }

  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: true }); // silently accept — never error on tracking
  }

  try {
    await supabase.from("portfolio_match_events").insert(parsed.data);
  } catch (err) {
    console.error("Event tracking insert failed:", err);
  }

  return Response.json({ ok: true });
}
