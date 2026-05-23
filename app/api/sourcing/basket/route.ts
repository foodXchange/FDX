import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendLeadNotification } from "@/lib/email/mailer";

const ProductSchema = z.object({
  id: z.string(),
  product_name: z.string().max(300),
  category: z.string().max(100),
  kosher_types: z.array(z.string()),
  certifications: z.array(z.string()),
  country_of_origin: z.string().nullable(),
});

const BasketSchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  whatsapp: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
  products: z.array(ProductSchema).min(1).max(20),
});

export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = BasketSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed" }, { status: 400 });
  }

  const { session_id, name, company, whatsapp, notes, products } = parsed.data;

  try {
    const rows = products.map((p) => ({
      name,
      email: "",
      company,
      whatsapp: whatsapp ?? null,
      message: notes ?? null,
      product_name: p.product_name,
      category: p.category,
      certifications: p.kosher_types,
      source: "basket",
      status: "new",
      session_id,
      image_urls: [],
    }));

    const { error: insertError } = await supabaseAdmin
      .from("sourcing_requests")
      .insert(rows);

    if (insertError) {
      console.error("Basket insert error:", insertError);
      return Response.json({ error: "Failed to save requests." }, { status: 500 });
    }

    const productSummary = products
      .map((p) => p.product_name)
      .slice(0, 3)
      .join(", ");
    const overflowSuffix =
      products.length > 3 ? ` +${products.length - 3} more` : "";

    sendLeadNotification({
      name,
      email: "",
      company,
      message:
        notes ??
        `Basket request: ${products.map((p) => p.product_name).join(", ")}`,
      intentSummary: `${products.length} products: ${productSummary}${overflowSuffix}`,
      matchedItems: [],
      submittedAt: new Date().toISOString(),
    }).catch(console.error);

    return Response.json({ ok: true, count: products.length });
  } catch (err) {
    console.error("Basket submit error:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
