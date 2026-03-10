"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import {
  ALL_LIBRARY_FOLDERS,
  UNCATEGORIZED_LIBRARY_FOLDER,
  filterLibraryItems,
  listLibraryFolders
} from "@/lib/library-filters";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan, ViralLibraryItem } from "@/lib/types";

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
    vector_sync?: {
      ok: boolean;
      message: string;
      detail?: string;
    };
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
    vector_sync?: {
      ok: boolean;
      message: string;
      detail?: string;
    };
  } | null;
  error?: ApiError | null;
};

type UpdateFolderResponse = {
  ok: boolean;
  data: {
    item: ViralLibraryItem;
  } | null;
  error?: ApiError | null;
};

type ErrorEnvelope = {
  ok: false;
  data: null;
  error?: ApiError | null;
};

type YoutubeFetchResponse = {
  ok: boolean;
  data: {
    video: {
      channelName?: string | null;
      publishedAt?: string | null;
      durationSec?: number | null;
      stats?: ViralLibraryItem["stats"] | null;
    };
  } | null;
  error?: ApiError | null;
};

type LibraryItemMetadataPatch = {
  channelName?: string | null;
  publishedAt?: string | null;
  durationSec?: number | null;
  stats?: ViralLibraryItem["stats"] | null;
};

const copyByLang = {
  en: {
    title: "Viral Library",
    subtitle: "Search references, import JSON/CSV, organize them into folders, and export each item to Excel.",
    searchLabel: "Search",
    searchPlaceholder: "Search by title, channel, folder, topic, hook...",
    folderFilterLabel: "Folder Filter",
    allFolders: "All folders",
    uncategorized: "Uncategorized",
    filterStatus: "Showing",
    searchKeyword: "Keyword",
    importTitle: "Import Items",
    importHelpJson:
      "JSON must be an array. Supported fields: title, sourceUrl, summary, channelName, publishedAt, durationSec, folder, stats, and tags.",
    importHelpCsv:
      "CSV headers can include: title,sourceUrl,summary,channelName,publishedAt,durationSec,viewCount,likeCount,commentCount,folder,hookType,topic,durationBucket",
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
    emptyResult: "No library items matched the current filters.",
    imported: "Imported",
    items: "items",
    total: "Total",
    filtered: "Filtered",
    open: "Open Source",
    exportExcel: "Export Excel",
    exportingExcel: "Exporting...",
    exportDone: "Export completed",
    exportFailed: "Export failed.",
    tagHook: "Hook",
    tagDuration: "Duration",
    channel: "Channel",
    publishedAt: "Published",
    views: "Views",
    likes: "Likes",
    comments: "Comments",
    folder: "Folder",
    folderPlaceholder: "Type a folder name",
    folderSaved: "Folder updated.",
    folderSave: "Save Folder",
    savingFolder: "Saving...",
    folderSaveFailed: "Could not update the folder.",
    folderHelp: "Leave blank to keep the item uncategorized.",
    deleteItem: "Delete",
    deleting: "Deleting...",
    deleteFailed: "Delete failed.",
    deleted: "Item moved to recycle bin.",
    recycleBin: "Recycle Bin",
    restore: "Restore",
    purge: "Delete Permanently",
    restoring: "Restoring...",
    purging: "Deleting...",
    noDeleted: "Recycle bin is empty.",
    planHint: "Current plan",
    sourceMissing: "No source URL",
    uncategorizedBadge: "Uncategorized"
  },
  zh: {
    title: "爆款库",
    subtitle: "搜索对标素材、导入 JSON/CSV、按分类夹整理，并支持逐条导出 Excel。",
    searchLabel: "搜索",
    searchPlaceholder: "搜索标题、频道、分类、主题、钩子类型...",
    folderFilterLabel: "分类筛选",
    allFolders: "全部分类",
    uncategorized: "未分类",
    filterStatus: "当前显示",
    searchKeyword: "关键词",
    importTitle: "导入条目",
    importHelpJson:
      "JSON 必须是数组格式，支持字段：title、sourceUrl、summary、channelName、publishedAt、durationSec、folder、stats、tags。",
    importHelpCsv:
      "CSV 表头可包含：title,sourceUrl,summary,channelName,publishedAt,durationSec,viewCount,likeCount,commentCount,folder,hookType,topic,durationBucket",
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
    emptyResult: "当前筛选条件下没有匹配到任何爆款库条目。",
    imported: "已导入",
    items: "条",
    total: "总数",
    filtered: "筛选后",
    open: "打开来源",
    exportExcel: "导出 Excel",
    exportingExcel: "导出中...",
    exportDone: "导出完成",
    exportFailed: "导出失败。",
    tagHook: "钩子",
    tagDuration: "时长",
    channel: "频道",
    publishedAt: "发布时间",
    views: "播放量",
    likes: "点赞数",
    comments: "评论数",
    folder: "分类夹",
    folderPlaceholder: "输入分类夹名称",
    folderSaved: "分类已更新。",
    folderSave: "保存分类",
    savingFolder: "保存中...",
    folderSaveFailed: "更新分类失败。",
    folderHelp: "留空即可保持未分类。",
    deleteItem: "删除",
    deleting: "删除中...",
    deleteFailed: "删除失败。",
    deleted: "已移入回收站。",
    recycleBin: "回收站",
    restore: "恢复",
    purge: "彻底删除",
    restoring: "恢复中...",
    purging: "删除中...",
    noDeleted: "回收站为空。",
    planHint: "当前套餐",
    sourceMissing: "暂无来源链接",
    uncategorizedBadge: "未分类"
  }
} as const;

const jsonPlaceholder = `[
  {
    "title": "Hook teardown",
    "sourceUrl": "https://youtube.com/watch?v=demo",
    "summary": "Outcome first, then conflict.",
    "channelName": "Demo Channel",
    "publishedAt": "2026-03-01T08:00:00.000Z",
    "durationSec": 420,
    "folder": "Education",
    "stats": {
      "viewCount": 182000,
      "likeCount": 9200,
      "commentCount": 610
    },
    "tags": {
      "hookType": "result-first",
      "topic": "education",
      "durationBucket": "5-10m"
    }
  }
]`;

const csvPlaceholder = `title,sourceUrl,summary,channelName,publishedAt,durationSec,viewCount,likeCount,commentCount,folder,hookType,topic,durationBucket
Hook teardown,https://youtube.com/watch?v=demo,"Outcome first, then conflict.",Demo Channel,2026-03-01T08:00:00.000Z,420,182000,9200,610,Education,result-first,education,5-10m`;

function formatCount(value: number | undefined | null, lang: Lang) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US").format(Math.max(0, value));
}

function formatDuration(durationSec: number | undefined | null) {
  if (!durationSec || durationSec <= 0) {
    return "--";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatPublished(value: string | undefined | null, lang: Lang) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function resolveFolderLabel(item: ViralLibraryItem, copy: { uncategorizedBadge: string }) {
  return item.folder || copy.uncategorizedBadge;
}

function inferFilenameFromDisposition(disposition: string | null, fallbackTitle: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? `${fallbackTitle}.xlsx`;
}

function needsMetadataBackfill(item: ViralLibraryItem) {
  return Boolean(item.sourceUrl) && (!item.channelName || !item.publishedAt || !item.durationSec || !item.stats);
}

function mergeLibraryItemMetadata(
  item: ViralLibraryItem,
  patch: LibraryItemMetadataPatch
): ViralLibraryItem {
  return {
    ...item,
    channelName: item.channelName || patch.channelName || null,
    publishedAt: item.publishedAt || patch.publishedAt || null,
    durationSec: item.durationSec || patch.durationSec || null,
    stats: item.stats || patch.stats || null
  };
}

export function LibraryManager({ lang, plan, initialItems, initialDeletedItems }: Props) {
  const copy = copyByLang[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backfilledItemIdsRef = useRef(new Set<string>());
  const isBackfillingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState(ALL_LIBRARY_FOLDERS);
  const [format, setFormat] = useState<ImportFormat>("json");
  const [content, setContent] = useState("");
  const [items, setItems] = useState(initialItems);
  const [deletedItems, setDeletedItems] = useState(initialDeletedItems);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadedFileName, setLoadedFileName] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [exportingId, setExportingId] = useState("");
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});
  const [savingFolderId, setSavingFolderId] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      filterLibraryItems(items, {
        query,
        folderFilter
      }),
    [folderFilter, items, query]
  );

  const folderOptions = useMemo(() => listLibraryFolders(items), [items]);
  const hasActiveFilters = query.trim().length > 0 || folderFilter !== ALL_LIBRARY_FOLDERS;

  useEffect(() => {
    const providerConfig = readApiIntegrationConfigFromStorage();
    if (!providerConfig.youtubeApiKey || isBackfillingRef.current) {
      return;
    }

    const candidates = items
      .filter((item) => needsMetadataBackfill(item) && !backfilledItemIdsRef.current.has(item.id))
      .slice(0, 6);

    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;
    isBackfillingRef.current = true;

    void (async () => {
      try {
        for (const item of candidates) {
          if (cancelled) {
            return;
          }

          backfilledItemIdsRef.current.add(item.id);

          const fetchResponse = await fetch("/api/youtube/fetch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...buildApiIntegrationHeaders(providerConfig)
            },
            body: JSON.stringify({ url: item.sourceUrl }),
            cache: "no-store"
          });

          const fetchPayload = (await fetchResponse.json().catch(() => null)) as YoutubeFetchResponse | null;
          if (!fetchResponse.ok || !fetchPayload?.ok || !fetchPayload.data?.video) {
            continue;
          }

          const metadataPatch: LibraryItemMetadataPatch = {
            channelName: fetchPayload.data.video.channelName ?? null,
            publishedAt: fetchPayload.data.video.publishedAt ?? null,
            durationSec: fetchPayload.data.video.durationSec ?? null,
            stats: fetchPayload.data.video.stats ?? null
          };

          setItems((current) =>
            current.map((entry) => (entry.id === item.id ? mergeLibraryItemMetadata(entry, metadataPatch) : entry))
          );

          const updateResponse = await fetch(`/api/library/${item.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...buildApiIntegrationHeaders(providerConfig)
            },
            body: JSON.stringify(metadataPatch)
          });

          const updatePayload = (await updateResponse.json().catch(() => null)) as UpdateFolderResponse | null;
          const updatedItem = updatePayload?.data?.item;
          if (!updateResponse.ok || !updatePayload?.ok || !updatedItem || cancelled) {
            continue;
          }

          setItems((current) =>
            current.map((entry) => (entry.id === item.id ? updatedItem : entry))
          );
        }
      } finally {
        isBackfillingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  function getFolderDraft(item: ViralLibraryItem) {
    return folderDrafts[item.id] ?? item.folder ?? "";
  }

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  function handleImport() {
    if (!content.trim()) {
      setError(copy.emptyImport);
      setMessage("");
      return;
    }

    resetFeedback();

    startTransition(async () => {
      try {
        const response = await fetch("/api/library/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
          },
          body: JSON.stringify({ format, content })
        });

        const payload = (await response.json().catch(() => null)) as ImportResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          setError(payload?.error?.message ?? copy.importFailed);
          return;
        }

        const activeIds = new Set(payload.data.items.map((item) => item.id));
        setItems(payload.data.items);
        setDeletedItems((current) => current.filter((item) => !activeIds.has(item.id)));
        setContent("");
        setLoadedFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setMessage(
          [
            `${copy.imported} ${payload.data.imported_count} ${copy.items}`,
            payload.data.vector_sync?.message ?? ""
          ]
            .filter(Boolean)
            .join(" · ")
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.importFailed);
      }
    });
  }

  async function handleDelete(item: ViralLibraryItem) {
    setDeletingId(item.id);
    resetFeedback();

    try {
      const response = await fetch(`/api/library/${item.id}`, {
        method: "DELETE",
        headers: {
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        }
      });
      const payload = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!response.ok || !payload?.ok || payload.data?.deleted !== true) {
        setError(payload?.error?.message ?? copy.deleteFailed);
        return;
      }

      const deletedAt = new Date().toISOString();
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setDeletedItems((current) => [{ ...item, deletedAt }, ...current]);
      setMessage([copy.deleted, payload.data.vector_sync?.message ?? ""].filter(Boolean).join(" · "));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    } finally {
      setDeletingId("");
    }
  }

  async function handleRecycleAction(item: ViralLibraryItem, action: "restore" | "purge") {
    setDeletingId(`${action}:${item.id}`);
    resetFeedback();

    try {
      const response = await fetch(`/api/library/${item.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
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
      setMessage(
        [
          action === "restore" ? copy.restore : copy.purge,
          payload.data.vector_sync?.message ?? ""
        ]
          .filter(Boolean)
          .join(" · ")
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    } finally {
      setDeletingId("");
    }
  }

  async function handleFolderSave(item: ViralLibraryItem) {
    setSavingFolderId(item.id);
    resetFeedback();

    try {
      const response = await fetch(`/api/library/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        },
        body: JSON.stringify({ folder: getFolderDraft(item).trim() || null })
      });

      const payload = (await response.json().catch(() => null)) as UpdateFolderResponse | null;
      if (!response.ok || !payload?.ok || !payload.data?.item) {
        setError(payload?.error?.message ?? copy.folderSaveFailed);
        return;
      }

      const nextItem = payload.data.item;
      setItems((current) => current.map((entry) => (entry.id === nextItem.id ? nextItem : entry)));
      setFolderDrafts((current) => ({
        ...current,
        [item.id]: nextItem.folder ?? ""
      }));
      setMessage(copy.folderSaved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.folderSaveFailed);
    } finally {
      setSavingFolderId("");
    }
  }

  async function handleExportItem(item: ViralLibraryItem) {
    setExportingId(item.id);
    resetFeedback();

    try {
      const response = await fetch(`/api/library/${item.id}/export`, {
        headers: {
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        }
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorEnvelope | null;
        setError(payload?.error?.message ?? copy.exportFailed);
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = inferFilenameFromDisposition(
        response.headers.get("content-disposition"),
        item.title.replace(/[\\/:*?"<>|]+/g, "-")
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setMessage(`${copy.exportDone}: ${item.title}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.exportFailed);
    } finally {
      setExportingId("");
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

      <div className="library-layout library-layout-compact">
        <section className="card panel">
          <div className="library-toolbar">
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

            <div className="library-search-row">
              <label className="small" htmlFor="library-folder-filter">{copy.folderFilterLabel}</label>
              <select
                id="library-folder-filter"
                className="input"
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
              >
                <option value={ALL_LIBRARY_FOLDERS}>{copy.allFolders}</option>
                <option value={UNCATEGORIZED_LIBRARY_FOLDER}>{copy.uncategorized}</option>
                {folderOptions.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters ? (
            <p className="small library-filter-status">
              {copy.filterStatus} {filtered.length} {copy.items}
              {query.trim() ? ` · ${copy.searchKeyword}: ${query.trim()}` : ""}
            </p>
          ) : null}
          {message ? <p className="status-done small">{message}</p> : null}
          {error ? <p className="status-failed small">{error}</p> : null}

          <datalist id="library-folder-options">
            {folderOptions.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>

          <div className="library-grid" style={{ marginTop: 18 }}>
            {filtered.length ? (
              filtered.map((item) => (
                <article className="card panel library-card" key={item.id}>
                  <div className="library-card-head library-card-head-start">
                    <div className="library-card-heading">
                      <h3 style={{ margin: 0 }}>{item.title}</h3>
                      <div className="library-badge-row">
                        <span className="badge">{item.tags.topic}</span>
                        <span className="badge">{resolveFolderLabel(item, copy)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="library-meta-grid small">
                    <span>{copy.channel}: {item.channelName || "--"}</span>
                    <span>{copy.publishedAt}: {formatPublished(item.publishedAt, lang)}</span>
                    <span>{copy.tagDuration}: {formatDuration(item.durationSec)}</span>
                  </div>

                  <div className="library-stats-row">
                    <div className="library-stat-card">
                      <span className="small">{copy.views}</span>
                      <strong>{formatCount(item.stats?.viewCount, lang)}</strong>
                    </div>
                    <div className="library-stat-card">
                      <span className="small">{copy.likes}</span>
                      <strong>{formatCount(item.stats?.likeCount, lang)}</strong>
                    </div>
                    <div className="library-stat-card">
                      <span className="small">{copy.comments}</span>
                      <strong>{formatCount(item.stats?.commentCount, lang)}</strong>
                    </div>
                  </div>

                  <p>{item.summary}</p>
                  <p className="small mono">
                    {copy.tagHook}: {item.tags.hookType} {" · "}
                    {copy.tagDuration}: {item.tags.durationBucket}
                  </p>

                  <div className="library-folder-row">
                    <div className="library-folder-field">
                      <label className="small" htmlFor={`folder-${item.id}`}>{copy.folder}</label>
                      <input
                        id={`folder-${item.id}`}
                        className="input"
                        list="library-folder-options"
                        value={getFolderDraft(item)}
                        onChange={(event) =>
                          setFolderDrafts((current) => ({
                            ...current,
                            [item.id]: event.target.value
                          }))
                        }
                        placeholder={copy.folderPlaceholder}
                      />
                      <span className="small">{copy.folderHelp}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost library-folder-save"
                      onClick={() => handleFolderSave(item)}
                      disabled={savingFolderId === item.id}
                    >
                      {savingFolderId === item.id ? copy.savingFolder : copy.folderSave}
                    </button>
                  </div>

                  <div className="library-card-actions">
                    <div className="library-card-action-group">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          className="btn btn-ghost library-link library-action-button"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {copy.open}
                        </a>
                      ) : (
                        <span className="small">{copy.sourceMissing}</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost library-export-inline library-action-button"
                        onClick={() => handleExportItem(item)}
                        disabled={exportingId === item.id}
                      >
                        {exportingId === item.id ? copy.exportingExcel : copy.exportExcel}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost library-delete-button"
                      onClick={() => handleDelete(item)}
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

        <aside className="library-side-stack">
          <section className="card panel import-panel">
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
              <button
                type="button"
                className="tab-button import-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
              >
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
              rows={14}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={format === "json" ? jsonPlaceholder : csvPlaceholder}
            />
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isPending}>
              {isPending ? copy.importing : copy.importButton}
            </button>
          </section>

          <section className="card panel import-panel">
            <div className="library-card-head">
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>{copy.recycleBin}</h2>
              <span className="badge">{deletedItems.length}</span>
            </div>
            {deletedItems.length === 0 ? (
              <p className="small">{copy.noDeleted}</p>
            ) : (
              <div className="recycle-list">
                {deletedItems.map((item) => (
                  <article key={item.id} className="collect-preview-card">
                    <strong>{item.title}</strong>
                    <p className="small">
                      {copy.folder}: {resolveFolderLabel(item, copy)} {" · "}
                      {copy.views}: {formatCount(item.stats?.viewCount, lang)}
                    </p>
                    <p className="small mono">deleted_at: {item.deletedAt ?? "--"}</p>
                    <div className="recent-report-actions" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-ghost report-history-action"
                        disabled={deletingId === `restore:${item.id}`}
                        onClick={() => handleRecycleAction(item, "restore")}
                      >
                        {deletingId === `restore:${item.id}` ? copy.restoring : copy.restore}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost report-history-action"
                        disabled={deletingId === `purge:${item.id}`}
                        onClick={() => handleRecycleAction(item, "purge")}
                      >
                        {deletingId === `purge:${item.id}` ? copy.purging : copy.purge}
                      </button>
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
