import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { LoginForm } from "@/components/login-form";
import { getOptionalAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-config";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

function normalizeNextPath(input: string | undefined): string {
  if (input && input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

function normalizePublicOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function resolvePublicAppUrl(): string | null {
  const configured = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  if (configured) {
    return configured;
  }

  const vercelProduction =
    normalizePublicOrigin(process.env.PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? null) ??
    normalizePublicOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null);

  return vercelProduction;
}

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const nextPath = normalizeNextPath(query.next);
  const lang = await getServerLang();

  const user = await getOptionalAuthUser();
  if (user) {
    redirect(nextPath);
  }

  const authConfig = {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey()
  };

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Welcome Back", "欢迎回来")}</h1>
        <p>{text(lang, "Sign in to access your reports and usage.", "登录后可访问你的分析报告和额度数据。")}</p>
        <LoginForm
          nextPath={nextPath}
          appUrl={resolvePublicAppUrl()}
          lang={lang}
          authConfig={authConfig}
        />
      </section>
    </main>
  );
}

