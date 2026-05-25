import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification, sendBuyerConfirmation } from "@/lib/email/mailer";
import { matchSupplierProducts, formatWhatsAppMatch } from "@/lib/matching/matchSuppliers";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { runMatchV1 } from "@/lib/matching/runMatchV1";
import { groupImages } from "@/lib/pip/groupImages";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const SubmitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().regex(EMAIL_REGEX, "Invalid email address"),
  whatsapp: z
    .string()
    .max(30)
    .optional()
    .refine((v) => !v || validPhone(v), "Invalid phone number"),
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
  volume_unit: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetInMs / 60000);
    return Response.json(
      { error: "Too many requests", message: `You've submitted several requests — please wait ${mins} minutes before submitting again.` },
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
        source: data.source ?? "buyers_page",
        status: "new",
        volume_unit: data.volume_unit ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return Response.json({ error: "Failed to save request." }, { status: 500 });
    }

    // Guaranteed admin notification — fires for every submission
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
      const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
      const productLabel = data.product_name ?? data.description?.slice(0, 60) ?? "—";
      const rows: [string, string][] = [
        ["Product", productLabel],
        ["Category", data.category ?? "—"],
        ["Kosher", data.certifications.length > 0 ? data.certifications.join(", ") : "—"],
        ["Company", data.company ?? "—"],
        ["Name", data.name],
        ["WhatsApp", data.whatsapp ?? "—"],
        ["Email", data.email],
        ["Private label", data.private_label ? "Yes" : "No"],
      ];
      const tableRows = rows
        .map(
          ([label, value]) =>
            `<tr><td style="color:#64748b;padding:4px 0;width:120px;font-size:14px;">${label}</td><td style="color:#1e293b;font-weight:500;font-size:14px;">${value}</td></tr>`
        )
        .join("");
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">🛒 New Sourcing Request</h2>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">via FoodXchange buyers page</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
    ${data.description ? `<div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;"><p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Description</p><p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${data.description}</p></div>` : ""}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 14px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;
      resend.emails
        .send({
          from,
          to,
          subject: `🛒 New sourcing request: ${productLabel}${data.company ? ` — ${data.company}` : ""}`,
          html,
        })
        .catch(console.error);
    }

    // v2 pipeline: insert images then extract → group → merge.
    // Sequential within this block — groupImages reads from request_images.
    if (data.image_urls.length > 0) {
      (async () => {
        try {
          await supabaseAdmin
            .from("request_images")
            .insert(data.image_urls.map((url) => ({ request_id: newRequest.id, url })));
          await groupImages(newRequest.id);
        } catch (err) {
          console.error("[v2-pipeline] groupImages failed", newRequest.id, err);
        }
      })();
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

    (async () => {
      try {
        const pip = buildPipV1({
          product_name: data.product_name ?? null,
          message: data.description ?? null,
          category: data.category ?? null,
          certifications: data.certifications ?? [],
          target_market: data.target_market ?? null,
          private_label: data.private_label ?? null,
          ai_analysis: (data.ai_analysis as Record<string, unknown>) ?? null,
        });
        const { category_id, category_name } = await resolveCategoryId(data.category ?? "");
        pip.category.category_id = category_id;
        pip.category.category_name = category_name;
        await supabaseAdmin
          .from("sourcing_requests")
          .update({ intent_json: pip })
          .eq("id", newRequest.id);
      } catch (e) {
        console.error("PIP generation failed:", e);
      }
    })();

    (async () => {
      try {
        await runMatchV1(newRequest.id);
      } catch (e) {
        console.error("runMatchV1 failed (submit):", e);
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
    console.error("Submit error:", JSON.stringify(err, null, 2));
    return Response.json(
      {
        error: "Failed to save request.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
