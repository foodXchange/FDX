import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";

export type MatchRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  status: string | null;
  supplier_response: string | null;
  closed_at: string | null;
  product_name: string | null;
  company_name: string | null;
  sourcing_requests: { auth_user_id: string | null; email: string | null } | null;
};

export type Party =
  | { role: "admin" }
  | { role: "buyer"; userId: string }
  | { role: "supplier"; userId: string };

export async function loadMatch(matchId: string): Promise<MatchRow | null> {
  const { data } = await supabaseAdmin
    .from("sourcing_matches")
    .select(
      "id, request_id, supplier_id, status, supplier_response, closed_at, product_name, company_name, sourcing_requests(auth_user_id, email)"
    )
    .eq("id", matchId)
    .single();

  return (data as unknown as MatchRow) ?? null;
}

export async function resolveParty(match: MatchRow): Promise<Party | null> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (adminCookie && (await verifySession(adminCookie))) {
    return { role: "admin" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (match.sourcing_requests?.auth_user_id === user.id) {
    return { role: "buyer", userId: user.id };
  }

  const { data: profile } = await supabaseAdmin
    .from("supplier_profiles")
    .select("id, supplier_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.supplier_id === match.supplier_id) {
    return { role: "supplier", userId: user.id };
  }

  return null;
}
