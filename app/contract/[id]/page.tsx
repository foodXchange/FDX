import B2BContractStudio from "@/components/contract/B2BContractStudio";
import { getContractData } from "@/app/contract/loader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractPage({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContractData(id);

  return <B2BContractStudio initialContract={contract} dealId={id} lang="he" />;
}
