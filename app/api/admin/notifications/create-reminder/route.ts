import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    message?: string;
    dueDate?: string;
    email?: string;
    priority?: "normal" | "high" | "urgent";
    actionUrl?: string;
    companyName?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, message, dueDate, email, priority = "high", actionUrl, companyName } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .insert({
      type: "reminder",
      title: title.trim(),
      message: message?.trim() || null,
      data: {
        due_date: dueDate || null,
        email: email?.trim() || null,
        priority,
        action_url: actionUrl || "/admin/pipeline",
        company_name: companyName || null,
      },
      expires_at: expiresAt.toISOString(),
      read: false,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, reminder: data });
}
