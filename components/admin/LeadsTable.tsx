'use client';
import { useState } from "react";
import LeadSlideOver, { type LeadRow } from "@/components/admin/LeadSlideOver";

interface LeadsTableProps {
  leads: LeadRow[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

  if (leads.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No requests yet</p>;
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Name", "Email", "Company", "Matched", "Date"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                <td className="px-4 py-3">
                  <span className="text-orange-600">{lead.email}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{lead.company ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {lead.matched_slugs?.length ?? 0} scenario
                  {(lead.matched_slugs?.length ?? 0) !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeadSlideOver
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </>
  );
}
