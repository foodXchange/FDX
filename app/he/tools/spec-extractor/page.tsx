import { Metadata } from "next";
import SpecExtractorClient from "@/components/admin/tools/SpecExtractorClient";

export const metadata: Metadata = {
  title: "מפענח מפרטים טכניים מאירופה ויצירת תווית מזון לפי ת״י 1145 | FoodXchange",
  description:
    "מערכת AI לפענוח מפרט טכני אירופאי (Scheda Tecnica) ויצירה אוטומטית של תווית מזון עברית לפי ת״י 1145 כולל סימונים אדומים וייצוא לפריוריטי ERP.",
};

export default function HebrewSpecExtractorPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SpecExtractorClient initialLang="he" />
    </div>
  );
}
