import Link from "next/link";

export default function NoCompanyState() {
  return (
    <section className="px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="dark-card p-8 text-center">
          <p className="text-slate-200 font-medium">No company linked to this account yet</p>
          <p className="text-sm text-slate-400 mt-2 mb-5">
            We couldn&apos;t find a company registered with this email. If
            you&apos;ve already submitted your company, contact us and
            we&apos;ll link it. Otherwise, register your company to get
            started.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/en/suppliers/register"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
            >
              Register your company →
            </Link>
            <a
              href="https://wa.me/972525222291"
              className="btn-ghost inline-block px-5 py-2.5 rounded-md text-sm font-medium"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
