import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: batchId } = await params;
  const format = req.nextUrl.searchParams.get("format") || "json";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10000", 10);

  // Verify batch exists
  const { data: batch, error: batchError } = await supabaseAdmin
    .from("scrape_batches")
    .select("id, batch_key, filenames")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return Response.json({ error: "Batch not found" }, { status: 404 });
  }

  // Fetch logs
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("scrape_batch_logs")
    .select(
      `
      id,
      supplier_id,
      row_index,
      result,
      products_found,
      message,
      source,
      meta,
      created_at
      `
    )
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (logsError) {
    return Response.json(
      { error: `Failed to fetch logs: ${logsError.message}` },
      { status: 500 }
    );
  }

  if (format === "csv") {
    // Generate CSV
    let csv =
      "id,supplier_id,row_index,result,products_found,message,source,created_at\n";
    logs?.forEach((log) => {
      const escaped = (s: string) =>
        `"${String(s).replace(/"/g, '""')}"`;
      csv += `${log.id},${escaped(log.supplier_id || "")},${log.row_index || ""},${escaped(log.result || "")},${log.products_found},${escaped(log.message || "")},${escaped(log.source || "")},${log.created_at}\n`;
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="batch-${batch.batch_key}-logs.csv"`,
      },
    });
  }

  // Default: JSON
  return Response.json({
    ok: true,
    batch: {
      id: batch.id,
      batch_key: batch.batch_key,
      filenames: batch.filenames,
    },
    logs: logs || [],
    count: logs?.length || 0,
  });
}
