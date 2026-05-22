import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification, sendBuyerConfirmation } from "@/lib/email/mailer";
import { matchSupplierProducts, formatWhatsAppMatch } from "@/lib/matching/matchSuppliers";

const SubmitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  whatsapp: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  product_name: z.string().max(300).optional(),
  category: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  target_market: z.string().optional(),
  private_label: z.boolean().optional().nullable(),
  image_urls: z.array(z.string()).max(5).default([]),
  ai_analysis: z.record(z.string(), z.unknown()).optional(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetInMs / 60000);
    return Response.json(
      { error: "Too many requests", message: `Please wait ${mins} minutes.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const intentSummary =
    [
      data.product_name,
      data.category,
      data.target_market,
      data.private_label === true ? "private label" : null,
      ...(data.certifications ?? []),
    ]
      .filter(Boolean)
      .join(" · ") ||
    data.description ||
    "No specific intent detected";

  try {
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from("sourcing_requests")
      .insert({
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        message: data.description ?? null,
        product_name: data.product_name ?? null,
        category: data.category ?? null,
        certifications: data.certifications,
        target_market: data.target_market ?? null,
        private_label: data.private_label ?? null,
        ai_analysis: data.ai_analysis ?? null,
        source: data.source ?? "sourcing-widget",
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return Response.json({ error: "Failed to save request." }, { status: 500 });
    }

    if (data.image_urls.length > 0) {
      Promise.resolve(
        supabaseAdmin
          .from("request_images")
          .insert(data.image_urls.map((url) => ({ request_id: newRequest.id, url })))
      ).catch(console.error);
    }

    (async () => {
      try {
        const matchInput = {
          product_name: data.product_name ?? null,
          category: data.category ?? null,
          certifications: data.certifications ?? [],
          target_market: data.target_market ?? null,
          private_label: data.private_label ?? null,
          tags: [
            ...(data.certifications ?? []),
            data.product_name ?? "",
            data.category ?? "",
          ].filter(Boolean),
          formats: [],
          ai_analysis: (data.ai_analysis as Record<string, unknown>) ?? null,
          description: data.description ?? null,
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

        // Only notify admin when best match score is meaningful
        if ((top10[0]?.score ?? 0) >= 60) {
          await sendLeadNotification({
            name: data.name,
            email: data.email,
            company: data.company ?? "",
            message: data.description ?? intentSummary,
            intentSummary,
            matchedItems: [],
            submittedAt: new Date().toISOString(),
            supplierMatches: top10.slice(0, 3).map((m) => ({
              company_name: m.company_name,
              country: m.country_of_origin,
              score: Math.round(m.score),
              reasons: m.match_reasons,
              match_summary: m.match_summary,
            })),
          });
        } else {
          await sendLeadNotification({
            name: data.name,
            email: data.email,
            company: data.company ?? "",
            message: data.description ?? intentSummary,
            intentSummary,
            matchedItems: [],
            submittedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Auto-match error:", err);
        sendLeadNotification({
          name: data.name,
          email: data.email,
          company: data.company ?? "",
          message: data.description ?? intentSummary,
          intentSummary,
          matchedItems: [],
          submittedAt: new Date().toISOString(),
        }).catch(console.error);
      }
    })();

    sendBuyerConfirmation({
      name: data.name,
      email: data.email,
      intentSummary,
      matchedItems: [],
    }).catch(console.error);

    return Response.json({ ok: true, id: newRequest.id, intentSummary });
  } catch (err) {
    console.error("Submit error:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
