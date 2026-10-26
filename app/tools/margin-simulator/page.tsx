import RetailMarginSimulator from "@/components/calculator/RetailMarginSimulator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supermarket Retail Category Margin Simulator | FoodXchange Tools",
  description: "B2B to B2C retail margin simulator and landed cost waterfall calculator for category managers and retail buyers.",
};

export default function ToolsMarginSimulatorPage() {
  return <RetailMarginSimulator locale="he" />;
}
