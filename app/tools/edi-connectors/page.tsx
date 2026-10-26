import SupermarketEdiStudio from "@/components/edi/SupermarketEdiStudio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supermarket ERP EDI Connectors Tool | FoodXchange",
  description: "Retail EDI connectors tool for generating and validating StoreNext EDIFACT, SAP S/4HANA and Priority ERP payloads.",
};

export default function ToolsEdiConnectorsPage() {
  return <SupermarketEdiStudio locale="he" />;
}
