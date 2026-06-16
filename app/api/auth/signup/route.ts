import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";
import { logEvent } from "@/lib/events/logEvent";
import { sendSignupLink, sendNewSupplierSignupAdmin } from "@/lib/email/mailer";
import { getOriginFromHeaders } from "@/lib/getOrigin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SignupSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "Invalid email address"),
  company_name: z.string().min(1, "Company name is required").max(300),
  user_type: z.enum(["buyer", "supplier"]),
  category: z.string().max(100).optional().nullable(),
  volume: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
});

async function generateAndSendLink(
  email: string,
  user_type: "buyer" | "supplier",
  company_name: string,
  origin: string
) {
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/en/auth/callback` },
  });
  if (linkError || !linkData?.properties?.action_link) {
    console.error("generateLink failed:", linkError?.message);
    return;
  }
  void sendSignupLink({ email, magicLink: linkData.properties.action_link, user_type, company_name });
}

export async function POST(req: Request) {
  const origin = getOriginFromHeaders(req.headers);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return Response.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  const { email, company_name, user_type, category, phone, country, website } = parsed.data;

  // Create auth user — no password, magic link only
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: company_name, company: company_name, user_type },
  });

  if (createError) {
    const msg = createError.message ?? "";
    // User already exists — still send them a sign-in link (don't reveal account state)
    if (
      msg.toLowerCase().includes("already registered") ||
      msg.toLowerCase().includes("already been registered")
    ) {
      void generateAndSendLink(email, user_type, company_name, origin);
      return Response.json({ ok: true });
    }
    console.error("signup createUser error:", msg);
    return Response.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }

  const userId = authData.user.id;

  if (user_type === "buyer") {
    const { error: buyerError } = await supabaseAdmin.from("buyers").insert({
      company_name,
      contact_email: email,
      contact_whatsapp: phone ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (buyerError) console.error("signup buyers insert error:", buyerError.message);

    void logEvent(userId, "buyer", "buyer_signup", undefined, undefined, {
      company_name,
      category: category ?? null,
      source: "self-signup",
    });

  } else {
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("supplier_offerings")
      .insert({
        company_name,
        contact_email: email,
        contact_phone: phone ?? null,
        country_of_origin: country ?? null,
        website: website ?? null,
        categories: category ? [category] : [],
        certifications: [],
        markets_served: [],
        tags: category ? [category] : [],
        status: "pending",
        source: "self-signup",
        verified: false,
        priority: 0,
        auth_user_id: userId,
      })
      .select("id")
      .single();

    if (offeringError) {
      console.error("signup supplier_offerings insert error:", offeringError.message);
    } else {
      await supabaseAdmin
        .from("supplier_profiles")
        .update({ supplier_id: offering.id })
        .eq("id", userId);
    }

    void logEvent(userId, "supplier", "supplier_signup", "supplier", offering?.id, {
      company_name,
      category: category ?? null,
      source: "self-signup",
    });
    void createNotification("supplier_signup", `New supplier signup: ${company_name}`, email, {
      user_id: userId,
    });
    void sendNewSupplierSignupAdmin({ email, company_name });
  }

  // Generate and send magic link (no password ever stored)
  void generateAndSendLink(email, user_type, company_name, origin);

  return Response.json({ ok: true });
}
