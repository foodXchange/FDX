"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getInitials, avatarColors } from "@/lib/admin/avatarPalette";

export type BuyerRow = {
  id: string;
  company_name: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  country: string | null;
  buyer_type: string | null;
  active: boolean | null;
  request_count: number;
};

export function BuyersTableClient({ buyers }: { buyers: BuyerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxImage) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage]);

  const filteredBuyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter(
      (buyer) =>
        buyer.company_name.toLowerCase().includes(q) ||
        (buyer.contact_name ?? "").toLowerCase().includes(q)
    );
  }, [buyers, search]);

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company or contact name…"
          className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Logo", "Company", "Contact name", "Email", "Country", "Type", "Requests", "Active"].map((header) => (
                <th
                  key={header}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    header === "Company"
                      ? "sticky left-0 z-10 bg-gray-50 border-r border-gray-200 min-w-[220px]"
                      : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBuyers.map((buyer) => (
              <tr
                key={buyer.id}
                onClick={() => router.push(`/admin/buyers/${buyer.id}`)}
                className="group cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3">
                  {buyer.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buyer.logo_url}
                      alt=""
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage(buyer.logo_url);
                      }}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 cursor-pointer"
                    />
                  ) : (
                    (() => {
                      const { bg, text } = avatarColors(buyer.company_name);
                      return (
                        <div
                          className={`w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-xs font-bold ${bg} ${text}`}
                        >
                          {getInitials(buyer.company_name)}
                        </div>
                      );
                    })()
                  )}
                </td>
                <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-gray-200 group-hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900 text-sm">
                    {buyer.company_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {buyer.contact_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {buyer.contact_email ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {buyer.country ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {buyer.buyer_type ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                    {buyer.request_count} request{buyer.request_count !== 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {buyer.active ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredBuyers.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No buyers match this search.
        </div>
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[80vw] max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
