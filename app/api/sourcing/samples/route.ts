import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification } from "@/lib/email/mailer";

const SampleItemSchema = z.object({
  id: z.string(),
  product_name: z.string().max(300),
  category: z.string().max(100),
  image_url: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  country_of_origin: z.string().nullable().optional(),
  kosher_types: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  sample_format: z.string().max(200).optional(),
});

const SampleOrderSchema = z.object({
  session_id: z.string(),
  company: z.string().min(2).max(200),
  name: z.string().min(2).max(200),
  role_title: z.string().max(200).optional(),
  whatsapp: z.string().min(7).max(30),
  email: z.string().email().optional().or(z.literal("")),
  delivery_address: z.string().min(5).max(500),
  target_tasting_date: z.string().max(100).optional(),
  special_notes: z.string().max(2000).optional(),
  items: z.array(SampleItemSchema).min(1).max(20),
});

export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return Response.json({ error: "Too many requests. Please wait." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = SampleOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    session_id,
    company,
    name,
    role_title,
    whatsapp,
    email,
    delivery_address,
    target_tasting_date,
    special_notes,
    items,
  } = parsed.data;

  const trackingCode = `FDX-SMP-${session_id.slice(0, 8).toUpperCase()}`;

  try {
    const formattedNotes = [
      `[Tasting Sample Kit Dispatch Request #${trackingCode}]`,
      `Retail Chain / Importer: ${company}`,
      `Buyer: ${name}${role_title ? ` (${role_title})` : ""}`,
      `Delivery Address: ${delivery_address}`,
      target_tasting_date ? `Target Tasting Date: ${target_tasting_date}` : null,
      special_notes ? `Notes / Lab instructions: ${special_notes}` : null,
      `Requested Items Count: ${items.length}`,
    ]
      .filter(Boolean)
      .join("\n");

    const rows = items.map((item) => ({
      name,
      email: email || "buyer@retail.il",
      company,
      whatsapp,
      product_name: item.product_name,
      category: item.category,
      certifications: item.kosher_types || [],
      packaging_preference: `Tasting sample: ${item.sample_format || "Retail unit for tasting"} (${item.supplier_name || "Verified Factory"}, ${item.country_of_origin || "Europe"})`,
      message: formattedNotes,
      source: "sample_kit",
      status: "new",
      session_id,
      ai_analysis: {
        tracking_code: trackingCode,
        sample_status: "coordinating_factory",
        delivery_address,
        target_tasting_date,
        sample_format: item.sample_format,
        supplier_name: item.supplier_name,
        country_of_origin: item.country_of_origin,
        sample_image_url: item.image_url,
      },
    }));

    const { error: insertError } = await supabaseAdmin
      .from("sourcing_requests")
      .insert(rows);

    if (insertError) {
      console.error("Sample kit insert error:", insertError);
      return Response.json(
        { error: "Failed to record sample request." },
        { status: 500 }
      );
    }

    // Send lead notification to deal desk
    const itemsSummary = items
      .map((i) => `• ${i.product_name} (${i.category}, ${i.country_of_origin || "Europe"})`)
      .join("\n");

    sendLeadNotification({
      name,
      email: email ? `${email} (WhatsApp: ${whatsapp})` : `WhatsApp: ${whatsapp}`,
      company,
      message: `${formattedNotes}\n\nProducts in Kit:\n${itemsSummary}`,
      intentSummary: `Tasting Sample Box Dispatch Request #${trackingCode} (${items.length} items)`,
      matchedItems: items.map((i) => ({ title: i.product_name, slug: i.category })),
      submittedAt: new Date().toISOString(),
    }).catch(console.error);

    return Response.json({
      success: true,
      trackingCode,
      itemCount: items.length,
      company,
      name,
    });
  } catch (err) {
    console.error("Sample kit handler error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
