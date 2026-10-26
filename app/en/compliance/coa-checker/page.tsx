import MohCoaCheckerClient from "@/components/compliance/MohCoaCheckerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automated COA Assay & MOH Green Pass Checker | FoodXchange",
  description: "Automated auditing of European laboratory Certificates of Analysis (COA) against mandatory Israeli Ministry of Health standards (SI 1145, Heavy Metals, Pesticides).",
};

export default function ComplianceCoaCheckerEnPage() {
  return <MohCoaCheckerClient locale="en" />;
}
