import RetailMarginSimulator from "@/components/calculator/RetailMarginSimulator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supermarket Retail Margin & Landed Cost Simulator | FoodXchange",
  description: "Calculate Israeli supermarket landed cost waterfall from European CIF in EUR to ILS, retail gross margins vs. national benchmark brands, and print 1-page category review decks.",
};

export default function SimulatorMarginEnPage() {
  return <RetailMarginSimulator locale="en" />;
}
