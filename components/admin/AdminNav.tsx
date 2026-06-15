'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const sections: { title: string; links: NavItem[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/en/admin/qa-metrics", label: "QA Metrics" },
      { href: "/admin/requests", label: "Requests" },
      { href: "/admin/matches", label: "Matches" },
      { href: "/admin/suppliers", label: "Suppliers" },
      { href: "/admin/buyers", label: "Buyers" },
    ],
  },
  {
    title: "Data",
    links: [
      { href: "/admin/scraper", label: "Scraper" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/data-quality", label: "Data Quality" },
      { href: "/admin/pipeline", label: "Pipeline" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/en/admin/blog-editor", label: "Blog" },
      { href: "/en/admin/newsletter-builder", label: "Newsletter" },
      { href: "/admin/portfolio", label: "Portfolio" },
      { href: "/admin/import-guide", label: "Import Guide" },
      { href: "/admin/scripts", label: "Video Scripts" },
    ],
  },
  {
    title: "Marketing",
    links: [
      { href: "/admin/card-analytics", label: "Card Analytics" },
      { href: "/admin/card-editor", label: "Card Editor" },
      { href: "/admin/catalogue", label: "Catalogue" },
      { href: "/admin/proposals", label: "Proposals" },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/admin/settings/category-images", label: "Category Images" },
      { href: "/admin/settings/email-templates", label: "Email Templates" },
      { href: "/admin/settings/trash", label: "Trash" },
      { href: "/admin/settings/audit-log", label: "Audit Log" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto">
      {sections.map((section, i) => (
        <div key={section.title} className={i > 0 ? "border-t border-slate-700/50 my-2 pt-1" : ""}>
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            {section.title}
          </p>
          {section.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? "border-l-2 border-orange-500 bg-slate-800 text-white pl-2.5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
