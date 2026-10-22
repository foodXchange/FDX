import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { DeckBuilderClient } from "@/components/admin/deck/DeckBuilderClient";

export const metadata: Metadata = {
  title: "B2B Assortment Deck Studio | Admin",
  description:
    "Generate executive European manufacturer assortment presentations and printable vector PDFs for Israeli supermarket category managers.",
};

export default async function AdminDeckBuilderPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session || !(await verifySession(session))) {
    redirect("/admin/login?next=/admin/deck-builder");
  }

  return <DeckBuilderClient />;
}
