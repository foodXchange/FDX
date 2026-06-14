import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { NotificationType } from "@/lib/notifications/types";

export async function createNotification(
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_notifications").insert({
    type,
    title,
    message: message ?? null,
    data: data ?? null,
  });

  if (error) {
    console.error("createNotification failed:", error.message);
  }
}
