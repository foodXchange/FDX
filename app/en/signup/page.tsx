import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | FoodXchange",
};

export default function SignupPage() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-sm mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-slate-400 text-sm mb-10">
          Are you joining as a buyer or a supplier?
        </p>

        <div className="flex flex-col gap-4 mb-10">
          <Link
            href="/en/signup/buyer"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-lg font-semibold text-sm transition text-center"
          >
            I&apos;m a Buyer →
          </Link>
          <Link
            href="/en/signup/supplier"
            className="w-full border border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white px-6 py-4 rounded-lg font-semibold text-sm transition text-center"
          >
            I&apos;m a Supplier / Manufacturer →
          </Link>
        </div>

        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/en/login" className="text-orange-400 hover:text-orange-300">
            Sign in →
          </Link>
        </p>
      </div>
    </section>
  );
}
