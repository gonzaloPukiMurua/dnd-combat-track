"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href:    "/templates",
    label:   "Templates",
    // Sword icon
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M14.121 14.121L19 19m-7-7l3.536-3.536m0 0L19 4l-4.464 4.464M12 12 4.929 19.071" />
      </svg>
    ),
  },
  {
    href:    "/combat",
    label:   "Combat",
    // Shield icon
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3c-1.5 1-4 1.5-6 1.5v7c0 4 2.5 7 6 8.5C15.5 18.5 18 15.5 18 11.5v-7C16 4.5 13.5 4 12 3Z" />
      </svg>
    ),
  },
];

export function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop: top horizontal bar ─────────────────────────────────── */}
      <header className="hidden sm:block border-b bg-white sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo / app name */}
          <Link href="/" className="font-semibold text-gray-800 hover:text-gray-600 transition-colors">
            ⚔ D&D Tracker
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Mobile: bottom tab bar ───────────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t flex">
        {LINKS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive(href)
                ? "text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className={isActive(href) ? "text-blue-600" : "text-gray-400"}>
              {icon}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
