import SupermarketEdiStudio from "@/components/edi/SupermarketEdiStudio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Tools - Supermarket ERP EDI Connectors | FoodXchange",
  description: "Internal administrator tool for supermarket EDI transmission and StoreNext / SAP IDoc mapping.",
};

export default function AdminToolsEdiConnectorsPage() {
  return <SupermarketEdiStudio locale="en" />;
}
