import { redirect } from "next/navigation";

export default function OldContactRedirect({ params }: { params: { handle: string } }) {
  const { handle } = params;
  redirect(`/Business-card/${handle}`);
}
