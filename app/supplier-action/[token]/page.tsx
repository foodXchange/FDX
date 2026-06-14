import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SupplierActionForm from "@/components/supplier-action/SupplierActionForm";

type Params = Promise<{ token: string }>;

type ActionRow = {
  id: string;
  status: string | null;
  request_message: string | null;
  requested_docs: string[] | null;
  expires_at: string;
  supplier_offerings: { company_name: string } | null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-orange-500 h-1.5" />
        <div className="px-6 py-8 sm:px-8">
          <p className="text-xs font-medium text-slate-400 mb-6 tracking-wide">FoodXchange</p>
          {children}
        </div>
      </div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-semibold text-slate-900 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
    </Shell>
  );
}

export default async function SupplierActionPage({ params }: { params: Params }) {
  const { token } = await params;

  const { data: rawAction } = await supabaseAdmin
    .from("supplier_actions")
    .select("id, status, request_message, requested_docs, expires_at, supplier_offerings(company_name)")
    .eq("token", token)
    .maybeSingle();

  const action = rawAction as unknown as ActionRow | null;

  if (!action) {
    return (
      <Message
        title="Link not found"
        body="This link doesn't look right. If you think this is a mistake, reply to the original email and we'll send a new one."
      />
    );
  }

  if (action.status === "revoked") {
    return (
      <Message
        title="This request is no longer active"
        body="If you think this is a mistake, contact info@foodz-x.com."
      />
    );
  }

  if (new Date(action.expires_at) < new Date()) {
    return (
      <Message
        title="This link has expired"
        body="This request link is no longer active. Reply to the original email and we'll be happy to send a fresh one."
      />
    );
  }

  if (action.status === "completed") {
    return (
      <Message
        title="Already submitted"
        body="We've already received your response for this request — thank you! If you need to send anything else, just reply to the original email."
      />
    );
  }

  if (action.status === "pending") {
    void supabaseAdmin.from("supplier_actions").update({ status: "opened" }).eq("id", action.id);
  }

  const companyName = action.supplier_offerings?.company_name ?? "there";

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Hi {companyName} 👋</h1>
      <p className="text-sm text-slate-500 mb-6">FoodXchange is requesting the following from you</p>

      {action.request_message && (
        <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{action.request_message}</p>
        </div>
      )}

      <SupplierActionForm token={token} requestedDocs={action.requested_docs ?? []} />
    </Shell>
  );
}
