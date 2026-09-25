import type { Metadata } from "next";
import { Bodoni_Moda, Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Atmosphere } from "@/components/Atmosphere";
import { Header } from "@/components/Header";
import { HimeGuide } from "@/components/HimeGuide";
import { site } from "@/content/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-luxury",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s — ${site.name}`,
  },
  description: site.line,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${bodoni.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <Atmosphere />
        <Header />
        <div className="codex">{children}</div>
        <HimeGuide />
      </body>
    </html>
  );
}
