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
  } = body as {
    limit?: number;
    offset?: number;
    unread_only?: boolean;
    type?: string;
    read?: boolean;
    from?: string;
    to?: string;
  };

  const now = new Date().toISOString();

  let listQuery = supabaseAdmin
    .from("admin_notifications")
    .select("*")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  let totalQuery = supabaseAdmin
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .gt("expires_at", now);

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
        .gt("expires_at", now)
        .eq("read", false),
    ]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
    total_count: totalCount ?? 0,
  });
}
