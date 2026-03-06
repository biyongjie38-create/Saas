"use client";

import { useMemo, useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n-shared";
import type { ViralLibraryItem } from "@/lib/types";

type Props = {
  lang: Lang;
  initialItems: ViralLibraryItem[];
};

type ImportFormat = "json" | "csv";

type ImportResponse = {
  ok: boolean;
  data: {
    imported_count: number;
    items: ViralLibraryItem[];
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

const copyByLang = {
  en: {
    title: "Viral Library",
    subtitle: "Search your benchmark source library and import JSON/CSV snippets for future RAG retrieval.",
    searchLabel: "Search",
    searchPlaceholder: "Search title, summary, topic, hook type...",
    importTitle: "Import Items",
    importHelpJson: "JSON supports an array of items with title, sourceUrl, summary, tags.hookType/topic/durationBucket.",
    importHelpCsv: "CSV header: title,sourceUrl,summary,hookType,topic,durationBucket",
    json: "JSON",
    csv: "CSV",
    importButton: "Import Library Data",
    importing: "Importing...",
    importFailed: "Import failed.",
    emptyImport: "Paste JSON or CSV content first.",
    emptyResult: "No library items match your current search.",
    imported: "Imported",
    items: "items",
    total: "Total",
    filtered: "Filtered",
    open: "Open source",
    tagHook: "Hook",
    tagTopic: "Topic",
    tagDuration: "Duration"
  },
  zh: {
    title: "爆款库",
    subtitle: "搜索对标素材库，并导入 JSON/CSV 简版数据，供后续 RAG 检索使用。",
    searchLabel: "搜索",
    searchPlaceholder: "搜索标题、摘要、主题、钩子类型...",
    importTitle: "导入条目",
    importHelpJson: "JSON 支持数组格式，字段可用 title、sourceUrl、summary、tags.hookType/topic/durationBucket。",
    importHelpCsv: "CSV 表头：title,sourceUrl,summary,hookType,topic,durationBucket",
    json: "JSON",
    csv: "CSV",
    importButton: "导入爆款库数据",
    importing: "导入中...",
    importFailed: "导入失败。",
    emptyImport: "请先粘贴 JSON 或 CSV 内容。",
    emptyResult: "当前搜索没有匹配到任何爆款库条目。",
    imported: "已导入",
    items: "条",
    total: "总数",
    filtered: "筛选后",
    open: "打开来源",
    tagHook: "钩子",
    tagTopic: "主题",
    tagDuration: "时长"
  }
} as const;

const jsonPlaceholder = `[
  {
    "title": "Hook teardown",
    "sourceUrl": "https://youtube.com/watch?v=demo",
    "summary": "Outcome first, then conflict.",
    "tags": {
      "hookType": "result-first",
      "topic": "education",
      "durationBucket": "5-10m"
    }
  }
]`;

const csvPlaceholder = `title,sourceUrl,summary,hookType,topic,durationBucket
Hook teardown,https://youtube.com/watch?v=demo,"Outcome first, then conflict.",result-first,education,5-10m`;

export function LibraryManager({ lang, initialItems }: Props) {
  const copy = copyByLang[lang];
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<ImportFormat>("json");
  const [content, setContent] = useState("");
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.sourceUrl,
        item.tags.hookType,
        item.tags.topic,
        item.tags.durationBucket
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [items, query]);

  function handleImport() {
    if (!content.trim()) {
      setError(copy.emptyImport);
      setMessage("");
      return;
    }

    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/library/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ format, content })
        });

        const payload = (await response.json().catch(() => null)) as ImportResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          setError(payload?.error?.message ?? copy.importFailed);
          return;
        }

        setItems(payload.data.items);
        setContent("");
        setMessage(`${copy.imported} ${payload.data.imported_count} ${copy.items}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.importFailed);
      }
    });
  }

  return (
    <div className="library-shell">
      <div className="library-header">
        <div>
          <h1 style={{ marginTop: 0 }}>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="library-stats">
          <span className="badge">{copy.total}: {items.length}</span>
          <span className="badge">{copy.filtered}: {filtered.length}</span>
        </div>
      </div>

      <div className="library-layout">
        <section className="card panel">
          <div className="library-search-row">
            <label className="small" htmlFor="library-search">{copy.searchLabel}</label>
            <input
              id="library-search"
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </div>

          <div className="library-grid" style={{ marginTop: 18 }}>
            {filtered.length ? (
              filtered.map((item) => (
                <article className="card panel library-card" key={item.id}>
                  <div className="library-card-head">
                    <h3 style={{ margin: 0 }}>{item.title}</h3>
                    <span className="badge">{item.tags.topic}</span>
                  </div>
                  <p>{item.summary}</p>
                  <p className="small mono">
                    {copy.tagHook}: {item.tags.hookType} · {copy.tagDuration}: {item.tags.durationBucket}
                  </p>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} className="small library-link" target="_blank" rel="noreferrer">
                      {copy.open}
                    </a>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="card panel empty-state">{copy.emptyResult}</div>
            )}
          </div>
        </section>

        <aside className="card panel import-panel">
          <h2 style={{ marginTop: 0 }}>{copy.importTitle}</h2>
          <div className="tab-bar" style={{ marginBottom: 12 }}>
            <button type="button" className={`tab-button ${format === "json" ? "tab-button-active" : ""}`} onClick={() => setFormat("json")}>
              {copy.json}
            </button>
            <button type="button" className={`tab-button ${format === "csv" ? "tab-button-active" : ""}`} onClick={() => setFormat("csv")}>
              {copy.csv}
            </button>
          </div>
          <p className="small">{format === "json" ? copy.importHelpJson : copy.importHelpCsv}</p>
          <textarea
            className="textarea"
            rows={16}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={format === "json" ? jsonPlaceholder : csvPlaceholder}
          />
          {message ? <p className="status-done small">{message}</p> : null}
          {error ? <p className="status-failed small">{error}</p> : null}
          <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isPending}>
            {isPending ? copy.importing : copy.importButton}
          </button>
        </aside>
      </div>
    </div>
  );
}
