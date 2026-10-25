import { Metadata } from "next";
import SupplierOnboardingWizard from "@/components/supplier/SupplierOnboardingWizard";

export const metadata: Metadata = {
  title: "European Manufacturer Onboarding | FoodXchange B2B Trade",
  description:
    "Register your European food manufacturing facility to export directly to Israeli supermarket retail chains (Shufersal, Carrefour IL, Rami Levy). Guaranteed 30/70 escrow payments and turnkey Kosher import clearance.",
};

export default function SupplierOnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SupplierOnboardingWizard />
    </div>
  );
}
