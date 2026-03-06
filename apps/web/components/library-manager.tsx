"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
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
    subtitle: "Search benchmark references, paste JSON/CSV snippets, or upload a local file for future retrieval.",
    searchLabel: "Search",
    searchPlaceholder: "Search title, summary, topic, hook type...",
    importTitle: "Import Items",
    importHelpJson: "JSON must be an array of items. Supported fields: title, sourceUrl, summary, tags.hookType/topic/durationBucket.",
    importHelpCsv: "CSV header must be: title,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule: "Only .json or .csv files can be imported. Unsupported files will be rejected and cannot enter the library.",
    json: "JSON",
    csv: "CSV",
    uploadFile: "Upload File",
    importButton: "Import Library Data",
    importing: "Importing...",
    importFailed: "Import failed.",
    emptyImport: "Paste JSON/CSV content or upload a file first.",
    invalidFileType: "Only JSON or CSV files are allowed.",
    emptyFile: "The selected file is empty.",
    fileReadFailed: "Could not read the selected file.",
    fileReady: "File loaded. Review content and click import.",
    loadedFile: "Loaded file",
    emptyResult: "No library items match your current search.",
    imported: "Imported",
    items: "items",
    total: "Total",
    filtered: "Filtered",
    open: "Open source",
    tagHook: "Hook",
    tagDuration: "Duration"
  },
  zh: {
    title: "\u7206\u6b3e\u5e93",
    subtitle: "\u641c\u7d22\u5bf9\u6807\u7d20\u6750\u5e93\uff0c\u53ef\u7c98\u8d34 JSON/CSV\uff0c\u4e5f\u53ef\u4e0a\u4f20\u672c\u5730\u6587\u4ef6\uff0c\u4f9b\u540e\u7eed\u68c0\u7d22\u4e0e\u8fd0\u8425\u7ef4\u62a4\u4f7f\u7528\u3002",
    searchLabel: "\u641c\u7d22",
    searchPlaceholder: "\u641c\u7d22\u6807\u9898\u3001\u6458\u8981\u3001\u4e3b\u9898\u3001\u94a9\u5b50\u7c7b\u578b...",
    importTitle: "\u5bfc\u5165\u6761\u76ee",
    importHelpJson: "JSON \u5fc5\u987b\u662f\u6570\u7ec4\u683c\u5f0f\uff0c\u652f\u6301\u5b57\u6bb5\uff1atitle\u3001sourceUrl\u3001summary\u3001tags.hookType/topic/durationBucket\u3002",
    importHelpCsv: "CSV \u8868\u5934\u5fc5\u987b\u662f\uff1atitle,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule: "\u53ea\u5141\u8bb8\u5bfc\u5165 .json \u6216 .csv \u6587\u4ef6\u3002\u683c\u5f0f\u4e0d\u6b63\u786e\u7684\u6587\u4ef6\u4f1a\u88ab\u62d2\u7edd\uff0c\u65e0\u6cd5\u8fdb\u5165\u7206\u6b3e\u5e93\u3002",
    json: "JSON",
    csv: "CSV",
    uploadFile: "\u4e0a\u4f20\u6587\u4ef6",
    importButton: "\u5bfc\u5165\u7206\u6b3e\u5e93\u6570\u636e",
    importing: "\u5bfc\u5165\u4e2d...",
    importFailed: "\u5bfc\u5165\u5931\u8d25\u3002",
    emptyImport: "\u8bf7\u5148\u7c98\u8d34 JSON/CSV \u5185\u5bb9\uff0c\u6216\u5148\u4e0a\u4f20\u6587\u4ef6\u3002",
    invalidFileType: "\u4ec5\u652f\u6301 JSON \u6216 CSV \u6587\u4ef6\u3002",
    emptyFile: "\u6240\u9009\u6587\u4ef6\u4e3a\u7a7a\u3002",
    fileReadFailed: "\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9\u3002",
    fileReady: "\u6587\u4ef6\u5df2\u8f7d\u5165\uff0c\u8bf7\u786e\u8ba4\u5185\u5bb9\u540e\u6267\u884c\u5bfc\u5165\u3002",
    loadedFile: "\u5df2\u8f7d\u5165\u6587\u4ef6",
    emptyResult: "\u5f53\u524d\u641c\u7d22\u6ca1\u6709\u5339\u914d\u5230\u4efb\u4f55\u7206\u6b3e\u5e93\u6761\u76ee\u3002",
    imported: "\u5df2\u5bfc\u5165",
    items: "\u6761",
    total: "\u603b\u6570",
    filtered: "\u7b5b\u9009\u540e",
    open: "\u6253\u5f00\u6765\u6e90",
    tagHook: "\u94a9\u5b50",
    tagDuration: "\u65f6\u957f"
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<ImportFormat>("json");
  const [content, setContent] = useState("");
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadedFileName, setLoadedFileName] = useState("");
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
        setLoadedFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setMessage(`${copy.imported} ${payload.data.imported_count} ${copy.items}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.importFailed);
      }
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const detectedFormat = lowerName.endsWith(".json") ? "json" : lowerName.endsWith(".csv") ? "csv" : null;

    if (!detectedFormat) {
      setLoadedFileName("");
      setMessage("");
      setError(copy.invalidFileType);
      event.target.value = "";
      return;
    }

    try {
      const fileContent = await file.text();
      if (!fileContent.trim()) {
        setLoadedFileName("");
        setMessage("");
        setError(copy.emptyFile);
        event.target.value = "";
        return;
      }

      setFormat(detectedFormat);
      setContent(fileContent);
      setLoadedFileName(file.name);
      setError("");
      setMessage(copy.fileReady);
    } catch {
      setLoadedFileName("");
      setMessage("");
      setError(copy.fileReadFailed);
      event.target.value = "";
    }
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
                    {copy.tagHook}: {item.tags.hookType} \u00b7 {copy.tagDuration}: {item.tags.durationBucket}
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
          <div className="tab-bar import-toolbar">
            <button
              type="button"
              className={`tab-button ${format === "json" ? "tab-button-active" : ""}`}
              onClick={() => setFormat("json")}
            >
              {copy.json}
            </button>
            <button
              type="button"
              className={`tab-button ${format === "csv" ? "tab-button-active" : ""}`}
              onClick={() => setFormat("csv")}
            >
              {copy.csv}
            </button>
            <button type="button" className="tab-button import-upload-trigger" onClick={() => fileInputRef.current?.click()}>
              {copy.uploadFile}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="visually-hidden"
              onChange={handleFileChange}
            />
          </div>

          <p className="small">{format === "json" ? copy.importHelpJson : copy.importHelpCsv}</p>
          <p className="small import-rule">{copy.fileRule}</p>
          {loadedFileName ? <div className="import-file-chip">{copy.loadedFile}: {loadedFileName}</div> : null}

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