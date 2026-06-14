import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { recalculateAndSaveTrustScore } from "@/lib/suppliers/trustScore";

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(session && (await verifySession(session)));
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const breakdown = await recalculateAndSaveTrustScore(id);

  revalidatePath(`/admin/suppliers/${id}`);
  revalidatePath("/admin/suppliers");

  return Response.json({ ok: true, score: breakdown.total, breakdown });
}
