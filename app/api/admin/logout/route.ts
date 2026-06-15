import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/adminAuth";
import { getOriginFromHeaders } from "@/lib/getOrigin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  const origin = getOriginFromHeaders(req.headers);
  return Response.redirect(new URL("/admin/login", origin));
}
