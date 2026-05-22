import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all factories that have kosher certifications
    const { data: factories, error: factoriesErr } = await supabaseAdmin
      .from("supplier_factories")
      .select(
        "id, kosher_types, certifications_quality, certifications_dietary"
      );

    if (factoriesErr || !factories) {
      return Response.json({ ok: false, error: "Failed to fetch factories" }, { status: 500 });
    }

    let totalUpdated = 0;

    for (const factory of factories as {
      id: string;
      kosher_types: string[];
      certifications_quality: string[];
      certifications_dietary: string[];
    }[]) {
      const mergedCerts = [
        ...new Set([
          ...(factory.kosher_types ?? []),
          ...(factory.certifications_quality ?? []),
          ...(factory.certifications_dietary ?? []),
        ]),
      ];

      const { data, error } = await supabaseAdmin
        .from("supplier_products")
        .update({
          kosher_types: factory.kosher_types,
          certifications: mergedCerts,
        })
        .eq("factory_id", factory.id)
        .eq("product_override_kosher", false)
        .select("id");

      if (!error && data) {
        totalUpdated += data.length;
      }

      // Auto-publish high-confidence kosher products
      const kosherTypes = factory.kosher_types ?? [];
      if (kosherTypes.length > 0) {
        await supabaseAdmin
          .from("supplier_products")
          .update({ is_published: true })
          .eq("factory_id", factory.id)
          .eq("product_override_kosher", false)
          .gte("scrape_confidence", 0.6)
          .eq("needs_review", false);
      }
    }

    return Response.json({ ok: true, updated: totalUpdated });
  } catch (err) {
    console.error("sync-factory-certs error:", err);
    return Response.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
