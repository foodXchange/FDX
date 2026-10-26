import SupermarketEdiStudio from "@/components/edi/SupermarketEdiStudio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supermarket Chain ERP & EDI Connectors Studio | FoodXchange",
  description: "Enterprise StoreNext EDIFACT (D96A), SAP S/4HANA IDoc XML, and Priority ERP connectors for Israeli supermarket chains (Orders 850, ASN 856, Invoices 810).",
};

export default function EdiConnectorsEnPage() {
  return <SupermarketEdiStudio locale="en" />;
}
