import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="bg-slate-50 min-h-screen py-16 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Internal Tools
          </h1>
          <p className="text-slate-600 mt-2 text-sm">
            Manage content, media, and newsletters.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* BLOG EDITOR (NEW ✅) */}
          <Link
            href="/en/admin/blog-editor"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Content</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Blog editor
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Write → preview → publish articles
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg group-hover:translate-x-0.5 transition">
                →
              </div>
            </div>
          </Link>

          {/* BLOG IMAGES */}
          <Link
            href="/en/admin/blog-cover"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Media</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Blog images
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Manage cover + hero images
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg">→</div>
            </div>
          </Link>

          {/* NEWSLETTER COVER */}
          <Link
            href="/en/admin/upload"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Newsletter</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Newsletter covers
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Upload → assign → live
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg">→</div>
            </div>
          </Link>

          {/* ✅ NEW: NEWSLETTER GENERATOR */}
          <Link
            href="/en/admin/newsletter-builder"
            className="group bg-white border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition bg-green-50/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-green-700">Automation</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Newsletter generator
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Select posts → generate email content
                </div>
              </div>

              <div className="text-green-600 font-semibold text-lg">⚡</div>
            </div>
          </Link>

          {/* NEWSLETTER SENDER */}
          <Link
            href="/en/admin/newsletter-send"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Newsletter</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Send newsletter
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Select → preview → send to subscribers
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg group-hover:translate-x-0.5 transition">
                →
              </div>
            </div>
          </Link>

          {/* PORTFOLIO CMS */}
          <Link
            href="/admin/portfolio"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Portfolio</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Portfolio CMS
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Add → edit → publish sourcing scenarios
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg group-hover:translate-x-0.5 transition">
                →
              </div>
            </div>
          </Link>

          {/* IMPORT GUIDE CMS */}
          <Link
            href="/admin/import-guide"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Content</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Import Guide CMS
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Generate → edit → publish import regulation articles
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg group-hover:translate-x-0.5 transition">
                →
              </div>
            </div>
          </Link>

          {/* SOURCING REQUESTS */}
          <Link
            href="/admin/portfolio"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">CRM</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  Sourcing requests
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  Review buyer leads and matched scenarios
                </div>
              </div>

              <div className="text-orange-600 font-semibold text-lg group-hover:translate-x-0.5 transition">
                →
              </div>
            </div>
          </Link>

        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-slate-500">
          Tip: bookmark this page — /en/admin
        </div>

      </div>
    </main>
  );
}