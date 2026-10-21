import LabelComplianceDashboard from "@/components/admin/compliance/LabelComplianceDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hebrew Label & Regulatory AI Reviewer | FoodXchange Admin",
  description: "Audit private label food packaging artwork for compliance with Israeli Standard SI 1145, Chief Rabbinate kosher rules, and mandatory front-of-package red warning badges.",
};

export default function LabelCheckerPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <LabelComplianceDashboard />
    </div>
  );
}
