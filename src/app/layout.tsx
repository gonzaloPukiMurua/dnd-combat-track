import type { Metadata } from "next";
import { EB_Garamond, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Sistema visual Etapa 1 (docs/etapa-1/sistema-visual-etapa-1.md §2.2) —
// loaded once here so the whole app shares the same three fonts.
const ebGaramond = EB_Garamond({ variable: "--font-gothic-headline", weight: ["600", "700"], subsets: ["latin"] });
const hankenGrotesk = Hanken_Grotesk({ variable: "--font-gothic-body", weight: ["400", "500"], subsets: ["latin"] });
const jetBrainsMono = JetBrains_Mono({ variable: "--font-gothic-data", weight: ["500"], subsets: ["latin"] });

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
    <html lang="es">
      <body
        className={`${ebGaramond.variable} ${hankenGrotesk.variable} ${jetBrainsMono.variable} min-h-screen bg-gothic-background font-gothic-body text-gothic-on-surface antialiased`}
      >
        <main>{children}</main>
      </body>
    </html>
  );
}
