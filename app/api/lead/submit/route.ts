import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { runMatch } from "@/lib/matching/runMatch";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";
import {
  sendLeadNotification,
  sendBuyerConfirmation,
} from "@/lib/email/mailer";
import type { IntentResult } from "@/lib/ai/intentSchema";

const LeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  company: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
  market: z.string().optional().nullable(),
  privateLabel: z.boolean().optional().nullable(),
});

function buildIntentSummary(intent: IntentResult): string {
  const parts: string[] = [];
  if (intent.product) parts.push(intent.product);
  if (intent.packaging.length > 0) parts.push(intent.packaging.join(" + "));
  if (intent.pack_size_g) parts.push(`${intent.pack_size_g}g`);
  else if (intent.pack_size_ml) parts.push(`${intent.pack_size_ml}ml`);
  else if (intent.pack_size_kg) parts.push(`${intent.pack_size_kg}kg`);
  if (intent.market) parts.push(intent.market.toLowerCase());
  if (intent.private_label === true) parts.push("private label");
  if (intent.kosher === true) parts.push("kosher");
  const otherCerts = intent.certifications.filter((c) => c !== "kosher");
  if (otherCerts.length > 0) parts.push(otherCerts.join(", "));
  if (parts.length === 0 && intent.keywords.length > 0) {
    parts.push(...intent.keywords.slice(0, 5));
  }
  return parts.join(" · ") || "No specific intent detected";
}

export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    const resetMins = Math.ceil(limit.resetInMs / 1000 / 60);
    return Response.json(
      {
        error: "Too many requests",
        message: `Please wait ${resetMins} minutes before submitting again.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.resetInMs / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { name, email, company, message, market, privateLabel } = parsed.data;

  let matchOutput;
  try {
    matchOutput = await runMatch({
      text: message,
      market: market ?? undefined,
      privateLabel: privateLabel ?? undefined,
      limit: 3,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error("runMatch failed in lead/submit:", err);
    return Response.json({ error: "Matching failed" }, { status: 500 });
  }

  const intentSummary = buildIntentSummary(matchOutput.intent);

  // Fire-and-forget: DB write
  void (async () => {
    try {
      const { data: newLead, error } = await supabaseAdmin
        .from("sourcing_requests")
        .insert({
          name,
          email,
          company: company ?? null,
          message,
          market: market ?? null,
          private_label: privateLabel ?? null,
          intent_json: matchOutput.intent,
          matched_slugs: matchOutput.results.map((r) => r.slug),
        })
        .select("id")
        .single();

      if (error) throw error;

      void createNotification(
        "lead",
        `New lead from ${company ?? name}`,
        undefined,
        { lead_id: newLead.id, company_name: company ?? null, contact_email: email }
      );
    } catch (err) {
      Sentry.captureException(err);
      console.error("sourcing_requests insert failed:", err);
    }
  })();

  // Fire-and-forget: email
  void (async () => {
    try {
      await sendLeadNotification({
        name,
        email,
        company: company ?? "",
        message,
        intentSummary,
        matchedItems: matchOutput.results.map((r) => ({ title: r.title, slug: r.slug })),
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      Sentry.captureException(err);
      console.error("sendLeadNotification failed:", err);
    }
  })();

  // STEP 4B — buyer confirmation (fire and forget)
  sendBuyerConfirmation({
    name,
    email,
    intentSummary,
    matchedItems: matchOutput.results.map((r) => ({ title: r.title, slug: r.slug })),
  }).catch((err) => {
    Sentry.captureException(err);
    console.error("sendBuyerConfirmation failed:", err);
  });

  return Response.json({
    ok: true,
    matched: matchOutput.results.map((r) => ({
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      category: r.category,
      hero_image: r.hero_image ?? null,
    })),
    intentSummary,
  });
}
