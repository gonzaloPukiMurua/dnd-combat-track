import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D&D Combat Tracker",
  description: "Track initiative, HP and conditions at the table",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}>

        {/* ── Desktop: top bar ── */}
        <Navbar />

        {/* ── Page content ──
            pb-20 on mobile leaves room for the bottom tab bar
            pt-4 on desktop clears the top bar                   */}
        <main className="pb-20 sm:pb-0 pt-4 sm:pt-6 max-w-3xl mx-auto px-4">
          {children}
        </main>

      </body>
    </html>
  );
}
