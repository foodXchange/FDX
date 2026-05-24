import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { product_name: string; public_message: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.product_name || !body.public_message) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: current } = await supabaseAdmin
    .from("sourcing_requests")
    .select("status")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = {
    is_published: true,
    published_product_name: body.product_name,
    published_message: body.public_message,
  };

  if (current?.status === "new") {
    updateData.status = "reviewed";
  }

  const { error } = await supabaseAdmin
    .from("sourcing_requests")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Publish error:", error);
    return Response.json({ error: "Failed to publish" }, { status: 500 });
  }

  revalidatePath("/en/sourcing-board");
  return Response.json({ ok: true, status: updateData.status ?? current?.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("sourcing_requests")
    .update({ is_published: false })
    .eq("id", id);

  if (error) {
    console.error("Unpublish error:", error);
    return Response.json({ error: "Failed to unpublish" }, { status: 500 });
  }

  revalidatePath("/en/sourcing-board");
  return Response.json({ ok: true });
}
