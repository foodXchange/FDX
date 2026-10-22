import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  MeetingsManagerClient,
  type UnifiedMeeting,
} from "@/components/admin/meetings/MeetingsManagerClient";

export const metadata: Metadata = {
  title: "Meetings & Video Calls Hub | Admin",
};

export const revalidate = 0;

export default async function AdminMeetingsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    redirect("/admin/login?next=/admin/meetings");
  }

  // 1. Fetch meetings from sourcing_matches
  const { data: matches } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, supplier_id, company_name, product_name, match_score, match_breakdown")
    .not("match_breakdown", "is", null);

  // 2. Fetch calls from card_views
  const { data: cardCalls } = await supabaseAdmin
    .from("card_views")
    .select("id, handle, event, metadata, created_at")
    .eq("event", "contact_card_call_scheduled")
    .order("created_at", { ascending: false });

  const unified: UnifiedMeeting[] = [];

  // Parse Match meetings
  for (const match of matches ?? []) {
    const breakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
    const rawMeetings = Array.isArray(breakdown.meetings) ? breakdown.meetings : [];
    if (breakdown.active_meeting && typeof breakdown.active_meeting === "object") {
      const active = breakdown.active_meeting as Record<string, unknown>;
      if (!rawMeetings.some((m: any) => m.id === active.id)) {
        rawMeetings.push(active);
      }
    }

    for (const m of rawMeetings) {
      if (!m.start_time || !m.meet_url) continue;

      const attendees = Array.isArray(m.attendees) ? m.attendees : [];
      const primaryAttendee = attendees[0] || "Buyer Representative";

      unified.push({
        id: m.id || `match_meet_${match.id}`,
        source: "match_deal",
        title: m.title || `Commercial Alignment: ${match.product_name} (${match.company_name})`,
        startTime: m.start_time,
        endTime: m.end_time || new Date(new Date(m.start_time).getTime() + 30 * 60000).toISOString(),
        meetUrl: m.meet_url,
        gcalUrl: m.gcal_url || undefined,
        status: new Date(m.start_time) > new Date() ? "upcoming" : "completed",
        attendeeName: primaryAttendee.split("@")[0] || "Trader",
        attendeeEmail: primaryAttendee,
        company: match.company_name,
        audience: "supplier",
        topic: m.agenda_notes || `CIF Pricing, Kosher Standard & Samples for ${match.product_name}`,
        deal: {
          id: match.id,
          company_name: match.company_name,
          product_name: match.product_name,
          match_score: match.match_score ?? 90,
        },
      });
    }
  }

  // Parse Card scheduled calls
  for (const row of cardCalls ?? []) {
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    if (!meta.startTime || !meta.meetUrl) continue;

    const startDate = new Date(meta.startTime as string);
    const endDate = new Date(startDate.getTime() + 15 * 60000);

    unified.push({
      id: `card_call_${row.id}`,
      source: "business_card",
      title: `FoodXchange Intro (15 Min) — ${meta.name || "Guest"}${meta.company ? ` (${meta.company})` : ""}`,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      meetUrl: meta.meetUrl as string,
      status: startDate > new Date() ? "upcoming" : "completed",
      attendeeName: (meta.name as string) || "Guest",
      attendeeEmail: (meta.email as string) || "No email",
      attendeePhone: (meta.phone as string) || undefined,
      company: (meta.company as string) || undefined,
      audience: (meta.audience as "buyer" | "supplier") || "buyer",
      topic: "15-Minute Digital Business Card Intro Meeting",
    });
  }

  // Sort: upcoming soonest first, completed most recent first
  const now = Date.now();
  unified.sort((a, b) => {
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    const aIsFuture = aTime >= now;
    const bIsFuture = bTime >= now;

    if (aIsFuture && bIsFuture) return aTime - bTime;
    if (!aIsFuture && !bIsFuture) return bTime - aTime;
    return aIsFuture ? -1 : 1;
  });

  return <MeetingsManagerClient initialMeetings={unified} />;
}
