import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendLeadNotification } from "@/lib/email/mailer";
import { matchSupplierProducts, formatWhatsAppMatch } from "@/lib/matching/matchSuppliers";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { runMatchV1 } from "@/lib/matching/runMatchV1";

const Schema = z.object({
  product_name: z.string().min(1).max(2000),
  kosher_type: z.string().optional(),
  company: z.string().min(1).max(200),
  whatsapp: z.string().min(1).max(50),
  contact_name: z.string().max(200).optional(),
  image_url: z.string().url().optional(),
  source: z.string().default("fab_button"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed" }, { status: 400 });
  }

  const data = parsed.data;
  const name = data.contact_name?.trim() || "Buyer";
  const intentSummary = [
    data.product_name,
    data.kosher_type && data.kosher_type !== "Any kosher" ? data.kosher_type : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const { data: newRequest, error } = await supabaseAdmin
    .from("sourcing_requests")
    .insert({
      name,
      email: "",
      company: data.company,
      message: `[WhatsApp: ${data.whatsapp}]\n\n${data.product_name}`,
      product_name: data.product_name,
      category: null,
      certifications:
        data.kosher_type && data.kosher_type !== "Any kosher"
          ? [data.kosher_type]
          : [],
      source: data.source,
      status: "new",
      image_urls: data.image_url ? [data.image_url] : [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("FAB buyer insert error:", error);
    return Response.json({ error: "Failed to save request." }, { status: 500 });
  }

  sendLeadNotification({
    name,
    email: `WhatsApp: ${data.whatsapp}`,
    company: data.company,
    message: `${data.product_name}${data.kosher_type && data.kosher_type !== "Any kosher" ? `\nKosher: ${data.kosher_type}` : ""}${data.image_url ? "\n[Image uploaded]" : ""}`,
    intentSummary,
    matchedItems: [],
    submittedAt: new Date().toISOString(),
  }).catch(console.error);

  (async () => {
    try {
      const matchInput = {
        product_name: data.product_name,
        category: null,
        certifications:
          data.kosher_type && data.kosher_type !== "Any kosher"
            ? [data.kosher_type]
            : [],
        formats: [],
        tags: [
          data.product_name,
          ...(data.kosher_type && data.kosher_type !== "Any kosher"
            ? [data.kosher_type]
            : []),
        ].filter(Boolean) as string[],
        private_label: null,
        ai_analysis: null,
        description: null,
        kosher_type: data.kosher_type ?? null,
      };

      const allMatches = await matchSupplierProducts(matchInput, 10);
      const top10 = allMatches.filter((m) => m.score >= 30);

      if (top10.length > 0) {
        await supabaseAdmin
          .from("sourcing_matches")
          .upsert(
            top10.map((m, idx) => ({
              request_id: newRequest.id,
              supplier_id: m.supplier_id,
              match_score: Math.round(m.score),
              product_name: m.product_name,
              company_name: m.company_name,
              country: m.country_of_origin,
              match_summary: m.match_summary ?? null,
              whatsapp_message: formatWhatsAppMatch(
                { product_name: data.product_name, company: data.company },
                m,
                idx + 1
              ),
              match_breakdown: {
                reasons: m.match_reasons,
                summary: m.match_summary,
                kosher_types: m.kosher_types,
                certifications: m.certifications,
              },
              status: "pending",
            })),
            { onConflict: "request_id,supplier_id" }
          );

        await supabaseAdmin
          .from("sourcing_requests")
          .update({
            last_matched_at: new Date().toISOString(),
            best_match_score: Math.round(top10[0].score),
            match_count: top10.length,
            status: "matched",
          })
          .eq("id", newRequest.id);
      }
    } catch (err) {
      console.error("FAB auto-match error:", err);
    }
  })();

  (async () => {
    try {
      const certs =
        data.kosher_type && data.kosher_type !== "Any kosher"
          ? [data.kosher_type]
          : [];
      const pip = buildPipV1({
        product_name: data.product_name,
        message: null,
        category: null,
        certifications: certs,
        target_market: null,
        private_label: null,
        ai_analysis: null,
      });
      const { category_id, category_name } = await resolveCategoryId("");
      pip.category.category_id = category_id;
      pip.category.category_name = category_name;
      await supabaseAdmin
        .from("sourcing_requests")
        .update({ intent_json: pip })
        .eq("id", newRequest.id);
    } catch (e) {
      console.error("PIP generation failed (FAB):", e);
    }
  })();

  (async () => {
    try {
      await runMatchV1(newRequest.id);
    } catch (e) {
      console.error("runMatchV1 failed (FAB):", e);
    }
  })();

  return Response.json({ ok: true });
}
