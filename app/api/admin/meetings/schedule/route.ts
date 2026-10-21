import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { logEvent } from "@/lib/events/logEvent";

const ScheduleSchema = z.object({
  matchId: z.string().uuid(),
  meetingTitle: z.string().trim().min(2),
  startTime: z.string().min(10), // ISO string or datetime-local
  durationMinutes: z.number().int().min(15).max(180).default(30),
  meetUrl: z.string().url().optional(),
  attendees: z.array(z.string().email()).default([]),
  agendaNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    matchId,
    meetingTitle,
    startTime,
    durationMinutes,
    meetUrl,
    attendees,
    agendaNotes,
  } = parsed.data;

  // Fetch match details
  const { data: match, error: matchErr } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, request_id, supplier_id, company_name, product_name, match_breakdown")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Generate Google Meet URL if not provided
  const generatedMeetUrl =
    meetUrl ||
    `https://meet.google.com/fdx-${matchId.slice(0, 3)}-${matchId.slice(3, 7)}-${matchId.slice(7, 10)}`;

  // Calculate End Time
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Generate Google Calendar Link
  const gCalTitle = encodeURIComponent(meetingTitle);
  const gCalDetails = encodeURIComponent(
    `FoodXchange Video Meeting: Commercial Sourcing Alignment\nProduct: ${match.product_name}\nFactory: ${match.company_name}\n\nJoin Google Meet: ${generatedMeetUrl}\n\nAgenda:\n${agendaNotes || "Review specifications, CIF Haifa pricing, and tasting sample dispatch."}`
  );
  const gCalDates = `${startDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}`;
  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDates}&details=${gCalDetails}&location=${encodeURIComponent(generatedMeetUrl)}`;

  const meetingRecord = {
    id: `meet_${Date.now()}`,
    title: meetingTitle,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    duration_minutes: durationMinutes,
    meet_url: generatedMeetUrl,
    gcal_url: gCalUrl,
    attendees,
    agenda_notes: agendaNotes || null,
    created_at: new Date().toISOString(),
    status: "scheduled",
  };

  const prevBreakdown = (match.match_breakdown as Record<string, unknown> | null) ?? {};
  const prevMeetings = Array.isArray(prevBreakdown.meetings) ? prevBreakdown.meetings : [];

  const updatedBreakdown: Record<string, unknown> = {
    ...prevBreakdown,
    active_meeting: meetingRecord,
    meetings: [...prevMeetings, meetingRecord],
  };

  // Update match
  await supabaseAdmin
    .from("sourcing_matches")
    .update({
      match_breakdown: updatedBreakdown,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // Post invite into match_messages
  await supabaseAdmin.from("match_messages").insert({
    match_id: matchId,
    sender_type: "admin",
    message: `[GOOGLE MEET VIDEO CALL SCHEDULED]\nTitle: ${meetingTitle}\nDate: ${startDate.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" })} (Israel Time / IDT)\nJoin URL: ${generatedMeetUrl}\nAdd to Calendar: ${gCalUrl}\nAgenda: ${agendaNotes || "Commercial alignment & sample review."}`,
  });

  // Log event
  void logEvent(null, "admin", "meeting_scheduled", "match", matchId, {
    request_id: match.request_id,
    supplier_id: match.supplier_id,
    meet_url: generatedMeetUrl,
  });

  return NextResponse.json({
    ok: true,
    meeting: meetingRecord,
  });
}
