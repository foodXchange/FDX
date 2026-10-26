import MohCoaCheckerClient from "@/components/compliance/MohCoaCheckerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "בדיקת תעודות אנליזה COA ואישור יבוא ירוק משרד הבריאות | FoodXchange",
  description: "מערכת אוטומטית לבדיקת תעודות מעבדה אירופאיות מול תקנות משרד הבריאות הישראלי, ת״י 1145, מתכות כבדות ומיקרוביולוגיה לשחרור מכס מהיר.",
};

export default function ComplianceCoaCheckerHePage() {
  return <MohCoaCheckerClient locale="he" />;
}
