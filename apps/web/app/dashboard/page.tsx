import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { DashboardClient } from "@/components/dashboard-client";
import { requirePageAuthUser } from "@/lib/auth";
import { listReports } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const authUser = await requirePageAuthUser("/dashboard");
  const supabaseClient = await createServerSupabaseClient();
  const result = await listReports(
    { userId: authUser.id, limit: 8 },
    { supabaseClient }
  );
  const recentReports = result.data;

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>Dashboard</h1>
        <p>Analyze a YouTube URL with streaming task updates and report history.</p>

        <DashboardClient />

        <section style={{ marginTop: 24 }} className="card panel">
          <h2>Recent Reports</h2>
          {recentReports.length === 0 ? (
            <p className="small">No reports yet. Run your first analysis.</p>
          ) : (
            <ul className="list">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <Link href={`/report/${report.id}`}>
                    {report.id.slice(0, 8)} - {report.videoId} - {report.status}
                    {report.scoreTotal ? ` - Score ${report.scoreTotal}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
