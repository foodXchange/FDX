export default function ImpersonationBanner({ targetLabel }: { targetLabel: string }) {
  return (
    <div className="bg-amber-500 text-slate-900 text-sm font-medium px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
      <span>👁 Admin view — you are viewing as {targetLabel}</span>
      <form action="/api/admin/impersonate/exit" method="post">
        <button type="submit" className="underline hover:no-underline font-semibold">
          Exit impersonation →
        </button>
      </form>
    </div>
  );
}
