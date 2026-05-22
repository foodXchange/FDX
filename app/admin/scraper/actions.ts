"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function approveSuppliers(ids: string[]): Promise<{ ok: boolean }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .update({ status: "approved" })
    .in("id", ids);
  if (error) return { ok: false };
  revalidatePath("/admin/scraper");
  return { ok: true };
}

export async function deleteSuppliers(ids: string[]): Promise<{ ok: boolean }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabaseAdmin
    .from("supplier_offerings")
    .delete()
    .in("id", ids);
  if (error) return { ok: false };
  revalidatePath("/admin/scraper");
  return { ok: true };
}
