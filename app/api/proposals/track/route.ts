import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";

const Schema = z.object({
  token: z.string().min(1).max(30),
  event_type: z.enum([
    "page_view",
    "product_view",
    "request_click",
    "whatsapp_click",
  ]),
  product_id: z.string().uuid().optional(),
  buyer_note: z.string().trim().max(1000).optional(),
  request_samples: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return Response.json({ ok: true });

    const { token, event_type, product_id, buyer_note, request_samples } =
      parsed.data;

    const { data: proposal } = await supabaseAdmin
      .from("proposals")
      .select("id, buyer_name, buyer_company, view_count, viewed_product_ids")
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

    // Update proposal stats
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
    } else if (event_type === "request_click" && product_id) {
      // Check if product_id corresponds to a sourcing_matches row
      const { data: match } = await supabaseAdmin
        .from("sourcing_matches")
        .select("id, product_name, company_name, match_breakdown")
        .eq("id", product_id)
        .maybeSingle();

      if (match) {
        const now = new Date().toISOString();
        const prevBd =
          match.match_breakdown && typeof match.match_breakdown === "object"
            ? (match.match_breakdown as Record<string, unknown>)
            : {};

        const noteSummary = [
          request_samples !== false ? "Requested Samples & Final Quote" : "Requested Final Quote",
          buyer_note ? `Note: "${buyer_note}"` : null,
        ]
          .filter(Boolean)
          .join(" — ");

        await supabaseAdmin
          .from("sourcing_matches")
          .update({
            buyer_interest_at: now,
            match_breakdown: {
              ...prevBd,
              buyer_interested: true,
              buyer_interest_at: now,
              buyer_proposal_note: noteSummary,
            },
          })
          .eq("id", match.id);

        await supabaseAdmin.from("match_messages").insert({
          match_id: match.id,
          sender_type: "buyer",
          message: `[Buyer Proposal Selection — ${proposal.buyer_name}${
            proposal.buyer_company ? ` (${proposal.buyer_company})` : ""
          }]\n✓ ${noteSummary}`,
        });

        void createNotification(
          "response",
          `${proposal.buyer_name} selected ${match.product_name ?? "a product"} (${match.company_name ?? "Supplier"}) on Proposal`,
          undefined,
          {
            match_id: match.id,
            proposal_id: proposal.id,
            buyer_note: noteSummary,
          }
        );
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
