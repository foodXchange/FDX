import MasterDevOpsCenter from "@/components/admin/infrastructure/MasterDevOpsCenter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master Infrastructure, API Vault & Deployment Center | FoodXchange Admin",
  description: "Live quota tracking for Netlify, Firecrawl, and Supabase, with secure API key vault and controlled Git deployments.",
};

export default function AdminInfrastructurePage() {
  return <MasterDevOpsCenter locale="he" />;
}
