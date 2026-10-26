import MohCoaCheckerClient from "@/components/compliance/MohCoaCheckerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Tools - MOH COA Compliance Checker | FoodXchange",
  description: "Internal administrative tool for COA assay verification and MOH Green Pre-Clearance Pass generation.",
};

export default function AdminToolsCoaCheckerPage() {
  return <MohCoaCheckerClient locale="en" />;
}
