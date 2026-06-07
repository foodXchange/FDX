'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHebrew = pathname.startsWith('/he');
  const contactHref = isHebrew ? '/he/contact' : '/en/contact';

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/en/about', label: 'About' },
    { href: '/en/buyers', label: 'Buyers' },
    { href: '/en/manufacturers', label: 'Manufacturers' },
    { href: '/en/portfolio', label: 'Portfolio' },
    { href: '/en/products', label: 'Products' },
    { href: '/en/sourcing', label: 'Sourcing' },
    { href: '/en/import-guide', label: 'Import Guide' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-nav-border bg-nav-bg/90 backdrop-blur-md text-white">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">

        {/* ✅ LOGO — CLEAN FINAL VERSION */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition"
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

          <span className="hidden lg:block text-xs text-slate-400 tracking-wide">
            Strategic Sourcing
          </span>
        </Link>

        {/* ✅ DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-8">

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${
                isActive(link.href)
                  ? 'text-white border-b-2 border-orange-500 pb-1'
                  : 'text-slate-300 hover:text-orange-400'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* ✅ CONTACT CTA */}
          <Link href={contactHref}>
            <button className="ml-4 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow-sm">
              Contact
            </button>
          </Link>

        </nav>

        {/* ✅ MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-slate-800 rounded transition"
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

      {/* ✅ MOBILE NAV */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-nav-border bg-nav-bg px-4 py-4 space-y-3">

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
            className="block text-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
          >
            Contact
          </Link>

        </nav>
      )}
    </header>
  );
}
``