"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import type { Lang } from "@/lib/i18n-shared";
import type { ViralLibraryItem } from "@/lib/types";

type Props = {
  lang: Lang;
  initialItems: ViralLibraryItem[];
};

type ImportFormat = "json" | "csv";

type ApiError = {
  code?: string;
  message?: string;
};

type ImportResponse = {
  ok: boolean;
  data: {
    imported_count: number;
    items: ViralLibraryItem[];
  } | null;
  error?: ApiError | null;
};

type DeleteResponse = {
  ok: boolean;
  data: {
    deleted: boolean;
    id: string;
  } | null;
  error?: ApiError | null;
};

const copyByLang = {
  en: {
    title: "Viral Library",
    subtitle:
      "Search benchmark references, paste JSON/CSV snippets, or upload a local file for future retrieval and manual curation.",
    searchLabel: "Search",
    searchPlaceholder: "Search title, summary, topic, hook type...",
    importTitle: "Import Items",
    importHelpJson:
      "JSON must be an array of items. Supported fields: title, sourceUrl, summary, tags.hookType/topic/durationBucket.",
    importHelpCsv: "CSV header must be: title,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule:
      "Only .json or .csv files can be imported. Unsupported files will be rejected and cannot enter the library.",
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
    tagDuration: "Duration",
    deleteItem: "Delete",
    deleting: "Deleting...",
    deleteFailed: "Delete failed.",
    deleted: "Item deleted."
  },
  zh: {
    title: "爆款库",
    subtitle: "搜索对标素材库，可粘贴 JSON/CSV，也可上传本地文件，供后续检索与运营维护使用。",
    searchLabel: "搜索",
    searchPlaceholder: "搜索标题、摘要、主题、钩子类型...",
    importTitle: "导入条目",
    importHelpJson:
      "JSON 必须是数组格式，支持字段：title、sourceUrl、summary、tags.hookType/topic/durationBucket。",
    importHelpCsv: "CSV 表头必须是：title,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule: "只允许导入 .json 或 .csv 文件。格式不正确的文件会被拒绝，无法进入爆款库。",
    json: "JSON",
    csv: "CSV",
    uploadFile: "上传文件",
    importButton: "导入爆款库数据",
    importing: "导入中...",
    importFailed: "导入失败。",
    emptyImport: "请先粘贴 JSON/CSV 内容，或先上传文件。",
    invalidFileType: "仅支持 JSON 或 CSV 文件。",
    emptyFile: "所选文件为空。",
    fileReadFailed: "读取文件失败，请重新选择。",
    fileReady: "文件已载入，请确认内容后执行导入。",
    loadedFile: "已载入文件",
    emptyResult: "当前搜索没有匹配到任何爆款库条目。",
    imported: "已导入",
    items: "条",
    total: "总数",
    filtered: "筛选后",
    open: "打开来源",
    tagHook: "钩子",
    tagDuration: "时长",
    deleteItem: "删除",
    deleting: "删除中...",
    deleteFailed: "删除失败。",
    deleted: "已删除该条爆款。"
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
  const [deletingId, setDeletingId] = useState("");
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

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/library/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!response.ok || !payload?.ok || payload.data?.deleted !== true) {
        setError(payload?.error?.message ?? copy.deleteFailed);
        return;
      }

      setItems((current) => current.filter((item) => item.id !== itemId));
      setMessage(copy.deleted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    } finally {
      setDeletingId("");
    }
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
          <span className="badge">
            {copy.total}: {items.length}
          </span>
          <span className="badge">
            {copy.filtered}: {filtered.length}
          </span>
        </div>
      </div>

      <div className="library-layout">
        <section className="card panel">
          <div className="library-search-row">
            <label className="small" htmlFor="library-search">
              {copy.searchLabel}
            </label>
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
                    {copy.tagHook}: {item.tags.hookType} {" · "}
                    {copy.tagDuration}: {item.tags.durationBucket}
                  </p>
                  <div className="library-card-actions">
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} className="small library-link" target="_blank" rel="noreferrer">
                        {copy.open}
                      </a>
                    ) : (
                      <span className="small" />
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost library-delete-button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? copy.deleting : copy.deleteItem}
                    </button>
                  </div>
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
          {loadedFileName ? (
            <div className="import-file-chip">
              {copy.loadedFile}: {loadedFileName}
            </div>
          ) : null}

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
