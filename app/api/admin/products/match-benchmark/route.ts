import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { embedText } from "@/lib/ai/embed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "link_to_request" | "search_benchmark";
      requestId?: string;
      productIds?: string[];
      benchmarkText?: string;
      kosherRequired?: boolean;
      category?: string;
    };

    if (body.action === "link_to_request") {
      const { requestId, productIds } = body;
      if (!requestId || !productIds || productIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: "requestId and productIds are required" },
          { status: 400 }
        );
      }

      const [{ data: reqRow }, { data: products }] = await Promise.all([
        supabaseAdmin
          .from("sourcing_requests")
          .select("id, product_name, company, category, kosher, certifications, notes")
          .eq("id", requestId)
          .single(),
        supabaseAdmin
          .from("supplier_products")
          .select(
            "id, product_name, category, formats, sizes, certifications, kosher_types, private_label, description, supplier_id, supplier:supplier_offerings(company_name, country_of_origin)"
          )
          .in("id", productIds),
      ]);

      if (!reqRow || !products || products.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Request or products not found" },
          { status: 404 }
        );
      }

      let linkedCount = 0;
      for (const p of products) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = p as any;
        const sup = Array.isArray(prod.supplier) ? prod.supplier[0] : prod.supplier;
        const companyName = sup?.company_name ?? "Supplier";
        const country = sup?.country_of_origin ?? null;

        const reasons: string[] = ["Selected from Product Benchmark Matcher"];
        let score = 82;
        if (prod.kosher_types?.length > 0) {
          reasons.push(`Kosher: ${prod.kosher_types.join(", ")}`);
          score += 5;
        }
        if (prod.formats?.length > 0) {
          reasons.push(`Formats: ${prod.formats.slice(0, 3).join(", ")}`);
          score += 4;
        }
        if (prod.certifications?.length > 0) {
          reasons.push(`Certs: ${prod.certifications.slice(0, 3).join(", ")}`);
          score += 4;
        }
        score = Math.min(98, score);

        const summary = `${companyName}${country ? ` (${country})` : ""} manufactures ${
          prod.product_name
        }${prod.formats?.length ? ` in ${prod.formats.slice(0, 3).join(", ")}` : ""}${
          prod.kosher_types?.length ? ` with ${prod.kosher_types.join(", ")} kosher` : ""
        }. Matched against buyer request for ${reqRow.product_name ?? "benchmark product"}.`;

        const waMsg = `Hi ${companyName}, we have a buyer looking for ${
          reqRow.product_name ?? prod.product_name
        }${
          prod.formats?.length ? ` (formats: ${prod.formats.slice(0, 2).join(", ")})` : ""
        }. Could you share export availability and pricing for ${prod.product_name}?`;

        // Check if match already exists for (request_id, supplier_id)
        const { data: existing } = await supabaseAdmin
          .from("sourcing_matches")
          .select("id")
          .eq("request_id", requestId)
          .eq("supplier_id", prod.supplier_id)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabaseAdmin
            .from("sourcing_matches")
            .update({
              product_name: prod.product_name,
              match_score: score,
              match_summary: summary,
              whatsapp_message: waMsg,
              status: "approved",
              approved_at: new Date().toISOString(),
              match_breakdown: {
                kosher_types: prod.kosher_types ?? [],
                certifications: prod.certifications ?? [],
                formats: prod.formats ?? [],
                reasons,
              },
            })
            .eq("id", existing[0].id);
        } else {
          await supabaseAdmin.from("sourcing_matches").insert({
            request_id: requestId,
            supplier_id: prod.supplier_id,
            product_name: prod.product_name,
            company_name: companyName,
            country,
            match_score: score,
            match_summary: summary,
            whatsapp_message: waMsg,
            status: "approved",
            approved_at: new Date().toISOString(),
            match_breakdown: {
              kosher_types: prod.kosher_types ?? [],
              certifications: prod.certifications ?? [],
              formats: prod.formats ?? [],
              reasons,
            },
          });
        }
        linkedCount++;
      }

      return NextResponse.json({ ok: true, linkedCount });
    }

    if (body.action === "search_benchmark") {
      let queryText = (body.benchmarkText ?? "").trim();
      let reqKosher = Boolean(body.kosherRequired);

      if (body.requestId) {
        const { data: reqRow } = await supabaseAdmin
          .from("sourcing_requests")
          .select("product_name, category, kosher, certifications, notes, ai_brief")
          .eq("id", body.requestId)
          .single();
        if (reqRow) {
          queryText = [
            reqRow.product_name,
            reqRow.category,
            reqRow.notes,
            (reqRow.certifications ?? []).join(" "),
            queryText,
          ]
            .filter(Boolean)
            .join(". ");
          if (reqRow.kosher && reqRow.kosher !== "none" && reqRow.kosher !== "no") {
            reqKosher = true;
          }
        }
      }

      if (!queryText) {
        return NextResponse.json(
          { ok: false, error: "Provide a benchmark query or select a buyer request" },
          { status: 400 }
        );
      }

      // 1. Try semantic vector search via Voyage AI + match_supplier_products RPC
      let matchedIds: { id: string; similarity: number }[] = [];
      try {
        const vec = await embedText(queryText, "query");
        if (vec) {
          const { data: rpcRows } = await supabaseAdmin.rpc("match_supplier_products", {
            query_embedding: JSON.stringify(vec),
            match_threshold: 0.35,
            match_count: 60,
          });
          if (Array.isArray(rpcRows) && rpcRows.length > 0) {
            matchedIds = rpcRows.map((r: { id: string; similarity: number }) => ({
              id: r.id,
              similarity: r.similarity,
            }));
          }
        }
      } catch {}

      // 2. Fetch full product rows for the matched IDs (or keyword fallback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let productsData: any[] = [];
      if (matchedIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("supplier_products")
          .select(
            `id, product_name, category, certifications, kosher_types, formats, sizes,
             description, needs_review, scrape_confidence, manually_verified,
             private_label, image_url, supplier_id,
             supplier:supplier_offerings!inner(company_name, country_of_origin, status, logo_url, website)`
          )
          .in(
            "id",
            matchedIds.map((m) => m.id)
          );
        productsData = data ?? [];
      } else {
        const keywords = queryText
          .split(/[^a-zA-Z0-9]+/)
          .filter((w) => w.length >= 3)
          .slice(0, 4);
        const orFilter = keywords
          .map((k) => `product_name.ilike.%${k}%,description.ilike.%${k}%`)
          .join(",");
        let q = supabaseAdmin
          .from("supplier_products")
          .select(
            `id, product_name, category, certifications, kosher_types, formats, sizes,
             description, needs_review, scrape_confidence, manually_verified,
             private_label, image_url, supplier_id,
             supplier:supplier_offerings!inner(company_name, country_of_origin, status, logo_url, website)`
          )
          .limit(50);
        if (orFilter) q = q.or(orFilter);
        const { data } = await q;
        productsData = data ?? [];
      }

      const simMap = new Map(matchedIds.map((m) => [m.id, m.similarity]));
      const scored = productsData
        .map((p) => {
          const baseSim = simMap.get(p.id) ?? 0.65;
          let bonus = 0;
          if (reqKosher && p.kosher_types?.length > 0) bonus += 0.1;
          if (p.image_url) bonus += 0.04;
          if (p.formats?.length > 0) bonus += 0.04;
          const matchScore = Math.min(99, Math.round((baseSim + bonus) * 100));
          return { ...p, benchmarkMatchScore: matchScore };
        })
        .sort((a, b) => b.benchmarkMatchScore - a.benchmarkMatchScore);

      return NextResponse.json({
        ok: true,
        products: scored,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
