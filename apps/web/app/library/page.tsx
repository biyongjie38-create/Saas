import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";
import { requirePageAuthUser } from "@/lib/auth";
import { listLibraryItems } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function LibraryPage() {
  await requirePageAuthUser("/library");
  const lang = await getServerLang();
  const supabaseClient = await createServerSupabaseClient();
  const items = await listLibraryItems({ supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Viral Library", "爆款库")}</h1>
        <p>{text(lang, "RAG benchmark source library used for Top3 comparisons.", "用于 Top3 对标比较的 RAG 参考库。")}</p>

        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => (
            <article className="card panel" key={item.id}>
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p>{item.summary}</p>
              <p className="small mono">
                {text(lang, "hook", "钩子")}: {item.tags.hookType} - {text(lang, "topic", "主题")}: {item.tags.topic} - {text(lang, "duration", "时长")}: {item.tags.durationBucket}
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

