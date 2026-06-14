import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supabase/getSupplierContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NoCompanyState from "@/components/supplier-portal/NoCompanyState";
import ProfileForm from "@/components/supplier-portal/ProfileForm";

export default async function SupplierPortalProfilePage() {
  const ctx = await getSupplierContext();
  if (!ctx) redirect("/en/supplier-portal/login");
  if (!ctx.supplierId) return <NoCompanyState />;

  const { data: supplier } = await supabaseAdmin
    .from("supplier_offerings")
    .select("company_name, website, product_description")
    .eq("id", ctx.supplierId)
    .maybeSingle();

  return (
    <section className="px-6 py-12">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Profile</h1>
        <ProfileForm
          email={ctx.user.email ?? ""}
          name={ctx.profile?.name ?? ""}
          phone={ctx.profile?.phone ?? ""}
          companyName={supplier?.company_name ?? ""}
          website={supplier?.website ?? ""}
          productDescription={supplier?.product_description ?? ""}
        />
      </div>
    </section>
  );
}
