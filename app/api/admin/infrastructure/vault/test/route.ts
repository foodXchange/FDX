import { NextRequest, NextResponse } from "next/server";
import { testApiKeyHealth, readEnvLocal } from "@/lib/admin/infrastructureEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, explicitValue } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: false, error: "Key name is required" }, { status: 400 });
    }

    const env = readEnvLocal();
    const value = explicitValue || env[key] || process.env[key] || "";

    const result = await testApiKeyHealth(key, value);

    return NextResponse.json({
      ok: true,
      key,
      ...result,
    });
  } catch (error: any) {
    console.error("Vault test error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Failed to test key" }, { status: 500 });
  }
}
