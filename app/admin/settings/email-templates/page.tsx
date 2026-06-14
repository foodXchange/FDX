import { supabaseAdmin } from "@/lib/supabaseAdmin";
import EmailTemplatesClient, { type EmailTemplateRow } from "@/components/admin/EmailTemplatesClient";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const { data: rows } = await supabaseAdmin
    .from("supplier_email_templates")
    .select("id, name, channel, subject, body")
    .order("name");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <EmailTemplatesClient templates={(rows ?? []) as EmailTemplateRow[]} />
    </div>
  );
}
