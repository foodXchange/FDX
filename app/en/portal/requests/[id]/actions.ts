"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MatchRow = {
  id: string;
  viewed_by_buyer_at: string | null;
  sourcing_requests: { auth_user_id: string | null } | null;
};

export async function markMatchViewedByBuyer(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabaseAdmin
    .from("sourcing_matches")
    .select("id, viewed_by_buyer_at, sourcing_requests(auth_user_id)")
    .eq("id", matchId)
    .single();

  const match = data as unknown as MatchRow | null;
  if (!match || match.viewed_by_buyer_at) return;
  if (match.sourcing_requests?.auth_user_id !== user.id) return;

  await supabaseAdmin
    .from("sourcing_matches")
    .update({ viewed_by_buyer_at: new Date().toISOString() })
    .eq("id", matchId);
}
