import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/createNotification";
import { logEvent } from "@/lib/events/logEvent";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification, sendBuyerConfirmation } from "@/lib/email/mailer";
import { matchSupplierProducts, formatWhatsAppMatch } from "@/lib/matching/matchSuppliers";
import { buildPipV1 } from "@/lib/pip/buildPipV1";
import { resolveCategoryId } from "@/lib/pip/resolveCategoryId";
import { runMatchV3 } from "@/lib/matching/runMatchV3";
import { groupImages } from "@/lib/pip/groupImages";
import { getOriginFromHeaders } from "@/lib/getOrigin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const SubmitSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().regex(EMAIL_REGEX, "Invalid email address").optional(),
    whatsapp: z
      .string()
      .max(30)
      .optional()
      .refine((v) => !v || validPhone(v), "Invalid phone number"),
    company: z.string().max(200).optional(),
    description: z.string().max(5000).optional(),
    product_name: z.string().max(300).optional(),
    category: z.string().optional(),
    certifications: z.array(z.string()).default([]),
    target_market: z.string().optional(),
    private_label: z.boolean().optional().nullable(),
    packaging_preference: z.string().max(500).optional(),
    volume_per_year: z.string().max(200).optional(),
    benchmark_brand: z.string().max(300).optional(),
    seller_brief: z.string().max(8000).optional(),
    dietary_claims: z.array(z.string()).optional(),
    image_urls: z.array(z.string()).max(5).default([]),
    ai_analysis: z.record(z.string(), z.unknown()).optional(),
    source: z.string().optional(),
  })
  .refine((data) => !!(data.email || data.whatsapp), {
    message: "Either email or WhatsApp is required",
    path: ["email"],
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
  const allCerts = Array.from(
    new Set([...(data.certifications ?? []), ...(data.dietary_claims ?? [])])
  );

  const autoBrief =
    data.seller_brief ||
    (typeof data.ai_analysis?.seller_brief === "string" ? data.ai_analysis.seller_brief : "") ||
    `Hello! We are working with a qualified B2B buyer in ${data.target_market ?? "Israel"} who is actively sourcing ${data.product_name ?? data.description?.slice(0, 80) ?? "Food & Beverage products"}${data.benchmark_brand ? ` (benchmarking quality and profile similar to ${data.benchmark_brand})` : ""}. They are looking for ${data.packaging_preference ?? "standard retail or foodservice packaging"} under ${data.private_label === false ? "Supplier Brand" : data.private_label === true ? "Private Label (Buyer's Brand)" : "Private Label or Supplier Brand"}, with ${allCerts.length > 0 ? allCerts.join(", ") : "standard export quality (BRC/IFS/ISO)"} compliance${data.volume_per_year ? ` for an estimated volume of ${data.volume_per_year}` : ""}. If your factory produces a matching or closely equivalent line, we would love to receive your product specifications, available packaging formats, and export terms!`;

  const enrichedAiAnalysis: Record<string, unknown> = {
    ...(data.ai_analysis ?? {}),
    ...(data.benchmark_brand ? { benchmark_brand: data.benchmark_brand } : {}),
    seller_brief: autoBrief,
    ...(data.dietary_claims ? { dietary_claims: data.dietary_claims } : {}),
    ...(data.packaging_preference ? { packaging_format: data.packaging_preference } : {}),
  };

  const intentSummary =
    [
      data.product_name,
      data.benchmark_brand ? `Benchmark: ${data.benchmark_brand}` : null,
      data.category,
      data.packaging_preference,
      data.target_market,
      data.private_label === true ? "private label" : data.private_label === false ? "supplier brand" : null,
      ...allCerts,
    ]
      .filter(Boolean)
      .join(" · ") ||
    data.description ||
    "No specific intent detected";

  try {
    let buyerId: string | null = null;
    if (data.email) {
      const { data: existingBuyer } = await supabaseAdmin
        .from("buyers")
        .select("id")
        .eq("contact_email", data.email)
        .limit(1)
        .maybeSingle();

      if (existingBuyer) {
        buyerId = existingBuyer.id as string;
      } else {
        const { data: newBuyer, error: buyerError } = await supabaseAdmin
          .from("buyers")
          .insert({
            company_name: data.company || data.name,
            contact_name: data.name,
            contact_email: data.email,
            contact_whatsapp: data.whatsapp ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (buyerError) {
          console.error("Buyer insert error:", buyerError);
        } else {
          buyerId = newBuyer.id as string;
        }
      }
    }

    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from("sourcing_requests")
      .insert({
        buyer_id: buyerId,
        name: data.name,
        email: data.email ?? null,
        whatsapp: data.whatsapp ?? null,
        company: data.company ?? null,
        message: data.description ?? null,
        product_name: data.product_name ?? null,
        category: data.category ?? null,
        certifications: allCerts,
        target_market: data.target_market ?? null,
        private_label: data.private_label ?? null,
        packaging_preference: data.packaging_preference ?? null,
        volume_per_year: data.volume_per_year ?? null,
        ai_analysis: Object.keys(enrichedAiAnalysis).length > 0 ? enrichedAiAnalysis : null,
        source: data.source ?? "buyers_page",
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return Response.json({ error: "Failed to save request." }, { status: 500 });
    }

    void createNotification(
      "new_request",
      `${data.name} submitted a sourcing request`,
      undefined,
      {
        request_id: newRequest.id,
        product_name: data.product_name ?? null,
        buyer_name: data.name,
        category: data.category ?? null,
      }
    );

    void (async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await logEvent(user?.id ?? null, "buyer", "request_submitted", "request", newRequest.id, {
        product_name: data.product_name ?? null,
        category: data.category ?? null,
        source: data.source ?? "buyers_page",
      });
    })();

    // Guaranteed admin notification — fires for every submission
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
      const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";
      const productLabel = data.product_name ?? data.description?.slice(0, 60) ?? "—";
      const rows: [string, string][] = [
        ["Product", productLabel],
        ["Benchmark Brand", data.benchmark_brand ?? "—"],
        ["Category", data.category ?? "—"],
        ["Packaging", data.packaging_preference ?? "—"],
        ["Kosher & Dietary", allCerts.length > 0 ? allCerts.join(", ") : "—"],
        ["Company", data.company ?? "—"],
        ["Name", data.name],
        ["WhatsApp", data.whatsapp ?? "—"],
        ["Email", data.email ?? "—"],
        ["Branding", data.private_label === true ? "Private Label" : data.private_label === false ? "Supplier Brand" : "Open"],
      ];
      const tableRows = rows
        .map(
          ([label, value]) =>
            `<tr><td style="color:#64748b;padding:4px 0;width:130px;font-size:14px;">${label}</td><td style="color:#1e293b;font-weight:500;font-size:14px;">${value}</td></tr>`
        )
        .join("");
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">🛒 New Sourcing Request & Seller Brief</h2>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">via FoodXchange buyers page</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
    ${data.seller_brief ? `<div style="margin-top:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;"><p style="color:#c2410c;font-size:12px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">🤝 Warm Seller / Agent Brief</p><pre style="white-space:pre-wrap;font-family:sans-serif;color:#334155;font-size:14px;line-height:1.6;margin:0;">${data.seller_brief}</pre></div>` : ""}
    ${data.description ? `<div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;"><p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Buyer Raw Notes</p><p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${data.description}</p></div>` : ""}
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

    // Sequenced AI PIP + Image Extraction + Hybrid Vector Matching (match_v3)
    (async () => {
      try {
        // 1. Build v1 PIP and resolve canonical 21-leaf category_id first
        const pip = buildPipV1({
          product_name: data.product_name ?? null,
          message: data.description ?? null,
          category: data.category ?? null,
          certifications: allCerts,
          target_market: data.target_market ?? null,
          private_label: data.private_label ?? null,
          ai_analysis: enrichedAiAnalysis,
        });

        // Enrich nice_to_have with benchmark brand, packaging, and dietary claims for Voyage AI vector embedding
        const extraTokens: string[] = [];
        if (data.benchmark_brand) extraTokens.push(`Benchmark profile similar to ${data.benchmark_brand}`);
        if (data.packaging_preference) extraTokens.push(`Packaging: ${data.packaging_preference}`);
        for (const claim of data.dietary_claims ?? []) {
          extraTokens.push(`nutrition:${claim}`);
        }
        pip.match_config.nice_to_have = Array.from(
          new Set([...pip.match_config.nice_to_have, ...extraTokens])
        );

        const categoryClassificationText = [
          data.product_name,
          data.benchmark_brand,
          data.category,
          data.description,
        ]
          .filter(Boolean)
          .join(" — ");

        const { category_id, category_name } = await resolveCategoryId(categoryClassificationText);
        pip.category.category_id = category_id;
        pip.category.category_name = category_name;

        await supabaseAdmin
          .from("sourcing_requests")
          .update({
            intent_json: pip,
            ...(category_name && !data.category ? { category: category_name } : {}),
          })
          .eq("id", newRequest.id);

        // 2. If benchmark images were uploaded, insert and run Gemini Vision groupImages (creates v2 PIP)
        if (data.image_urls.length > 0) {
          try {
            await supabaseAdmin
              .from("request_images")
              .insert(data.image_urls.map((url) => ({ request_id: newRequest.id, url })));
            await groupImages(newRequest.id);
          } catch (err) {
            console.error("[v2-pipeline] groupImages failed", newRequest.id, err);
          }
        }

        // 3. Run Hybrid Vector + Category + Compliance Matching (match_v3)
        let matchedCount = 0;
        try {
          const v3Res = await runMatchV3(newRequest.id);
          matchedCount = v3Res.inserted;
          if (v3Res.inserted > 0 && v3Res.topScore >= 60) {
            await sendLeadNotification({
              name: data.name,
              email: data.email ?? "",
              company: data.company ?? "",
              message: data.seller_brief || data.description || intentSummary,
              intentSummary,
              matchedItems: [],
              submittedAt: new Date().toISOString(),
              supplierMatches: v3Res.matches.slice(0, 3).map((m) => ({
                company_name: m.company_name,
                country: m.country,
                score: Math.round(m.score),
                reasons: [m.summary],
                match_summary: m.summary,
              })),
            });
          }
        } catch (v3Err) {
          console.error("runMatchV3 failed (submit):", v3Err);
        }

        // 4. Fallback to heuristic matchSupplierProducts only if match_v3 found 0 matches
        if (matchedCount === 0) {
          const matchInput = {
            product_name: data.product_name ?? null,
            category: data.category ?? category_name ?? null,
            certifications: allCerts,
            target_market: data.target_market ?? null,
            private_label: data.private_label ?? null,
            tags: [
              ...allCerts,
              data.product_name ?? "",
              data.benchmark_brand ?? "",
              data.category ?? "",
            ].filter(Boolean),
            formats: data.packaging_preference ? [data.packaging_preference] : [],
            ai_analysis: enrichedAiAnalysis,
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
        }
      } catch (err) {
        console.error("Auto-match pipeline error:", err);
      }
    })();

    if (data.email) {
      let portalLink: string | undefined;
      try {
        const origin = getOriginFromHeaders(req.headers);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: data.email,
          options: {
            redirectTo: `${origin}/en/portal/auth/callback?next=/en/portal/requests/${newRequest.id}`,
          },
        });
        if (linkError) throw linkError;

        if (linkData.user?.id) {
          await supabaseAdmin
            .from("sourcing_requests")
            .update({ auth_user_id: linkData.user.id })
            .eq("id", newRequest.id);
        }

        portalLink = linkData.properties?.action_link ?? undefined;
      } catch (err) {
        console.error("Portal invite link generation failed:", err);
      }

      sendBuyerConfirmation({
        name: data.name,
        email: data.email,
        intentSummary,
        matchedItems: [],
        portalLink,
      }).catch(console.error);
    }

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
