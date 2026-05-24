import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendSupplierNotification, sendSupplierConfirmation } from "@/lib/email/mailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const SupplierSubmitSchema = z.object({
  company_name: z.string().min(1).max(300),
  website: z.string().max(500).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().regex(EMAIL_REGEX, "Invalid email address"),
  contact_whatsapp: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .refine((v) => !v || validPhone(v), "Invalid phone number"),
  contact_title: z.string().max(200).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  categories: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  markets_target: z.array(z.string()).default([]),
  private_label: z.boolean().optional().nullable(),
  image_urls: z.array(z.string().url()).max(10).default([]),
  ai_analyses: z.array(z.record(z.string(), z.unknown())).default([]),
  annual_capacity: z.string().max(200).optional().nullable(),
  source: z.string().optional(),
  ref: z.string().optional(),
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

  const parsed = SupplierSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const tags = [
    ...data.categories,
    ...data.certifications,
    ...data.ai_analyses.flatMap((a) => (a.sourcing_keywords as string[] | undefined) ?? []),
    data.country,
  ]
    .filter(Boolean)
    .slice(0, 20) as string[];

  const detectedProducts = data.ai_analyses
    .map((a) => a.product_name as string | undefined)
    .filter(Boolean) as string[];

  const fullDescription = [
    data.description,
    detectedProducts.length > 0 ? `Products detected: ${detectedProducts.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

  const allCerts = [
    ...data.certifications,
    ...data.ai_analyses.flatMap((a) => (a.certifications_visible as string[] | undefined) ?? []),
  ].filter(Boolean);
  const uniqueCerts = [...new Set(allCerts)];

  try {
    const { data: newSupplier, error: insertError } = await supabaseAdmin
      .from("supplier_offerings")
      .insert({
        company_name: data.company_name,
        website: data.website ?? null,
        contact_email: data.contact_email,
        contact_phone: data.contact_whatsapp ?? null,
        country_of_origin: data.country ?? null,
        categories: data.categories,
        product_description: fullDescription,
        certifications: uniqueCerts,
        markets_served: data.markets_target,
        private_label: data.private_label ?? false,
        tags,
        status: "pending",
        source: data.source ?? "manufacturer-widget",
        internal_notes: data.ref ? `Referral: ${data.ref}` : null,
        ai_analysis: data.ai_analyses.length > 0 ? data.ai_analyses[0] : null,
        annual_capacity: data.annual_capacity ?? null,
        verified: false,
        priority: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supplier insert error:", insertError);
      return Response.json({ error: "Failed to save submission." }, { status: 500 });
    }

    Promise.resolve(
      supabaseAdmin.from("supplier_contacts").insert({
        supplier_id: newSupplier.id,
        name: data.contact_name,
        title: data.contact_title ?? null,
        email: data.contact_email,
        whatsapp: data.contact_whatsapp ?? null,
        is_primary: true,
        notes: "Self-submitted via manufacturer widget",
      })
    ).catch(console.error);

    if (data.image_urls.length > 0) {
      Promise.resolve(
        supabaseAdmin.from("supplier_images").insert(
          data.image_urls.map((url, i) => ({
            supplier_id: newSupplier.id,
            url,
            label: `Product image ${i + 1}`,
          }))
        )
      ).catch(console.error);
    }

    sendSupplierNotification({
      company_name: data.company_name,
      country: data.country ?? null,
      website: data.website ?? null,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_whatsapp: data.contact_whatsapp ?? null,
      categories: data.categories,
      certifications: uniqueCerts,
      image_count: data.image_urls.length,
      detected_products: detectedProducts,
      description: data.description ?? null,
      supplier_id: newSupplier.id,
    }).catch(console.error);

    sendSupplierConfirmation({
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      company_name: data.company_name,
      image_count: data.image_urls.length,
    }).catch(console.error);

    return Response.json({ ok: true, id: newSupplier.id });
  } catch (err) {
    console.error("Supplier submit error:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
