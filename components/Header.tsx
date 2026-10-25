'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { AuthNavDesktop, AuthNavMobile } from '@/components/AuthNav';

interface ToolDropdownItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
}

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHebrew = pathname.startsWith('/he');
  const homeHref = isHebrew ? '/he' : '/';
  const contactHref = isHebrew ? '/he/contact' : '/en/contact';
  const contactLabel = isHebrew ? 'צור קשר' : 'Contact';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setToolsDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Compute mirror paths for EN <-> HE toggle
  let enTarget = '/';
  let heTarget = '/he';

  if (isHebrew) {
    if (pathname === '/he') enTarget = '/';
    else if (pathname === '/he/buyers') enTarget = '/en/buyers';
    else if (pathname === '/he/sourcing') enTarget = '/en/sourcing';
    else if (pathname === '/he/rfq') enTarget = '/en/rfq';
    else if (pathname === '/he/calculator/container') enTarget = '/en/calculator/container';
    else if (pathname === '/he/calculator') enTarget = '/en/calculator';
    else if (pathname === '/he/benchmark') enTarget = '/en/benchmark';
    else if (pathname === '/he/track') enTarget = '/track';
    else if (pathname === '/he/contact') enTarget = '/en/contact';
    else if (pathname === '/he/blog') enTarget = '/en/blog';
    else if (pathname === '/he/newsletter') enTarget = '/en/newsletter';
    else if (pathname.startsWith('/he/products')) {
      const sub = pathname.replace('/he/products', '');
      enTarget = '/en/products' + sub;
    } else if (pathname.startsWith('/he/import-guide')) {
      const sub = pathname.replace('/he/import-guide', '');
      enTarget = '/en/import-guide' + sub;
    } else if (pathname === '/he/guide') {
      enTarget = '/en/guide';
    } else enTarget = '/';
    heTarget = pathname;
  } else {
    enTarget = pathname;
    if (pathname === '/') heTarget = '/he';
    else if (pathname === '/en/buyers') heTarget = '/he/buyers';
    else if (pathname === '/en/sourcing') heTarget = '/he/sourcing';
    else if (pathname === '/en/rfq') heTarget = '/he/rfq';
    else if (pathname === '/en/calculator/container') heTarget = '/he/calculator/container';
    else if (pathname === '/en/calculator') heTarget = '/he/calculator';
    else if (pathname === '/en/benchmark') heTarget = '/he/benchmark';
    else if (pathname === '/track' || pathname === '/en/track') heTarget = '/he/track';
    else if (pathname === '/en/contact') heTarget = '/he/contact';
    else if (pathname === '/en/blog') heTarget = '/he/blog';
    else if (pathname === '/en/newsletter') heTarget = '/he/newsletter';
    else if (pathname === '/en/guide') heTarget = '/he/guide';
    else if (pathname === '/en/supplier-guide') heTarget = '/en/supplier-guide';
    else if (pathname.startsWith('/en/products')) {
      const sub = pathname.replace('/en/products', '');
      heTarget = '/he/products' + sub;
    } else if (pathname.startsWith('/en/import-guide')) {
      const sub = pathname.replace('/en/import-guide', '');
      heTarget = '/he/import-guide' + sub;
    } else heTarget = '/he';
  }

  // Core navigation links (concise, high-impact, non-crowded)
  const navLinksEn = [
    { href: '/en/buyers', label: 'Buyers' },
    { href: '/en/products', label: 'Products' },
    { href: '/en/sourcing', label: 'Sourcing' },
    { href: '/en/suppliers/register', label: 'For Suppliers' },
  ];

  const navLinksHe = [
    { href: '/he/buyers', label: 'לקניינים' },
    { href: '/he/products', label: 'קטלוג מוצרים' },
    { href: '/he/sourcing', label: 'איתור מפעל (RFQ)' },
    { href: '/en/suppliers/register', label: 'ליצרנים' },
  ];

  const toolsItemsEn: ToolDropdownItem[] = [
    {
      href: '/en/benchmark',
      label: 'Shelf Replacement Matrix',
      icon: '🎯',
      desc: 'Replace expensive brands with high-margin European OEM alternatives',
    },
    {
      href: '/en/products',
      label: 'Tasting Sample Box Dispatcher',
      icon: '📦',
      desc: 'Order curated European factory samples delivered to your office',
    },
    {
      href: '/track',
      label: 'Live Sample & Order Tracking',
      icon: '🚚',
      desc: 'Track tasting sample boxes, DHL air waybills, and ocean containers',
    },
    {
      href: '/en/guide',
      label: 'Retail Buyer Sourcing Guide',
      icon: '📖',
      desc: 'Step-by-step playbook: factory discovery, sample box & SI 1145',
    },
    {
      href: '/en/supplier-guide',
      label: 'European Supplier Export Guide',
      icon: '🏭',
      desc: 'Quoting CIF Haifa, courier sample protocol & Kosher compliance',
    },
    {
      href: '/en/rfq',
      label: 'Smart RFQ Matchmaker',
      icon: '🎯',
      desc: 'Match 5,000+ European plants to retail benchmarks',
    },
    {
      href: '/en/calculator',
      label: 'Landed Cost Calculator',
      icon: '⚡',
      desc: 'Simulate shelf margins, freight & import duties',
    },
    {
      href: '/en/calculator/container',
      label: 'Mixed Container Optimizer',
      icon: '🚢',
      desc: 'Consolidate multiple European factories into 20ft/40ft containers',
    },
    {
      href: '/en/import-guide',
      label: 'Food Import Guide',
      icon: '📋',
      desc: 'EU reform, Israeli SI 1145 & kosher pathways',
    },
    {
      href: '/en/blog',
      label: 'Market Blog & Insights',
      icon: '📰',
      desc: 'European commodity trends & sourcing briefs',
    },
    {
      href: '/en/help',
      label: 'Help & FAQ',
      icon: '❓',
      desc: 'Common questions & institutional buyer support',
    },
  ];

  const toolsItemsHe: ToolDropdownItem[] = [
    {
      href: '/he/rfq',
      label: 'מערכת התאמת מותג פרטי (Smart RFQ)',
      icon: '🎯',
      desc: 'איתור חלופות מותג פרטי מול מותגי מדף יקרים ומצגות סורסינג',
    },
    {
      href: '/he/guide',
      label: 'מדריך קניינים למותג פרטי',
      icon: '📖',
      desc: 'שלבי עבודה מול מפעלי אירופה: סינון, דוגמאות טעימה ורגולציה',
    },
    {
      href: '/en/supplier-guide',
      label: 'מדריך יצוא ליצרנים באירופה',
      icon: '🏭',
      desc: 'מדריך מקיף למפעלי מזון אירופאיים המייצאים לרשתות בישראל',
    },
    {
      href: '/he/benchmark',
      label: 'מטריצת החלפת מותגי מדף',
      icon: '🎯',
      desc: 'החלפת מותגי יבואנים יקרים במותג פרטי אירופאי רווחי לרשת',
    },
    {
      href: '/he/products',
      label: 'ערכת דוגמאות לשולחן הטעימות',
      icon: '📦',
      desc: 'איסוף דוגמאות ישירות ממפעלי אירופה ומשלוח אקספרס לרשת',
    },
    {
      href: '/he/track',
      label: 'מעקב משלוח דוגמאות חי',
      icon: '🚚',
      desc: 'מעקב אחר סטטוס ערכות טעימה, שטרי מטען DHL ודסק טעימות',
    },
    {
      href: '/he/calculator',
      label: 'מחשבון עלות נחיתה ורווחיות',
      icon: '⚡',
      desc: 'תחשיב עלות במרלו״ג, מרווחי מדף והשוואת בנצ׳מרק',
    },
    {
      href: '/he/calculator/container',
      label: 'מחשבון מכולה משולבת (איחוד יצרנים)',
      icon: '🚢',
      desc: 'איחוד משטחים ממספר מפעלי מזון באירופה וחיסכון בעלויות שילוח',
    },
    {
      href: '/he/import-guide',
      label: 'מדריך יבוא ומרכז רגולציה',
      icon: '📋',
      desc: 'רפורמת היבוא האירופאי, ת״י 1145 ואישורי כשרות',
    },
    {
      href: '/he/blog',
      label: 'בלוג מקצועי ועדכוני שוק',
      icon: '📰',
      desc: 'מגמות שוק המזון, מחירי סחורות והזדמנויות',
    },
    {
      href: '/en/help',
      label: 'מרכז תמיכה ושאלות נפוצות',
      icon: '❓',
      desc: 'שאלות ותשובות לקניינים ויבואנים',
    },
  ];

  const navLinks = isHebrew ? navLinksHe : navLinksEn;
  const toolsItems = isHebrew ? toolsItemsHe : toolsItemsEn;
  const toolsLabel = isHebrew ? 'כלים ורגולציה' : 'Tools & Guides';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '/en';
    if (href === '/he') return pathname === '/he';
    return pathname.startsWith(href);
  };

  const isToolsActive = toolsItems.some((item) => pathname.startsWith(item.href));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl text-white transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">

        {/* ✅ BRAND LOGO */}
        <Link
          href={homeHref}
          className="flex items-center gap-2.5 hover:opacity-90 transition shrink-0 group py-1"
        >
          <Image
            src="/logo-dark.svg"
            alt="FoodXchange"
            width={132}
            height={36}
            sizes="132px"
            priority
            className="h-6 sm:h-7 w-auto object-contain"
          />
          <span className="hidden xl:inline-block text-[11px] font-medium text-slate-400 tracking-wide border-r border-slate-800 pr-2.5 group-hover:text-slate-300 transition">
            Strategic Sourcing
          </span>
        </Link>

        {/* ✅ DESKTOP NAV (Spacious, modern, non-crowded) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">

          {/* Primary Nav Links */}
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-orange-500/15 text-orange-400 font-semibold ring-1 ring-orange-500/30 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Tools & Guides Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setToolsDropdownOpen(true)}
            onMouseLeave={() => setToolsDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                isToolsActive || toolsDropdownOpen
                  ? 'bg-orange-500/15 text-orange-400 font-semibold ring-1 ring-orange-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              aria-expanded={toolsDropdownOpen}
            >
              <span>{toolsLabel}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  toolsDropdownOpen ? 'rotate-180 text-orange-400' : 'text-slate-400'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Flyout */}
            {toolsDropdownOpen && (
              <div
                dir={isHebrew ? 'rtl' : 'ltr'}
                className="absolute top-full start-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-2 shadow-2xl ring-1 ring-black/40 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="space-y-1">
                  {toolsItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setToolsDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition ${
                          active
                            ? 'bg-orange-500/15 text-white border border-orange-500/30'
                            : 'hover:bg-slate-800/70 text-slate-200'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white leading-snug">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                            {item.desc}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Contact Ghost Link */}
          <Link
            href={contactHref}
            className="text-xs xl:text-sm font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 transition whitespace-nowrap shrink-0"
          >
            {contactLabel}
          </Link>
        </nav>

        {/* ✅ RIGHT CONTROLS: Auth + Language Switcher */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {/* Sign In & Primary Sourcing CTA */}
          <AuthNavDesktop isHebrew={isHebrew} />

          {/* Language Toggle Pill */}
          <div
            className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs font-bold shrink-0 shadow-xs"
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
        </div>

        {/* ✅ MOBILE / TABLET CONTROLS (Below lg: 1024px) */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Language Switcher */}
          <div
            className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs font-bold"
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl border border-slate-800 transition"
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5"
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

      {/* ✅ MOBILE / TABLET DRAWER (Below 1024px) */}
      {mobileMenuOpen && (
        <nav
          dir={isHebrew ? 'rtl' : 'ltr'}
          className="lg:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-2xl px-5 py-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Primary Action Button */}
          <div>
            <AuthNavMobile onNavigate={() => setMobileMenuOpen(false)} isHebrew={isHebrew} />
          </div>

          {/* Core Nav Links */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <Link
              href={homeHref}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-xl text-sm font-semibold transition ${
                isActive(homeHref)
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-slate-200 hover:bg-slate-900'
              }`}
            >
              {isHebrew ? 'דף הבית' : 'Home'}
            </Link>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive(link.href)
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                    : 'text-slate-200 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Tools & Resources in Mobile Menu */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 block">
              {toolsLabel}
            </span>
            <div className="grid grid-cols-1 gap-1">
              {toolsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition"
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact & WhatsApp */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <Link
              href={contactHref}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition"
            >
              {contactLabel}
            </Link>

            <a
              href="https://wa.me/972525222291"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              💬 WhatsApp (+972-52-522-2291)
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
