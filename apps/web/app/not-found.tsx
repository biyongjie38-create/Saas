import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function NotFoundPage() {
  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="card panel" style={{ maxWidth: 720, margin: "0 auto" }}>
          <p className="card-kicker">404</p>
          <h1 style={{ marginTop: 8 }}>Page Not Found</h1>
          <p>The page you are looking for does not exist or has been moved.</p>
          <div className="plan-actions" style={{ marginTop: 20 }}>
            <Link href="/dashboard" className="btn btn-primary">
              Open Console
            </Link>
            <Link href="/" className="btn btn-ghost">
              Back Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
