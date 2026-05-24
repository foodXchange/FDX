'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/scraper", label: "Scraper" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/proposals", label: "Proposals" },
  { href: "/admin/scripts", label: "Video Scripts" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/import-guide", label: "Import Guide" },
  { href: "/en/admin/newsletter-builder", label: "Newsletter" },
  { href: "/en/admin/blog-editor", label: "Blog" },
];

const marketingLinks = [
  { href: "/admin/card-analytics", label: "Card Analytics" },
  { href: "/admin/card-editor", label: "Card Editor" },
];

const settingsLinks = [
  { href: "/admin/settings/category-images", label: "Category Images" },
  { href: "/admin/settings/trash", label: "Trash" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="px-3 py-4 space-y-1 flex-1">
      {links.map((link) => (
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
      <div className="border-t border-slate-700/50 my-2 pt-1">
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Marketing
        </p>
        {marketingLinks.map((link) => (
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
      <div className="border-t border-slate-700/50 my-2 pt-1">
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Settings
        </p>
        {settingsLinks.map((link) => (
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
    </nav>
  );
}

