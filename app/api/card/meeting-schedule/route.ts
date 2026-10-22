import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/notifications/createNotification";
import { checkRateLimit } from "@/lib/rateLimit";

const ScheduleSchema = z.object({
  handle: z.string().trim().min(1).default("udi"),
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required"),
  company: z.string().trim().max(100).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  audience: z.enum(["buyer", "supplier", "other"]).default("buyer"),
  topic: z.string().trim().max(500).optional().default(""),
  startTime: z.string().min(10, "Meeting time is required"),
});

function generateIcs(params: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
}) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatUtc = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const dtStamp = formatUtc(new Date());
  const dtStart = formatUtc(params.start);
  const dtEnd = formatUtc(params.end);
  const uid = `fdx-meet-${params.start.getTime()}-${Math.random().toString(36).substring(2, 7)}@fdx.trading`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FoodXchange//Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN=${params.organizerName}:mailto:${params.organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${params.attendeeName}:mailto:${params.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: FoodXchange Intro Call in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many scheduling attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { handle, name, email, company, phone, audience, topic, startTime } = parsed.data;

  const startDate = new Date(startTime);
  if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 60000) {
    return NextResponse.json({ error: "Please select a valid future date and time." }, { status: 400 });
  }

  // 15-minute intro meeting
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);

  // Generate standardized Google Meet URL
  const randomSuffix = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}`;
  const meetUrl = `https://meet.google.com/fdx-${randomSuffix}`;

  const meetingTitle = `FoodXchange Intro (15 Min) — Udi Stryk & ${name}${company ? ` (${company})` : ""}`;
  const meetingDescription = `15-Minute Commercial Alignment Call with Udi Stryk (FoodXchange)\nRole: ${audience.toUpperCase()}\nCompany: ${company || "—"}\nAttendee: ${name} (${email}, ${phone || "no phone"})\nTopic: ${topic || "General sourcing intro & European manufacturer network"}\n\nJoin Google Meet: ${meetUrl}`;

  // Google Calendar URL
  const gCalTitle = encodeURIComponent(meetingTitle);
  const gCalDetails = encodeURIComponent(meetingDescription);
  const gCalDates = `${startDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}`;
  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDates}&details=${gCalDetails}&location=${encodeURIComponent(meetUrl)}`;

  // ICS File
  const icsContent = generateIcs({
    title: meetingTitle,
    description: meetingDescription,
    location: meetUrl,
    start: startDate,
    end: endDate,
    organizerEmail: "udi@fdx.trading",
    organizerName: "Udi Stryk",
    attendeeEmail: email,
    attendeeName: name,
  });

  // Track in card_views telemetry
  try {
    await supabaseAdmin.from("card_views").insert({
      handle,
      event: "contact_card_call_scheduled",
      metadata: {
        name,
        email,
        company,
        audience,
        startTime: startDate.toISOString(),
        meetUrl,
      },
    });
  } catch (err) {
    console.error("Card tracking error:", err);
  }

  // Admin Notification
  void createNotification(
    "lead",
    `📅 New 15-Min Intro Call Booked: ${name}`,
    `${name} (${company || audience}) scheduled a 15-min call on ${startDate.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" })} IDT. Meet: ${meetUrl}`,
    {
      attendee_name: name,
      attendee_email: email,
      company,
      audience,
      start_time: startDate.toISOString(),
      meet_url: meetUrl,
    }
  );

  // Email notifications via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.NOTIFY_EMAIL_FROM || "FoodXchange <info@foodz-x.com>";
      const udiEmail = process.env.NOTIFY_EMAIL_TO || "udi@fdx.trading";

      // 1. Alert Udi
      await resend.emails.send({
        from: fromEmail,
        to: udiEmail,
        replyTo: email,
        subject: `📅 [Card Booking] 15-Min Intro Call with ${name} (${company || audience})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">New 15-Minute Intro Call Scheduled</h2>
            <p style="color: #475569;">A call was booked via your digital business card (<strong>fdx.trading/business-card/${handle}</strong>).</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
              <tr><td style="padding: 10px 14px; color: #64748b; width: 140px; border-bottom: 1px solid #e2e8f0;">Date & Time</td><td style="padding: 10px 14px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${startDate.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" })} (Israel Time / IDT)</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Attendee</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${name} (${audience.toUpperCase()})</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Company</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${company || "—"}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Contact</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">Email: <a href="mailto:${email}">${email}</a><br/>Phone: ${phone || "—"}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Google Meet</td><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;"><a href="${meetUrl}" style="color: #0284c7; font-weight: 600;">${meetUrl}</a></td></tr>
              ${topic ? `<tr><td style="padding: 10px 14px; color: #64748b;">Discussion Topic</td><td style="padding: 10px 14px; color: #0f172a;">${topic}</td></tr>` : ""}
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${gCalUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Add to Google Calendar &rarr;</a>
            </div>
          </div>
        `,
      });

      // 2. Confirmation to Attendee
      await resend.emails.send({
        from: fromEmail,
        to: email,
        replyTo: "udi@fdx.trading",
        subject: `Confirmed: 15-Min Intro Call with Udi Stryk (FoodXchange)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Intro Call Confirmed ✓</h2>
            <p style="color: #475569;">Hi ${name}, your 15-minute video call with <strong>Udi Stryk</strong> (Founder & Operator, FoodXchange) is confirmed.</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #F47920;">
              <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                📅 ${startDate.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem" })} (Israel Time / IDT)
              </p>
              <p style="margin: 0; font-size: 14px; color: #475569;">
                🔗 Video Room: <a href="${meetUrl}" style="color: #0284c7; font-weight: 600;">${meetUrl}</a>
              </p>
            </div>
            <div style="margin-top: 24px; display: flex; gap: 12px;">
              <a href="${gCalUrl}" style="display: inline-block; background: #F47920; color: #ffffff; font-weight: 600; font-size: 13px; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Add to Google Calendar</a>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Scheduler email error:", emailErr);
    }
  }

  return NextResponse.json({
    ok: true,
    meetUrl,
    gCalUrl,
    icsContent,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  });
}
