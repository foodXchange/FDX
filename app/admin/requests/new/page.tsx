import { redirect } from "next/navigation";

/**
 * Legacy route. New requests are created directly in the unified Intake Desk at
 * /admin/requests. Kept as a redirect so old links/bookmarks (and the
 * "New request for this buyer" flow) keep working.
 */
export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer_id?: string }>;
}) {
  const params = await searchParams;
  redirect(params.buyer_id ? `/admin/requests?buyer_id=${encodeURIComponent(params.buyer_id)}` : "/admin/requests");
}
