import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: batchId } = await params;

  const { data: batch, error: batchError } = await supabaseAdmin
    .from("scrape_batches")
    .select(
      `
      id,
      batch_key,
      filenames,
      status,
      total_rows,
      processed,
      success_count,
      failed_count,
      perplexity_fallback_count,
      skipped_count,
      products_found,
      created_at,
      updated_at
      `
    )
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return Response.json({ error: "Batch not found" }, { status: 404 });
  }

  // Calculate percentages
  const total = batch.processed || batch.total_rows || 0;
  const successRate =
    total > 0 ? ((batch.success_count || 0) / total * 100).toFixed(2) : 0;
  const failureRate =
    total > 0 ? ((batch.failed_count || 0) / total * 100).toFixed(2) : 0;
  const perplexityRate =
    total > 0 ? ((batch.perplexity_fallback_count || 0) / total * 100).toFixed(2) : 0;
  const skippedRate =
    total > 0 ? ((batch.skipped_count || 0) / total * 100).toFixed(2) : 0;

  return Response.json({
    ok: true,
    summary: {
      batch_id: batch.id,
      batch_key: batch.batch_key,
      filenames: batch.filenames,
      status: batch.status,
      total_rows: batch.total_rows,
      processed: batch.processed,
      success_count: batch.success_count,
      failed_count: batch.failed_count,
      perplexity_fallback_count: batch.perplexity_fallback_count,
      skipped_count: batch.skipped_count,
      products_found: batch.products_found,
      success_rate: parseFloat(successRate as string),
      failure_rate: parseFloat(failureRate as string),
      perplexity_rate: parseFloat(perplexityRate as string),
      skipped_rate: parseFloat(skippedRate as string),
      created_at: batch.created_at,
      updated_at: batch.updated_at,
      progress_percentage:
        batch.total_rows > 0
          ? ((batch.processed || 0) / batch.total_rows * 100).toFixed(0)
          : 0,
    },
  });
}
