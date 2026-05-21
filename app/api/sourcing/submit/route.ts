import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification, sendBuyerConfirmation } from "@/lib/email/mailer";

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

    if (process.env.INTERNAL_API_KEY) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/match-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": process.env.INTERNAL_API_KEY,
        },
        body: JSON.stringify({ requestId: newRequest.id }),
      }).catch(console.error);
    }

    sendLeadNotification({
      name: data.name,
      email: data.email,
      company: data.company ?? "",
      message: data.description ?? intentSummary,
      intentSummary,
      matchedItems: [],
      submittedAt: new Date().toISOString(),
    }).catch(console.error);

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
