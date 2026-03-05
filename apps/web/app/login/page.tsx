import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { LoginForm } from "@/components/login-form";
import { getOptionalAuthUser } from "@/lib/auth";
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

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const nextPath = normalizeNextPath(query.next);

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
        <h1 style={{ marginTop: 0 }}>Welcome Back</h1>
        <p>Sign in to access your reports and usage.</p>
        <LoginForm
          nextPath={nextPath}
          appUrl={process.env.NEXT_PUBLIC_APP_URL ?? null}
          authConfig={authConfig}
        />
      </section>
    </main>
  );
}
