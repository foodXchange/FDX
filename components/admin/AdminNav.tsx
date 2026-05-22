'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/scraper", label: "Scraper" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/proposals", label: "Proposals" },
  { href: "/admin/scripts", label: "Video Scripts" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/import-guide", label: "Import Guide" },
  { href: "/en/admin/newsletter-builder", label: "Newsletter" },
  { href: "/en/admin/blog-editor", label: "Blog" },
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
    </nav>
  );
}

