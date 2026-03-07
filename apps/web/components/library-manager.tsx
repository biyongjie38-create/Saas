"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import type { Lang } from "@/lib/i18n-shared";
import type { CollectedViralItem, UserPlan, ViralLibraryItem } from "@/lib/types";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";

type Props = {
  lang: Lang;
  plan: UserPlan;
  initialItems: ViralLibraryItem[];
  initialDeletedItems: ViralLibraryItem[];
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
    deleted?: boolean;
    id: string;
    action?: "restore" | "purge";
    success?: boolean;
  } | null;
  error?: ApiError | null;
};

type CollectResponse = {
  ok: boolean;
  data: {
    collected: CollectedViralItem[];
    imported_count: number;
    items: ViralLibraryItem[] | null;
    max_results_applied: number;
  } | null;
  error?: ApiError | null;
};

const copyByLang = {
  en: {
    title: "Viral Library",
    subtitle: "Search benchmark references, import JSON/CSV, collect recent winners, and maintain your working library.",
    searchLabel: "Search",
    searchPlaceholder: "Search title, summary, topic, hook type...",
    importTitle: "Import Items",
    collectTitle: "Collect Viral Works",
    importHelpJson:
      "JSON must be an array of items. Supported fields: title, sourceUrl, summary, tags.hookType/topic/durationBucket.",
    importHelpCsv: "CSV header must be: title,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule: "Only .json or .csv files can be imported. Unsupported files will be rejected.",
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
    deleted: "Item moved to recycle bin.",
    hoursWithin: "Published within hours",
    minViews: "Minimum views",
    maxResults: "Max results",
    regionCode: "Region code",
    collectButton: "Collect and Import",
    collecting: "Collecting...",
    collected: "Collected",
    recycleBin: "Recycle Bin",
    recycleHint: "Pro users can restore or purge deleted items.",
    restore: "Restore",
    purge: "Delete Permanently",
    restoring: "Restoring...",
    purging: "Purging...",
    noDeleted: "Recycle bin is empty.",
    planHint: "Current plan",
    proOnly: "Pro only",
    collectSummary: "Recent viral candidates"
  },
  zh: {
    title: "爆款库",
    subtitle: "搜索对标素材、导入 JSON/CSV、采集近期爆款作品，并统一维护自己的运营素材库。",
    searchLabel: "搜索",
    searchPlaceholder: "搜索标题、摘要、主题、钩子类型...",
    importTitle: "导入条目",
    collectTitle: "爆款作品采集",
    importHelpJson:
      "JSON 必须是数组格式，支持字段：title、sourceUrl、summary、tags.hookType/topic/durationBucket。",
    importHelpCsv: "CSV 表头必须是：title,sourceUrl,summary,hookType,topic,durationBucket",
    fileRule: "只允许导入 .json 或 .csv 文件。格式不正确的文件会被拒绝。",
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
    deleted: "已移入回收站。",
    hoursWithin: "采集最近多少小时",
    minViews: "最低播放量",
    maxResults: "最多采集条数",
    regionCode: "地区代码",
    collectButton: "采集并导入",
    collecting: "采集中...",
    collected: "已采集",
    recycleBin: "回收站",
    recycleHint: "专业版用户可以恢复或彻底删除回收站条目。",
    restore: "恢复",
    purge: "彻底删除",
    restoring: "恢复中...",
    purging: "删除中...",
    noDeleted: "回收站为空。",
    planHint: "当前套餐",
    proOnly: "专业版专享",
    collectSummary: "最近命中的爆款候选"
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

export function LibraryManager({ lang, plan, initialItems, initialDeletedItems }: Props) {
  const copy = copyByLang[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<ImportFormat>("json");
  const [content, setContent] = useState("");
  const [items, setItems] = useState(initialItems);
  const [deletedItems, setDeletedItems] = useState(initialDeletedItems);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadedFileName, setLoadedFileName] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [collectPreview, setCollectPreview] = useState<CollectedViralItem[]>([]);
  const [collectForm, setCollectForm] = useState({
    hoursWithin: 48,
    minViews: 100000,
    maxResults: plan === "pro" ? 20 : 10,
    regionCode: "US"
  });
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

  async function handleDelete(item: ViralLibraryItem) {
    setDeletingId(item.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/library/${item.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!response.ok || !payload?.ok || payload.data?.deleted !== true) {
        setError(payload?.error?.message ?? copy.deleteFailed);
        return;
      }

      const deletedAt = new Date().toISOString();
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setDeletedItems((current) => [{ ...item, deletedAt }, ...current]);
      setMessage(copy.deleted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    } finally {
      setDeletingId("");
    }
  }

  async function handleRecycleAction(item: ViralLibraryItem, action: "restore" | "purge") {
    setDeletingId(`${action}:${item.id}`);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/library/${item.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!response.ok || !payload?.ok || payload.data?.success !== true) {
        setError(payload?.error?.message ?? copy.deleteFailed);
        return;
      }

      if (action === "restore") {
        setDeletedItems((current) => current.filter((entry) => entry.id !== item.id));
        setItems((current) => [{ ...item, deletedAt: null }, ...current]);
      } else {
        setDeletedItems((current) => current.filter((entry) => entry.id !== item.id));
      }
      setMessage(action === "restore" ? copy.restore : copy.purge);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    } finally {
      setDeletingId("");
    }
  }

  async function handleCollect() {
    setCollecting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/library/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        },
        body: JSON.stringify({
          ...collectForm,
          autoImport: true
        })
      });

      const payload = (await response.json().catch(() => null)) as CollectResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? copy.importFailed);
        return;
      }

      setCollectPreview(payload.data.collected);
      if (payload.data.items) {
        setItems(payload.data.items);
      }
      setMessage(`${copy.collected} ${payload.data.collected.length} ${copy.items}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.importFailed);
    } finally {
      setCollecting(false);
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
          <span className="badge">{copy.planHint}: {plan}</span>
          <span className="badge">{copy.total}: {items.length}</span>
          <span className="badge">{copy.filtered}: {filtered.length}</span>
        </div>
      </div>

      <div className="library-layout">
        <section className="card panel">
          <div className="library-search-row">
            <label className="small" htmlFor="library-search">{copy.searchLabel}</label>
            <input id="library-search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
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
                    <button type="button" className="btn btn-ghost library-delete-button" onClick={() => handleDelete(item)} disabled={deletingId === item.id}>
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

        <aside className="library-side-stack">
          <section className="card panel import-panel">
            <h2 style={{ marginTop: 0 }}>{copy.collectTitle}</h2>
            <div className="integration-form-grid">
              <label className="integration-field">
                <span className="small">{copy.hoursWithin}</span>
                <input className="input" type="number" min={1} max={168} value={collectForm.hoursWithin} onChange={(event) => setCollectForm((current) => ({ ...current, hoursWithin: Number(event.target.value) || 24 }))} />
              </label>
              <label className="integration-field">
                <span className="small">{copy.minViews}</span>
                <input className="input" type="number" min={1000} step={1000} value={collectForm.minViews} onChange={(event) => setCollectForm((current) => ({ ...current, minViews: Number(event.target.value) || 100000 }))} />
              </label>
              <label className="integration-field">
                <span className="small">{copy.maxResults}</span>
                <input className="input" type="number" min={1} max={plan === "pro" ? 30 : 10} value={collectForm.maxResults} onChange={(event) => setCollectForm((current) => ({ ...current, maxResults: Number(event.target.value) || 10 }))} />
              </label>
              <label className="integration-field">
                <span className="small">{copy.regionCode}</span>
                <input className="input" value={collectForm.regionCode} onChange={(event) => setCollectForm((current) => ({ ...current, regionCode: event.target.value.toUpperCase() }))} placeholder="US" />
              </label>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleCollect} disabled={collecting}>
              {collecting ? copy.collecting : copy.collectButton}
            </button>
            {collectPreview.length > 0 ? (
              <div className="collect-preview-list">
                <p className="small" style={{ fontWeight: 700 }}>{copy.collectSummary}</p>
                {collectPreview.map((item) => (
                  <div key={item.id} className="collect-preview-card">
                    <strong>{item.title}</strong>
                    <p className="small">{item.channelName} · {item.stats.viewCount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card panel import-panel">
            <h2 style={{ marginTop: 0 }}>{copy.importTitle}</h2>
            <div className="tab-bar import-toolbar">
              <button type="button" className={`tab-button ${format === "json" ? "tab-button-active" : ""}`} onClick={() => setFormat("json")}>{copy.json}</button>
              <button type="button" className={`tab-button ${format === "csv" ? "tab-button-active" : ""}`} onClick={() => setFormat("csv")}>{copy.csv}</button>
              <button type="button" className="tab-button import-upload-trigger" onClick={() => fileInputRef.current?.click()}>{copy.uploadFile}</button>
              <input ref={fileInputRef} type="file" accept=".json,.csv,application/json,text/csv" className="visually-hidden" onChange={handleFileChange} />
            </div>

            <p className="small">{format === "json" ? copy.importHelpJson : copy.importHelpCsv}</p>
            <p className="small import-rule">{copy.fileRule}</p>
            {loadedFileName ? <div className="import-file-chip">{copy.loadedFile}: {loadedFileName}</div> : null}

            <textarea className="textarea" rows={14} value={content} onChange={(event) => setContent(event.target.value)} placeholder={format === "json" ? jsonPlaceholder : csvPlaceholder} />
            {message ? <p className="status-done small">{message}</p> : null}
            {error ? <p className="status-failed small">{error}</p> : null}
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isPending}>
              {isPending ? copy.importing : copy.importButton}
            </button>
          </section>

          <section className="card panel import-panel">
            <div className="library-card-head">
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>{copy.recycleBin}</h2>
              {plan === "pro" ? <span className="badge">PRO</span> : <span className="badge">{copy.proOnly}</span>}
            </div>
            <p className="small">{copy.recycleHint}</p>
            {deletedItems.length === 0 ? (
              <p className="small">{copy.noDeleted}</p>
            ) : (
              <div className="recycle-list">
                {deletedItems.map((item) => (
                  <article key={item.id} className="collect-preview-card">
                    <strong>{item.title}</strong>
                    <p className="small mono">deleted_at: {item.deletedAt ?? "--"}</p>
                    <div className="recent-report-actions" style={{ marginTop: 10 }}>
                      <button type="button" className="btn btn-ghost report-history-action" disabled={plan !== "pro" || deletingId === `restore:${item.id}`} onClick={() => handleRecycleAction(item, "restore")}>{deletingId === `restore:${item.id}` ? copy.restoring : copy.restore}</button>
                      <button type="button" className="btn btn-ghost report-history-action" disabled={plan !== "pro" || deletingId === `purge:${item.id}`} onClick={() => handleRecycleAction(item, "purge")}>{deletingId === `purge:${item.id}` ? copy.purging : copy.purge}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

