"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/en/supplier-portal/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="btn-ghost px-3 py-1.5 rounded-md text-xs font-medium"
    >
      Sign out
    </button>
  );
}
