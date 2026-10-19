import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getGmailCredentials,
  saveGmailCredentials,
  syncGmailInboxReplies,
} from "@/lib/email/gmailEngine";

export const maxDuration = 60;

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getGmailCredentials();
  return NextResponse.json({
    connected: !!creds,
    user: creds?.user ?? null,
    senderName: creds?.senderName ?? "FoodXchange Sourcing",
  });
}

function extractEmailFromText(text: string): string | null {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(regex) ?? [];
  const filtered = matches.filter((em) => {
    const lower = em.toLowerCase();
    return (
      !lower.endsWith(".png") &&
      !lower.endsWith(".jpg") &&
      !lower.endsWith(".webp") &&
      !lower.endsWith(".svg") &&
      !lower.includes("sentry") &&
      !lower.includes("example.com") &&
      !lower.includes("wixpress") &&
      !lower.includes("placeholder")
    );
  });
  if (filtered.length === 0) return null;

  // Prefer export@, sales@, info@, contact@, commercial@
  const preferred = filtered.find((em) =>
    /^(export|sales|commercial|info|contact|orders|b2b|office)@/i.test(em)
  );
  return (preferred ?? filtered[0]).toLowerCase();
}

async function discoverSupplierEmail(supplier: {
  id: string;
  company_name: string | null;
  website: string | null;
  country_of_origin: string | null;
  contact_email: string | null;
}): Promise<{ email: string | null; source: string }> {
  if (supplier.contact_email && supplier.contact_email.trim()) {
    return { email: supplier.contact_email.trim(), source: "existing" };
  }

  // Check supplier_contacts table first
  const { data: contactRow } = await supabaseAdmin
    .from("supplier_contacts")
    .select("email")
    .eq("supplier_id", supplier.id)
    .not("email", "is", null)
    .neq("email", "")
    .limit(1)
    .maybeSingle();

  if (contactRow?.email) {
    const clean = contactRow.email.trim().toLowerCase();
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ contact_email: clean })
      .eq("id", supplier.id);
    return { email: clean, source: "supplier_contacts" };
  }

  let foundEmail: string | null = null;
  let source = "website";

  // Step 1: Fetch supplier homepage + /contact or /contacto or /impressum
  if (supplier.website) {
    const base = supplier.website.startsWith("http")
      ? supplier.website.replace(/\/$/, "")
      : `https://${supplier.website.replace(/\/$/, "")}`;

    const candidateUrls = [
      base,
      `${base}/contact`,
      `${base}/contact-us`,
      `${base}/contacto`,
      `${base}/contatti`,
      `${base}/impressum`,
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (!res.ok) continue;
        const html = await res.text();
        const email = extractEmailFromText(html);
        if (email) {
          foundEmail = email;
          break;
        }
      } catch {
        // continue
      }
    }
  }

  // Step 2: Fallback to Gemini Google Search Grounding
  if (!foundEmail && process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Find the official B2B sales, export, or general contact email address for the food manufacturer "${supplier.company_name ?? ""}" (${supplier.country_of_origin ?? ""}) with website ${supplier.website ?? "unknown"}. Return ONLY the email address or "NONE".`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0,
        },
      });
      const email = extractEmailFromText(response.text ?? "");
      if (email) {
        foundEmail = email;
        source = "gemini_search";
      }
    } catch {
      // ignore
    }
  }

  if (foundEmail) {
    await supabaseAdmin
      .from("supplier_offerings")
      .update({ contact_email: foundEmail })
      .eq("id", supplier.id);
  }

  return { email: foundEmail, source };
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action:
      | "save_credentials"
      | "sync_replies"
      | "find_supplier_email"
      | "bulk_find_emails";
    user?: string;
    appPassword?: string;
    senderName?: string;
    supplierId?: string;
    supplierIds?: string[];
  };

  if (body.action === "save_credentials") {
    const user = body.user?.trim() ?? "";
    const appPassword = body.appPassword?.replace(/\s+/g, "").trim() ?? "";
    if (!user || !appPassword) {
      return NextResponse.json(
        {
          error:
            "Both Gmail address and 16-character App Password are required",
        },
        { status: 400 }
      );
    }

    await saveGmailCredentials({
      user,
      appPassword,
      senderName: body.senderName?.trim() || "FoodXchange Sourcing",
    });

    return NextResponse.json({
      ok: true,
      user,
      senderName: body.senderName?.trim() || "FoodXchange Sourcing",
    });
  }

  if (body.action === "sync_replies") {
    const result = await syncGmailInboxReplies();
    return NextResponse.json(result);
  }

  if (body.action === "find_supplier_email") {
    if (!body.supplierId) {
      return NextResponse.json(
        { error: "Missing supplierId" },
        { status: 400 }
      );
    }

    const { data: supplier } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin, contact_email")
      .eq("id", body.supplierId)
      .maybeSingle();

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const { email, source } = await discoverSupplierEmail(supplier);
    if (!email) {
      return NextResponse.json({
        ok: false,
        error: "Could not find a public email on supplier website",
      });
    }

    return NextResponse.json({
      ok: true,
      email,
      source,
    });
  }

  if (body.action === "bulk_find_emails") {
    const ids = Array.from(new Set(body.supplierIds ?? [])).slice(0, 8);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, foundCount: 0, foundMap: {} });
    }

    const { data: suppliers } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id, company_name, website, country_of_origin, contact_email")
      .in("id", ids);

    const foundMap: Record<string, string> = {};
    for (const sup of suppliers ?? []) {
      const { email } = await discoverSupplierEmail(sup);
      if (email) {
        foundMap[sup.id] = email;
      }
    }

    return NextResponse.json({
      ok: true,
      foundCount: Object.keys(foundMap).length,
      foundMap,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
