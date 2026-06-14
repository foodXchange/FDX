import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProfileForm from "@/components/portal/ProfileForm";

export default async function PortalProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/portal/login");

  const { data: profile } = await supabaseAdmin
    .from("buyer_profiles")
    .select("name, company, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <section className="px-6 py-12">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Profile</h1>
        <ProfileForm
          email={user.email ?? ""}
          name={profile?.name ?? ""}
          company={profile?.company ?? ""}
          phone={profile?.phone ?? ""}
        />
      </div>
    </section>
  );
}
