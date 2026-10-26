import RetailMarginSimulator from "@/components/calculator/RetailMarginSimulator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Tools - Supermarket Retail Category Margin Simulator | FoodXchange",
  description: "Internal administrative tool for retail category margin simulation and 1-page review deck generation.",
};

export default function AdminToolsMarginSimulatorPage() {
  return <RetailMarginSimulator locale="en" />;
}
