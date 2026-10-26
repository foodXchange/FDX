import MasterDevOpsCenter from "@/components/admin/infrastructure/MasterDevOpsCenter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "DevOps & Infrastructure Control Center | FoodXchange Admin Tools",
  description: "Administrative tool for managing API key vault, Netlify build quotas, Firecrawl credits, and controlled Git deployments.",
};

export default async function AdminToolsInfrastructurePage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string; locale?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const initialLocale = (sp.lang === "he" || sp.locale === "he") ? "he" : "en";
  return <MasterDevOpsCenter initialLocale={initialLocale} />;
}
