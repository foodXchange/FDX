import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminNotification } from "@/lib/notifications/types";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const {
    limit = 20,
    offset = 0,
    unread_only = false,
    type,
    read,
    from,
    to,
    include_operational = true,
  } = body as {
    limit?: number;
    offset?: number;
    unread_only?: boolean;
    type?: string;
    read?: boolean;
    from?: string;
    to?: string;
    include_operational?: boolean;
  };

  const now = new Date().toISOString();

  // Query notifications keeping unread ones visible
  let listQuery = supabaseAdmin
    .from("admin_notifications")
    .select("*")
    .or(`expires_at.gt.${now},read.eq.false`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  let totalQuery = supabaseAdmin
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .or(`expires_at.gt.${now},read.eq.false`);

  const readFilter = unread_only ? false : read;
  if (readFilter !== undefined) {
    listQuery = listQuery.eq("read", readFilter);
    totalQuery = totalQuery.eq("read", readFilter);
  }
  if (type) {
    listQuery = listQuery.eq("type", type);
    totalQuery = totalQuery.eq("type", type);
  }
  if (from) {
    listQuery = listQuery.gte("created_at", from);
    totalQuery = totalQuery.gte("created_at", from);
  }
  if (to) {
    listQuery = listQuery.lte("created_at", to);
    totalQuery = totalQuery.lte("created_at", to);
  }

  const [{ data: notifications, error }, { count: totalCount }, { count: unreadCount }] =
    await Promise.all([
      listQuery,
      totalQuery,
      supabaseAdmin
        .from("admin_notifications")
        .select("*", { count: "exact", head: true })
        .or(`expires_at.gt.${now},read.eq.false`)
        .eq("read", false),
    ]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Generate real-time operational reminders if requested
  const operationalReminders: AdminNotification[] = [];

  if (include_operational && offset === 0) {
    try {
      const [highScoreRes, leadsRes] = await Promise.all([
        supabaseAdmin
          .from("sourcing_matches")
          .select("id, request_id, company_name, product_name, match_score, status, created_at")
          .gte("match_score", 90)
          .eq("status", "suggested")
          .order("match_score", { ascending: false })
          .limit(3),
        supabaseAdmin
          .from("sourcing_requests")
          .select("id, name, company, email, created_at, status")
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

      if (highScoreRes.data) {
        for (const match of highScoreRes.data) {
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

      if (leadsRes.data) {
        for (const lead of leadsRes.data) {
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
    } catch (e) {
      console.error("Operational reminder generation error:", e);
    }
  }

  // Enrich notifications with direct action_url and deep links
  const enrichedNotifications: AdminNotification[] = (notifications ?? []).map((n) => {
    let action_url = "/admin/pipeline";
    if (n.type === "lead" || n.type === "new_request") {
      action_url = "/admin/sourcing-requests";
    } else if (n.type === "supplier_signup") {
      action_url = "/admin/suppliers";
    } else if (n.data?.action_url && typeof n.data.action_url === "string") {
      action_url = n.data.action_url;
    } else if (n.data?.match_id) {
      action_url = `/admin/pipeline?matchId=${n.data.match_id}`;
    }

    return {
      ...n,
      action_url,
      priority: (n.data?.priority as "normal" | "high" | "urgent") || (n.type === "lead" ? "high" : "normal"),
    };
  });

  return Response.json({
    notifications: enrichedNotifications,
    operational_reminders: operationalReminders,
    unread_count: (unreadCount ?? 0) + operationalReminders.length,
    total_count: (totalCount ?? 0) + operationalReminders.length,
  });
}
