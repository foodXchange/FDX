import MasterDevOpsCenter from "@/components/admin/infrastructure/MasterDevOpsCenter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "DevOps & Infrastructure Control Center | FoodXchange Admin Tools",
  description: "Administrative tool for managing API key vault, Netlify build quotas, Firecrawl credits, and controlled Git deployments.",
};

export default function AdminToolsInfrastructurePage() {
  return <MasterDevOpsCenter locale="en" />;
}
