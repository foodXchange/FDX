import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NotificationsHubClient from "@/components/admin/NotificationsHubClient";
import type { AdminNotification } from "@/lib/notifications/types";
import { getGmailCredentials } from "@/lib/email/gmailEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications & Outreach Hub | FoodXchange Admin",
};

export default async function AdminNotificationsHubPage() {
  const now = new Date().toISOString();

  const [
    { data: notifications },
    { count: totalCount },
    { count: unreadCount },
    { data: highScoreMatches },
    { data: recentLeads },
    gmailCreds,
  ] = await Promise.all([
    supabaseAdmin
      .from("admin_notifications")
      .select("*")
      .or(`expires_at.gt.${now},read.eq.false`)
      .order("created_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .or(`expires_at.gt.${now},read.eq.false`),
    supabaseAdmin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .or(`expires_at.gt.${now},read.eq.false`)
      .eq("read", false),
    supabaseAdmin
      .from("sourcing_matches")
      .select("id, request_id, company_name, product_name, match_score, status, created_at")
      .gte("match_score", 90)
      .eq("status", "suggested")
      .order("match_score", { ascending: false })
      .limit(4),
    supabaseAdmin
      .from("sourcing_requests")
      .select("id, name, company, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(3),
    getGmailCredentials(),
  ]);

  // Transform operational reminders
  const operationalReminders: AdminNotification[] = [];

  if (highScoreMatches) {
    for (const match of highScoreMatches) {
      operationalReminders.push({
        id: `rem-match-${match.id}`,
        type: "follow_up",
        title: `Priority Deal Review: ${match.match_score}% Match`,
        message: `${match.company_name || "Supplier"} ready for pipeline review: ${match.product_name || "Food Product"}`,
        data: {
          match_id: match.id,
          request_id: match.request_id,
          company_name: match.company_name,
          product_name: match.product_name,
          match_score: match.match_score,
        },
        read: false,
        read_at: null,
        created_at: match.created_at || now,
        expires_at: now,
        is_operational: true,
        action_url: `/admin/pipeline?search=${encodeURIComponent(match.company_name || "")}`,
        priority: "urgent",
      });
    }
  }

  if (recentLeads) {
    for (const lead of recentLeads) {
      if (lead.email) {
        operationalReminders.push({
          id: `rem-lead-${lead.id}`,
          type: "reminder",
          title: `Email Follow-Up: ${lead.company || lead.name || "Inbound Lead"}`,
          message: `Inbound request awaiting email outreach (${lead.email})`,
          data: {
            lead_id: lead.id,
            company_name: lead.company,
            contact_name: lead.name,
            contact_email: lead.email,
          },
          read: false,
          read_at: null,
          created_at: lead.created_at || now,
          expires_at: now,
          is_operational: true,
          action_url: "/admin/sourcing-requests",
          priority: "high",
        });
      }
    }
  }

  // Enrich notifications with action URLs
  const enrichedNotifications: AdminNotification[] = (notifications ?? []).map((n) => {
    let action_url = "/admin/pipeline";
    if (n.data?.action_url && typeof n.data.action_url === "string") {
      action_url = n.data.action_url;
    } else if (n.type === "lead" || n.type === "new_request") {
      action_url = "/admin/sourcing-requests";
    } else if (n.type === "supplier_signup") {
      action_url = "/admin/suppliers";
    } else if (n.data?.match_id) {
      action_url = `/admin/pipeline?matchId=${n.data.match_id}`;
    }

    return {
      ...n,
      action_url,
      priority:
        (n.data?.priority as "normal" | "high" | "urgent") ||
        (n.type === "match_reply" || n.type === "lead" ? "high" : "normal"),
    };
  });

  return (
    <NotificationsHubClient
      initialNotifications={enrichedNotifications}
      initialOperationalReminders={operationalReminders}
      initialTotalCount={(totalCount ?? 0) + operationalReminders.length}
      initialUnreadCount={(unreadCount ?? 0) + operationalReminders.length}
      gmailConfig={
        gmailCreds
          ? { user: gmailCreds.user, senderName: gmailCreds.senderName }
          : null
      }
    />
  );
}
