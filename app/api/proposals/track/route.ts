import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const Schema = z.object({
  token: z.string().min(1).max(20),
  event_type: z.enum(["page_view", "product_view", "request_click", "whatsapp_click"]),
  product_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return Response.json({ ok: true });

    const { token, event_type, product_id } = parsed.data;

    const { data: proposal } = await supabaseAdmin
      .from("proposals")
      .select("id, view_count, viewed_product_ids")
      .eq("token", token)
      .eq("status", "active")
      .single();

    if (!proposal) return Response.json({ ok: true });

    // Insert view event (fire-and-forget)
    Promise.resolve(
      supabaseAdmin.from("proposal_views").insert({
        proposal_id: proposal.id,
        product_id: product_id ?? null,
        event_type,
        user_agent: req.headers.get("user-agent") ?? null,
      })
    ).catch(console.error);

    // Update proposal stats (fire-and-forget)
    if (event_type === "page_view") {
      Promise.resolve(
        supabaseAdmin
          .from("proposals")
          .update({
            view_count: proposal.view_count + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq("id", proposal.id)
      ).catch(console.error);
    } else if (event_type === "product_view" && product_id) {
      const existing = (proposal.viewed_product_ids as string[]) ?? [];
      const newViewed = [...new Set([...existing, product_id])];
      Promise.resolve(
        supabaseAdmin
          .from("proposals")
          .update({ viewed_product_ids: newViewed })
          .eq("id", proposal.id)
      ).catch(console.error);
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
