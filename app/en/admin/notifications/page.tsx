import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NotificationsTableClient from "@/components/admin/NotificationsTableClient";
import type { AdminNotification } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminNotificationsPage() {
  const now = new Date().toISOString();

  const [{ data: notifications }, { count: totalCount }] = await Promise.all([
    supabaseAdmin
      .from("admin_notifications")
      .select("*")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabaseAdmin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .gt("expires_at", now),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Notifications</h1>
      <NotificationsTableClient
        initialNotifications={(notifications ?? []) as AdminNotification[]}
        initialTotalCount={totalCount ?? 0}
      />
    </div>
  );
}
