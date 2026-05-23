import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { handle, persona, event, referrer, userAgent } =
      (await req.json()) as {
        handle: string;
        persona?: string;
        event: string;
        referrer?: string;
        userAgent?: string;
      };
    if (!handle || !event) return new NextResponse(null, { status: 204 });
    await supabaseAdmin.from("card_views").insert({
      handle,
      persona: persona ?? "default",
      event,
      referrer: referrer ?? null,
      user_agent: userAgent ?? null,
    });
  } catch { /* swallow — tracking must never break the card */ }
  return new NextResponse(null, { status: 204 });
}
