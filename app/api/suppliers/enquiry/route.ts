import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const Schema = z.object({
  company_name: z.string().min(1).max(200),
  country: z.string().max(100).optional(),
  categories: z.array(z.string()).default([]),
  kosher_certified: z.boolean().nullable().optional(),
  whatsapp: z.string().min(1).max(50),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  contact_name: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  catalogue_url: z.string().url().optional(),
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

  const { error } = await supabaseAdmin.from("supplier_enquiries").insert({
    company_name: data.company_name,
    country: data.country ?? null,
    categories: data.categories,
    kosher_certified: data.kosher_certified ?? null,
    whatsapp: data.whatsapp,
    email: data.email ?? null,
    contact_name: data.contact_name ?? null,
    notes: data.notes ?? null,
    catalogue_url: data.catalogue_url ?? null,
    source: data.source,
  });

  if (error) {
    console.error("Supplier enquiry insert error:", error);
    return Response.json({ error: "Failed to save enquiry." }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.NOTIFY_EMAIL_TO ?? "info@foodz-x.com";
    const from = process.env.NOTIFY_EMAIL_FROM ?? "info@foodz-x.com";

    const rows = [
      ["Company", data.company_name],
      ["Country", data.country ?? "—"],
      ["WhatsApp", data.whatsapp],
      ["Email", data.email ?? "—"],
      ["Contact", data.contact_name ?? "—"],
      [
        "Categories",
        data.categories.length > 0 ? data.categories.join(", ") : "—",
      ],
      [
        "Kosher certified",
        data.kosher_certified === true
          ? "Yes"
          : data.kosher_certified === false
            ? "No"
            : "—",
      ],
    ]
      .map(
        ([label, value]) =>
          `<tr><td style="color:#64748b;padding:5px 0;width:140px;font-size:14px;">${label}</td><td style="color:#1e293b;font-weight:500;font-size:14px;">${value}</td></tr>`
      )
      .join("");

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">🏭 New Supplier Enquiry</h2>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">via FoodXchange FAB button</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
    ${data.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;"><p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Notes</p><p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${data.notes}</p></div>` : ""}
    ${data.catalogue_url ? `<p style="font-size:14px;"><a href="${data.catalogue_url}" style="color:#ea580c;">View uploaded file →</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 16px;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">FoodXchange · fdx.trading</p>
  </div>
</div>`;

    resend.emails
      .send({
        from,
        to,
        subject: `🏭 New supplier enquiry — ${data.company_name}${data.country ? ` (${data.country})` : ""}`,
        html,
      })
      .catch(console.error);
  }

  return Response.json({ ok: true });
}
