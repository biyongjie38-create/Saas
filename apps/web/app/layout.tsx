import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { AnalyticsUser } from "@/components/analytics-user";
import { getOptionalAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
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
  const authUser = await getOptionalAuthUser();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const analyticsUser = authUser
    ? await resolveAuthenticatedAppUser(authUser, { supabaseClient })
    : null;

  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"}>
      <body className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
        <AnalyticsUser user={analyticsUser} />
        {children}
      </body>
    </html>
  );
}
