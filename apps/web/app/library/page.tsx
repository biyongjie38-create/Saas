import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser } from "@/lib/auth";
import { listLibraryItems } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function LibraryPage() {
  await requirePageAuthUser("/library");
  const supabaseClient = await createServerSupabaseClient();
  const items = await listLibraryItems({ supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>Viral Library</h1>
        <p>RAG benchmark source library used for Top3 comparisons.</p>

        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => (
            <article className="card panel" key={item.id}>
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p>{item.summary}</p>
              <p className="small mono">
                hook: {item.tags.hookType} - topic: {item.tags.topic} - duration: {item.tags.durationBucket}
              </p>
              <a href={item.sourceUrl} className="small" target="_blank" rel="noreferrer">
                {item.sourceUrl}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
