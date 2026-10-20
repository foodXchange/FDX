'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthNavDesktop, AuthNavMobile } from '@/components/AuthNav';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHebrew = pathname.startsWith('/he');
  const contactHref = isHebrew ? '/he/contact' : '/en/contact';

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/en/buyers', label: 'For Buyers' },
    { href: '/en/suppliers/register', label: 'For Suppliers' },
    { href: '/en/products', label: 'Products' },
    { href: '/en/sourcing', label: 'Sourcing' },
    { href: '/en/help', label: 'Help' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-nav-border bg-nav-bg/90 backdrop-blur-md text-white">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

        {/* ✅ LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition shrink-0"
        >
          <Image
            src="/logo-dark.svg"
            alt="FoodXchange"
            width={140}
            height={40}
            sizes="140px"
            priority
            className="h-7 w-auto object-contain"
          />

          <span className="hidden xl:inline-block text-xs text-slate-400 tracking-wide">
            Strategic Sourcing
          </span>
        </Link>

        {/* ✅ DESKTOP NAV (Visible on lg: 1024px+ to avoid crowding on 13" laptops & split screens) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition whitespace-nowrap ${
                isActive(link.href)
                  ? 'text-white border-b-2 border-orange-500 pb-1'
                  : 'text-slate-300 hover:text-orange-400'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* ✅ CONTACT LINK (Subtle ghost link to avoid dual-orange button conflict) */}
          <Link
            href={contactHref}
            className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/60 transition whitespace-nowrap shrink-0"
          >
            Contact
          </Link>

          {/* ✅ SIGN IN / PORTAL ACCESS */}
          <AuthNavDesktop />

        </nav>

        {/* ✅ MOBILE / TABLET MENU TOGGLE BUTTON (Visible below lg: 1024px) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                mobileMenuOpen
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
            />
          </svg>
        </button>

      </div>

      {/* ✅ MOBILE / TABLET NAV (Below 1024px) */}
      {mobileMenuOpen && (
        <nav className="lg:hidden border-t border-nav-border bg-nav-bg px-4 py-4 space-y-3">

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded text-sm font-medium transition ${
                isActive(link.href)
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={contactHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block text-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-semibold border border-slate-700"
          >
            Contact
          </Link>

          <div className="border-t border-nav-border pt-3 space-y-2">
            <AuthNavMobile onNavigate={() => setMobileMenuOpen(false)} />
          </div>

        </nav>
      )}
    </header>
  );
}
