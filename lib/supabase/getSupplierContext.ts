import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface SupplierProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  supplier_id: string | null;
}

export interface SupplierContext {
  user: { id: string; email?: string };
  profile: SupplierProfile | null;
  supplierId: string | null;
}

export async function getSupplierContext(): Promise<SupplierContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("supplier_profiles")
    .select("id, email, name, phone, supplier_id")
    .eq("id", user.id)
    .maybeSingle();

  let supplierId = profile?.supplier_id ?? null;

  // Claim an existing supplier_offerings row by contact email, mirroring
  // the buyer portal's "claim orphaned requests" pattern.
  if (!supplierId && user.email) {
    const { data: claimed } = await supabaseAdmin
      .from("supplier_offerings")
      .select("id")
      .is("auth_user_id", null)
      .eq("contact_email", user.email)
      .limit(1)
      .maybeSingle();

    if (claimed) {
      supplierId = claimed.id;
      await supabaseAdmin
        .from("supplier_offerings")
        .update({ auth_user_id: user.id })
        .eq("id", claimed.id);
      await supabaseAdmin
        .from("supplier_profiles")
        .update({ supplier_id: claimed.id, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile: (profile as SupplierProfile | null) ?? null,
    supplierId,
  };
}
