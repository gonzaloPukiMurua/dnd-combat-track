"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href:  "/templates",
    label: "Templates",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M14.121 14.121L19 19m-7-7l3.536-3.536m0 0L19 4l-4.464 4.464M12 12 4.929 19.071" />
      </svg>
    ),
  },
  {
    href:  "/groups",
    label: "Groups",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    href:  "/combat",
    label: "Combat",
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
      {/* ── Desktop: top bar ──────────────────────────────────────────────── */}
      <header className="hidden sm:block border-b bg-white sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">

          <Link href="/" className="font-semibold text-slate-800 hover:text-slate-600 transition-colors">
            ⚔ D&D Tracker
          </Link>

          <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Mobile: bottom tab bar ────────────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t flex">
        {LINKS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive(href)
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className={isActive(href) ? "text-blue-600" : "text-slate-400"}>
              {icon}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
