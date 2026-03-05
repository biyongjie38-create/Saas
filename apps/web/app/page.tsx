import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const highlights = [
  {
    title: "Structure Breakdown",
    desc: "Dissect hook, pacing, and CTA to explain why a video keeps attention."
  },
  {
    title: "Benchmark Comparison",
    desc: "Retrieve Top3 similar hits from viral library and output copy/avoid actions."
  },
  {
    title: "Viral Score",
    desc: "Explainable 0-100 scoring with prioritized action list."
  }
];

export default function HomePage() {
  return (
    <main>
      <SiteNav />

      <section className="shell hero">
        <span className="badge">YouTube Viral Intelligence SaaS</span>
        <h1>Drop one YouTube URL and get an action-ready viral playbook.</h1>
        <p>
          ViralBrain.ai focuses on YouTube depth. MVP includes stable mock-first delivery for
          structure analysis, thumbnail review, comment sentiment, benchmark comparison, and
          Viral Score.
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">
            Start Analysis
          </Link>
          <Link href="/library" className="btn btn-ghost">
            Open Viral Library
          </Link>
        </div>

        <div className="grid-3">
          <div className="kpi card">
            <div className="label">Experience</div>
            <div className="value">Streaming</div>
          </div>
          <div className="kpi card">
            <div className="label">Model Routing</div>
            <div className="value">mini + gpt-4o</div>
          </div>
          <div className="kpi card">
            <div className="label">Goal</div>
            <div className="value">10-20s visible progress</div>
          </div>
        </div>
      </section>

      <section className="shell section">
        <h2>MVP Core Modules</h2>
        <div className="grid-3">
          {highlights.map((item) => (
            <article className="card panel" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
