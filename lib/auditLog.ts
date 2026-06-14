import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface AdminAuditEntry {
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_email: entry.adminEmail,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    target_email: entry.targetEmail ?? null,
    metadata: entry.metadata ?? null,
  });
}
