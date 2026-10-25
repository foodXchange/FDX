import { Metadata } from "next";
import SpecExtractorClient from "@/components/admin/tools/SpecExtractorClient";

export const metadata: Metadata = {
  title: "AI Technical Spec Sheet Extractor (*Scheda Tecnica* to SI 1145) | FoodXchange Admin",
  description:
    "AI parser and Israeli Standard SI 1145 compliant food packaging label generator for European food technical specification sheets.",
};

export default function AdminSpecExtractorPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SpecExtractorClient initialLang="en" />
    </div>
  );
}
