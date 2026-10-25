import { notFound } from "next/navigation";
import CustomsBrokerPortal from "@/components/customs/CustomsBrokerPortal";
import { getCustomsPortalData } from "@/app/customs/loader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EnglishCustomsBrokerPortalPage({ params }: PageProps) {
  const { id: requestId } = await params;

  const data = await getCustomsPortalData(requestId);

  if (!data) {
    notFound();
  }

  return <CustomsBrokerPortal {...data} lang="en" />;
}
