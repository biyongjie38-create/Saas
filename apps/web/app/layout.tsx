import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { getServerLang } from "@/lib/i18n";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "ViralBrain.ai",
  description: "YouTube viral intelligence SaaS"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getServerLang();

  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"}>
      <body className={`${spaceGrotesk.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}

