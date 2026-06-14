type UploadedFile = {
  name: string;
  url: string;
  doc_label: string | null;
  size: number;
  mime_type: string;
};

export interface SupplierActionRow {
  id: string;
  action_type: string;
  request_message: string | null;
  requested_docs: string[] | null;
  response_text: string | null;
  uploaded_files: UploadedFile[] | null;
  status: string | null;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status, expiresAt }: { status: string | null; expiresAt: string }) {
  if (status === "completed") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
    );
  }
  if (new Date(expiresAt) < new Date()) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>;
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
}

export default function SupplierActionsList({ actions }: { actions: SupplierActionRow[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Document requests</h2>
      <div className="space-y-3">
        {actions.map((action) => (
          <div key={action.id} className="rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={action.status} expiresAt={action.expires_at} />
                <span className="text-xs text-gray-400">Sent {formatDate(action.created_at)}</span>
                {action.responded_at && (
                  <span className="text-xs text-gray-400">· Responded {formatDate(action.responded_at)}</span>
                )}
              </div>
            </div>

            {action.requested_docs && action.requested_docs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {action.requested_docs.map((doc) => (
                  <span key={doc} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {doc}
                  </span>
                ))}
              </div>
            )}

            {action.request_message && (
              <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{action.request_message}</p>
            )}

            {action.response_text && (
              <div className="bg-gray-50 rounded-md px-3 py-2 mb-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Supplier&apos;s response</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{action.response_text}</p>
              </div>
            )}

            {action.uploaded_files && action.uploaded_files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {action.uploaded_files.map((file, i) => (
                  <a
                    key={`${file.url}-${i}`}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-700 underline"
                  >
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
