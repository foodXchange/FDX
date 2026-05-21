'use client';

export type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  message: string | null;
  market: string | null;
  private_label: boolean | null;
  intent_json: Record<string, unknown> | null;
  matched_slugs: string[] | null;
  created_at: string;
};

interface LeadSlideOverProps {
  lead: LeadRow | null;
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadSlideOver({ lead, onClose }: LeadSlideOverProps) {
  if (!lead) return null;

  const intent = lead.intent_json;
  const product = typeof intent?.product === "string" ? intent.product : null;
  const intentMarket = typeof intent?.market === "string" ? intent.market : null;
  const privateLabel = typeof intent?.private_label === "boolean" ? intent.private_label : null;
  const kosher = typeof intent?.kosher === "boolean" ? intent.kosher : null;
  const packaging = Array.isArray(intent?.packaging) ? (intent.packaging as string[]) : [];
  const certifications = Array.isArray(intent?.certifications) ? (intent.certifications as string[]) : [];

  const hasIntent =
    product || intentMarket || privateLabel !== null || kosher !== null ||
    packaging.length > 0 || certifications.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">{lead.name ?? "—"}</p>
            {lead.company && (
              <p className="text-xs text-gray-400 mt-0.5">{lead.company}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Contact details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contact details
            </h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2 pr-4 text-gray-400 w-24 shrink-0">Name</td>
                  <td className="py-2 text-gray-900 font-medium">{lead.name ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Email</td>
                  <td className="py-2">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="text-orange-600 hover:text-orange-700">
                        {lead.email}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Company</td>
                  <td className="py-2 text-gray-700">{lead.company ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-400">Date</td>
                  <td className="py-2 text-gray-500 text-xs">{formatDate(lead.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Message */}
          {lead.message && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Message
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {lead.message}
              </div>
            </section>
          )}

          {/* Parsed intent */}
          {hasIntent && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Parsed intent
              </h3>
              <div className="space-y-2">
                {product && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-28 shrink-0">Product</span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{product}</span>
                  </div>
                )}
                {intentMarket && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-28 shrink-0">Market</span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{intentMarket}</span>
                  </div>
                )}
                {privateLabel !== null && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-28 shrink-0">Private label</span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">
                      {privateLabel ? "Yes" : "No"}
                    </span>
                  </div>
                )}
                {kosher !== null && (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-28 shrink-0">Kosher</span>
                    <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">
                      {kosher ? "Yes" : "No"}
                    </span>
                  </div>
                )}
                {packaging.length > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-28 shrink-0 pt-1">Packaging</span>
                    <div className="flex flex-wrap gap-1.5">
                      {packaging.map((p) => (
                        <span key={p} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {certifications.length > 0 && (
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 w-28 shrink-0 pt-1">Certifications</span>
                    <div className="flex flex-wrap gap-1.5">
                      {certifications.map((c) => (
                        <span key={c} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Matched scenarios */}
          {(lead.matched_slugs?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Matched scenarios
              </h3>
              <div className="space-y-1.5">
                {lead.matched_slugs!.map((slug) => (
                  <a
                    key={slug}
                    href={`/en/portfolio/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-orange-600 hover:underline"
                  >
                    → {slug}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4 flex gap-3">
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Email {lead.name?.split(" ")[0] ?? "lead"}
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
