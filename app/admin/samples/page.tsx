import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminSamplesClient, { type SampleKitRow } from "@/components/admin/AdminSamplesClient";

export const metadata = {
  title: "Tasting Samples Desk | FoodXchange Admin",
};

export default async function AdminSamplesPage() {
  const { data: rawSamples, error } = await supabaseAdmin
    .from("sourcing_requests")
    .select(
      "id, name, email, company, whatsapp, product_name, category, packaging_preference, message, status, created_at, session_id, internal_notes, ai_analysis"
    )
    .or("source.eq.sample_kit,message.ilike.%[Tasting Sample Kit Dispatch Request%")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("Error loading sample requests for admin:", error);
  }

  const initialSamples = (rawSamples ?? []) as unknown as SampleKitRow[];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <AdminSamplesClient initialSamples={initialSamples} />
    </div>
  );
}
