'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
};

const sections: { title: string; links: NavItem[] }[] = [
  {
    title: "Deal Operations",
    links: [
      { href: "/admin/pipeline", label: "Deal Pipeline", icon: "🎯" },
      { href: "/admin/notifications", label: "Notifications & Outreach", icon: "🔔" },
      { href: "/admin/requests", label: "Sourcing Requests", icon: "📥" },
      { href: "/admin/matches", label: "Match Engine", icon: "⚡" },
      { href: "/admin/opportunities", label: "Proactive Opportunities", icon: "💡", badge: "45" },
      { href: "/admin/qa-metrics", label: "QA Metrics", icon: "📈" },
      { href: "/admin/analytics", label: "Market Intelligence", icon: "📊" },
    ],
  },
  {
    title: "Catalog & Directory",
    links: [
      { href: "/admin/buyers", label: "Buyers Directory", icon: "👥" },
      { href: "/admin/suppliers", label: "Supplier Network", icon: "🏭" },
      { href: "/admin/ecosystem", label: "Trade Partners & Enablers", icon: "🤝" },
      { href: "/admin/products", label: "Product Catalog", icon: "📦" },
      { href: "/admin/data-quality", label: "Data Quality & Dups", icon: "🏷️" },
      { href: "/admin/scraper", label: "Web Scraper", icon: "🕷️" },
    ],
  },
  {
    title: "Sales & Content",
    links: [
      { href: "/admin/catalogue", label: "Product Catalogue", icon: "📋" },
      { href: "/admin/proposals", label: "Buyer Proposals", icon: "💼" },
      { href: "/en/admin/newsletter-builder", label: "Newsletter Builder", icon: "✉️" },
      { href: "/en/admin/blog-editor", label: "Blog & SEO Editor", icon: "✍️" },
      { href: "/admin/portfolio", label: "Portfolio CMS", icon: "📁" },
      { href: "/admin/scripts", label: "Video Scripts", icon: "🎬" },
    ],
  },
  {
    title: "Configuration",
    links: [
      { href: "/admin/settings/category-images", label: "Category Images", icon: "🖼️" },
      { href: "/admin/settings/email-templates", label: "Email Templates", icon: "📧" },
      { href: "/admin/settings/audit-log", label: "Audit Log", icon: "📜" },
      { href: "/admin/settings/trash", label: "Trash & Archive", icon: "🗑️" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  function isLinkActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <nav className="px-3 py-3 space-y-4 flex-1 overflow-y-auto">
      {/* Quick Dashboard Home Link */}
      <div>
        <Link
          href="/admin"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            pathname === "/admin"
              ? "bg-orange-500 text-white shadow-xs"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <span className="text-sm">🏠</span>
          <span>Mission Control</span>
        </Link>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.links.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    active
                      ? "bg-slate-800 text-white border-l-2 border-orange-500 pl-2.5 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xs shrink-0 group-hover:scale-110 transition-transform">
                      {link.icon}
                    </span>
                    <span className="truncate">{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-bold shrink-0">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
