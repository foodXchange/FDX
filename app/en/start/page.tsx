import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started | FoodXchange",
};

export default function StartPage() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">What are you looking for?</h1>
        <p className="text-slate-400 text-sm mb-10">
          We&apos;ll take it from there.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/en/signup/buyer"
            className="group flex items-start gap-4 rounded-2xl border border-slate-700 hover:border-orange-500/50 bg-slate-800/50 hover:bg-slate-800 p-5 transition-all"
          >
            <span className="text-2xl shrink-0 mt-0.5">🛒</span>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                I need to find a supplier
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                I&apos;m a retailer or importer in Israel looking for food products
              </p>
            </div>
          </Link>

          <Link
            href="/en/signup/supplier"
            className="group flex items-start gap-4 rounded-2xl border border-slate-700 hover:border-orange-500/50 bg-slate-800/50 hover:bg-slate-800 p-5 transition-all"
          >
            <span className="text-2xl shrink-0 mt-0.5">🏭</span>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                I want to sell to Israel
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                I&apos;m a manufacturer or exporter looking to reach Israeli buyers
              </p>
            </div>
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Already on the platform?{" "}
          <Link href="/en/login" className="text-orange-400 hover:text-orange-300">
            Sign in →
          </Link>
        </p>
      </div>
    </section>
  );
}
