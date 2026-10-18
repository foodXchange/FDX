import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { NotificationType } from "@/lib/notifications/types";

export async function createNotification(
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, unknown>,
  expiresInDays: number = 90
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { error } = await supabaseAdmin.from("admin_notifications").insert({
    type,
    title,
    message: message ?? null,
    data: data ?? null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("createNotification failed:", error.message);
  }
}
