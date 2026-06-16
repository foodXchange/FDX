"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; portalHref: string };

function usePortalAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      const { data: profile } = await supabase
        .from("supplier_profiles")
        .select("supplier_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setState({
        status: "signed-in",
        portalHref: profile?.supplier_id ? "/en/supplier-portal" : "/en/portal",
      });
    }

    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

async function signOutAndRedirect(router: ReturnType<typeof useRouter>) {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/");
  router.refresh();
}

export function AuthNavDesktop() {
  const router = useRouter();
  const state = usePortalAuthState();

  if (state.status === "signed-in") {
    return (
      <div className="ml-2 flex items-center gap-3">
        <Link
          href={state.portalHref}
          className="text-sm font-medium text-slate-300 hover:text-orange-400 transition"
        >
          My Portal →
        </Link>
        <button
          onClick={() => signOutAndRedirect(router)}
          className="border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-md text-sm font-semibold transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="ml-2 flex items-center gap-3">
      <Link
        href="/en/login"
        className="text-sm text-slate-400 hover:text-white transition"
      >
        Sign in
      </Link>
      <Link
        href="/en/start"
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
      >
        Get Matched →
      </Link>
    </div>
  );
}

export function AuthNavMobile({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const state = usePortalAuthState();

  if (state.status === "signed-in") {
    return (
      <>
        <Link
          href={state.portalHref}
          onClick={onNavigate}
          className="block px-4 py-2 rounded text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          My Portal →
        </Link>
        <button
          onClick={() => {
            onNavigate();
            void signOutAndRedirect(router);
          }}
          className="block w-full text-center border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-md text-sm font-semibold transition"
        >
          Sign Out
        </button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/en/start"
        onClick={onNavigate}
        className="block text-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
      >
        Get Matched →
      </Link>
      <Link
        href="/en/login"
        onClick={onNavigate}
        className="block px-4 py-2 rounded text-sm text-slate-400 hover:bg-slate-800 transition"
      >
        Sign in
      </Link>
    </>
  );
}
