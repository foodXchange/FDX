import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";
import { logEvent } from "@/lib/events/logEvent";
import {
  sendBuyerWelcomeEmail,
  sendSupplierWelcomeEmail,
  sendNewSupplierSignupAdmin,
} from "@/lib/email/mailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SignupSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  company_name: z.string().min(1, "Company name is required").max(300),
  user_type: z.enum(["buyer", "supplier"]),
  contact_name: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
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

  const { email, password, company_name, user_type, contact_name, phone, country, website } = parsed.data;

  // Create auth user (email_confirm: true → immediately verified, no email gate)
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: contact_name ?? company_name,
      company: company_name,
      user_type,
    },
  });

  if (createError) {
    const msg = createError.message ?? "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("signup createUser error:", msg);
    return Response.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }

  const userId = authData.user.id;

  if (user_type === "buyer") {
    // Insert into buyers (used by auth/callback for portal routing)
    const { error: buyerError } = await supabaseAdmin.from("buyers").insert({
      company_name,
      contact_name: contact_name ?? null,
      contact_email: email,
      contact_whatsapp: phone ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (buyerError) {
      console.error("signup buyers insert error:", buyerError.message);
    }

    void logEvent(userId, "buyer", "buyer_signup", "request", undefined, { company_name, source: "self-signup" });
    void sendBuyerWelcomeEmail({ email, company_name });

  } else {
    // Insert into supplier_offerings (minimal record, status pending)
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("supplier_offerings")
      .insert({
        company_name,
        contact_email: email,
        contact_phone: phone ?? null,
        country_of_origin: country ?? null,
        website: website ?? null,
        status: "pending",
        source: "self-signup",
        categories: [],
        certifications: [],
        markets_served: [],
        tags: [],
        verified: false,
        priority: 0,
        auth_user_id: userId,
      })
      .select("id")
      .single();

    if (offeringError) {
      console.error("signup supplier_offerings insert error:", offeringError.message);
    } else {
      // Link supplier_profiles to the offering
      await supabaseAdmin
        .from("supplier_profiles")
        .update({ supplier_id: offering.id })
        .eq("id", userId);
    }

    void logEvent(userId, "supplier", "supplier_signup", "supplier", offering?.id, { company_name, source: "self-signup" });
    void createNotification("supplier_signup", `New supplier self-signup: ${company_name}`, email, { user_id: userId });
    void sendSupplierWelcomeEmail({ email, company_name });
    void sendNewSupplierSignupAdmin({ email, company_name });
  }

  return Response.json({ ok: true, message: "Account created. You can now sign in." });
}
