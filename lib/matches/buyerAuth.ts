import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type OwnableRequest = {
  email: string | null;
  buyer_id: string | null;
};

/**
 * A buyer owns a sourcing_request if it's addressed to their email directly,
 * or if it belongs to a `buyers` row whose contact_email matches them.
 */
export async function buyerOwnsRequest(
  request: OwnableRequest,
  userEmail: string | null | undefined
): Promise<boolean> {
  if (!userEmail) return false;
  if (request.email === userEmail) return true;
  if (!request.buyer_id) return false;

  const { data: buyer } = await supabaseAdmin
    .from("buyers")
    .select("contact_email")
    .eq("id", request.buyer_id)
    .maybeSingle();

  return buyer?.contact_email === userEmail;
}
