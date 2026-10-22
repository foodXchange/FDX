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
  const contactLabel = isHebrew ? 'צור קשר' : 'Contact';

  // Compute mirror paths for EN <-> HE toggle
  let enTarget = '/';
  let heTarget = '/he';

  if (isHebrew) {
    if (pathname === '/he') enTarget = '/';
    else if (pathname === '/he/buyers') enTarget = '/en/buyers';
    else if (pathname === '/he/sourcing') enTarget = '/en/sourcing';
    else if (pathname === '/he/contact') enTarget = '/en/contact';
    else if (pathname === '/he/blog') enTarget = '/en/blog';
    else if (pathname === '/he/newsletter') enTarget = '/en/newsletter';
    else enTarget = '/';
    heTarget = pathname;
  } else {
    enTarget = pathname;
    if (pathname === '/') heTarget = '/he';
    else if (pathname === '/en/buyers') heTarget = '/he/buyers';
    else if (pathname === '/en/sourcing') heTarget = '/he/sourcing';
    else if (pathname === '/en/contact') heTarget = '/he/contact';
    else if (pathname === '/en/blog') heTarget = '/he/blog';
    else if (pathname === '/en/newsletter') heTarget = '/he/newsletter';
    else heTarget = '/he';
  }

  const navLinksEn = [
    { href: '/', label: 'Home' },
    { href: '/en/buyers', label: 'For Buyers' },
    { href: '/en/suppliers/register', label: 'For Suppliers' },
    { href: '/en/products', label: 'Products' },
    { href: '/en/sourcing', label: 'Sourcing' },
    { href: '/en/import-guide', label: 'Import Guide' },
    { href: '/en/help', label: 'Help' },
  ];

  const navLinksHe = [
    { href: '/he', label: 'ראשי' },
    { href: '/he/buyers', label: 'לקניינים ורשתות' },
    { href: '/he/sourcing', label: 'איתור מפעל (RFQ)' },
    { href: '/en/products', label: 'קטלוג מוצרים' },
    { href: '/en/import-guide', label: 'מדריך יבוא' },
    { href: '/he/blog', label: 'בלוג מקצועי' },
    { href: '/he/newsletter', label: 'עדכוני שוק' },
  ];

  const navLinks = isHebrew ? navLinksHe : navLinksEn;

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
            {contactLabel}
          </Link>

          {/* ✅ SIGN IN / PORTAL ACCESS */}
          <AuthNavDesktop />

          {/* 🌐 LANGUAGE SWITCHER */}
          <div
            className="inline-flex items-center rounded-lg border border-white/10 bg-slate-900/90 p-0.5 text-xs font-bold shrink-0 ml-1"
            dir="ltr"
          >
            <Link
              href={enTarget}
              className={`px-2 py-1 rounded-md transition ${
                !isHebrew
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </Link>
            <Link
              href={heTarget}
              className={`px-2 py-1 rounded-md transition ${
                isHebrew
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              עב
            </Link>
          </div>

        </nav>

        {/* ✅ MOBILE / TABLET CONTROLS (Visible below lg: 1024px) */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Language Switcher */}
          <div
            className="inline-flex items-center rounded-lg border border-white/10 bg-slate-900/90 p-0.5 text-xs font-bold"
            dir="ltr"
          >
            <Link
              href={enTarget}
              className={`px-2 py-1 rounded-md transition ${
                !isHebrew
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </Link>
            <Link
              href={heTarget}
              className={`px-2 py-1 rounded-md transition ${
                isHebrew
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              עב
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
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
            {contactLabel}
          </Link>

          <div className="border-t border-nav-border pt-3 space-y-2">
            <AuthNavMobile onNavigate={() => setMobileMenuOpen(false)} />
          </div>

        </nav>
      )}
    </header>
  );
}
