import SupermarketEdiStudio from "@/components/edi/SupermarketEdiStudio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "מחולל ממשקי EDI ו-ERP לרשתות שיווק קמעונאיות | FoodXchange",
  description: "הפקה ואימות של מסרי סטורנקסט EDIFACT, SAP S/4HANA IDoc ופריוריטי להזמנות רכש (850), תעודות משלוח ASN (856) וחשבוניות (810).",
};

export default function EdiConnectorsDefaultPage() {
  return <SupermarketEdiStudio locale="he" />;
}
