import { NextRequest, NextResponse } from "next/server";
import { updateEnvLocalKey, testApiKeyHealth } from "@/lib/admin/infrastructureEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          ok: false,
          error: "Direct .env.local mutation is disabled in production builds. Update secrets via Netlify/Supabase dashboard.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof key !== "string" || !value || typeof value !== "string") {
      return NextResponse.json({ ok: false, error: "Key and value are required strings" }, { status: 400 });
    }

    // Security check: only allow known safe environment variable keys
    const ALLOWED_KEYS = [
      "GEMINI_API_KEY",
      "FIRECRAWL_API_KEY",
      "VOYAGE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "RESEND_API_KEY",
      "GROQ_API_KEY",
      "PERPLEXITY_API_KEY",
      "NETLIFY_AUTH_TOKEN",
      "ANTHROPIC_API_KEY",
      "ADMIN_PASSWORD",
    ];

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ ok: false, error: "Unauthorized key modification" }, { status: 403 });
    }

    const success = updateEnvLocalKey(key, value.trim());
    if (!success) {
      return NextResponse.json({ ok: false, error: "Failed to write to .env.local file" }, { status: 500 });
    }

    // Test health of the newly saved key
    const testResult = await testApiKeyHealth(key, value.trim());

    return NextResponse.json({
      ok: true,
      message: `Successfully updated ${key} in .env.local`,
      testResult,
    });
  } catch (error: any) {
    console.error("Vault update error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}
