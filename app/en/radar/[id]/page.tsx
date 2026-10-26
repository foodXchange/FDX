import MaritimeVesselRadar from "@/components/maritime/MaritimeVesselRadar";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EnglishDealRadarPage({ params }: PageProps) {
  const { id } = await params;
  let vesselId = "msc_leanne";

  if (id.includes("deal-2") || id.includes("pasta") || id.includes("maersk")) {
    vesselId = "maersk_mckinney";
  } else if (id.includes("deal-3") || id.includes("passata") || id.includes("zim")) {
    vesselId = "zim_luanda";
  }

  return <MaritimeVesselRadar initialVesselId={vesselId} lang="en" />;
}
