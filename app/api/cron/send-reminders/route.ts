import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupplierContactEmail } from "@/lib/email/supplierOutreach";
import { sendSupplierActionReminder } from "@/lib/email/mailer";
import { logEvent } from "@/lib/events/logEvent";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 3-day reminders
  const { data: actions3d } = await supabaseAdmin
    .from("supplier_actions")
    .select("id, supplier_id, request_message")
    .eq("status", "pending")
    .lte("created_at", threeDaysAgo)
    .is("last_reminder_3d_sent", null);

  let sent_3d = 0;
  for (const action of actions3d ?? []) {
    try {
      const [contactEmail, { data: offering }] = await Promise.all([
        getSupplierContactEmail(action.supplier_id as string),
        supabaseAdmin
          .from("supplier_offerings")
          .select("company_name")
          .eq("id", action.supplier_id as string)
          .maybeSingle(),
      ]);

      if (!contactEmail || !offering?.company_name) continue;

      await sendSupplierActionReminder(
        { company_name: offering.company_name as string, email: contactEmail },
        { request_message: action.request_message as string | null },
        3
      );

      await supabaseAdmin
        .from("supplier_actions")
        .update({ last_reminder_3d_sent: now.toISOString() })
        .eq("id", action.id as string);

      void logEvent(null, "admin", "supplier_action_reminder_3d", "supplier", action.supplier_id as string, {
        action_id: action.id,
      });

      sent_3d++;
    } catch (err) {
      console.error("send-reminders 3d failed for action", action.id, err);
    }
  }

  // 7-day reminders
  const { data: actions7d } = await supabaseAdmin
    .from("supplier_actions")
    .select("id, supplier_id, request_message")
    .eq("status", "pending")
    .lte("created_at", sevenDaysAgo)
    .is("last_reminder_7d_sent", null);

  let sent_7d = 0;
  for (const action of actions7d ?? []) {
    try {
      const [contactEmail, { data: offering }] = await Promise.all([
        getSupplierContactEmail(action.supplier_id as string),
        supabaseAdmin
          .from("supplier_offerings")
          .select("company_name")
          .eq("id", action.supplier_id as string)
          .maybeSingle(),
      ]);

      if (!contactEmail || !offering?.company_name) continue;

      await sendSupplierActionReminder(
        { company_name: offering.company_name as string, email: contactEmail },
        { request_message: action.request_message as string | null },
        7
      );

      await supabaseAdmin
        .from("supplier_actions")
        .update({ last_reminder_7d_sent: now.toISOString() })
        .eq("id", action.id as string);

      void logEvent(null, "admin", "supplier_action_reminder_7d", "supplier", action.supplier_id as string, {
        action_id: action.id,
      });

      sent_7d++;
    } catch (err) {
      console.error("send-reminders 7d failed for action", action.id, err);
    }
  }

  return NextResponse.json({ sent_3d, sent_7d });
}
