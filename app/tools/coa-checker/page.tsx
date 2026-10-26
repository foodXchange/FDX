import MohCoaCheckerClient from "@/components/compliance/MohCoaCheckerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MOH COA Compliance Checker Tool | FoodXchange",
  description: "Interactive COA Assay validation tool against Israeli Ministry of Health food safety standards.",
};

export default function ToolsCoaCheckerPage() {
  return <MohCoaCheckerClient locale="he" />;
}
