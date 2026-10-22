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

export function AuthNavDesktop({ isHebrew = false }: { isHebrew?: boolean }) {
  const router = useRouter();
  const state = usePortalAuthState();

  const ctaText = isHebrew ? "איתור יצרן (RFQ)" : "Start Sourcing →";
  const ctaHref = isHebrew ? "/he/sourcing" : "/en/sourcing";
  const signInText = isHebrew ? "כניסה" : "Sign in";

  if (state.status === "signed-in") {
    return (
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={state.portalHref}
          className="text-xs font-semibold text-slate-300 hover:text-orange-400 transition whitespace-nowrap"
        >
          {isHebrew ? "הפורטל שלי ←" : "My Portal →"}
        </Link>
        <button
          onClick={() => signOutAndRedirect(router)}
          className="border border-slate-700 text-slate-300 hover:border-orange-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isHebrew ? "התנתק" : "Sign Out"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <Link
        href="/en/login"
        className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 transition whitespace-nowrap"
      >
        {signInText}
      </Link>
      <Link
        href={ctaHref}
        className="bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 shadow-md shadow-orange-500/20"
      >
        {ctaText}
      </Link>
    </div>
  );
}

export function AuthNavMobile({
  onNavigate,
  isHebrew = false,
}: {
  onNavigate: () => void;
  isHebrew?: boolean;
}) {
  const router = useRouter();
  const state = usePortalAuthState();

  const ctaText = isHebrew ? "הגש בקשת רכש מהירה (RFQ) ←" : "Start Sourcing Request (RFQ) →";
  const ctaHref = isHebrew ? "/he/sourcing" : "/en/sourcing";
  const signInText = isHebrew ? "כניסה למערכת (Sign In)" : "Sign In to Portal";

  if (state.status === "signed-in") {
    return (
      <>
        <Link
          href={state.portalHref}
          onClick={onNavigate}
          className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
        >
          {isHebrew ? "הפורטל שלי ←" : "My Portal →"}
        </Link>
        <button
          onClick={() => {
            onNavigate();
            void signOutAndRedirect(router);
          }}
          className="block w-full text-center border border-orange-500/60 text-orange-400 hover:bg-orange-500 hover:text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
        >
          {isHebrew ? "התנתקות מהמערכת" : "Sign Out"}
        </button>
      </>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <Link
        href={ctaHref}
        onClick={onNavigate}
        className="block text-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition"
      >
        {ctaText}
      </Link>
      <Link
        href="/en/login"
        onClick={onNavigate}
        className="block text-center border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
      >
        {signInText}
      </Link>
    </div>
  );
}
