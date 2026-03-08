import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readDb, writeDb } from "@/lib/db";
import { fallbackLibrary } from "@/lib/mock-data";
import {
  assertUsageWithinLimit,
  toUsageLimitDetails,
  UsageLimitExceededError
} from "@/lib/quota";
import { normalizeUserIdForBackend, useSupabaseBackend } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  Report,
  ReportShareAuditSummary,
  ReportStatus,
  UsageLog,
  User,
  ViralLibraryItem
} from "@/lib/types";

type QueryOptions = {
  supabaseClient?: SupabaseClient | null;
  action?: string;
  includeDeleted?: boolean;
};

type ReportRow = {
  id: string;
  user_id: string;
  video_id: string;
  status: ReportStatus;
  analysis_json: Report["analysisJson"];
  benchmarks_json: Report["benchmarksJson"];
  score_json: Report["scoreJson"];
  score_total: number | null;
  model_trace: Report["modelTrace"];
  error_message?: string | null;
  share_token?: string | null;
  share_enabled_at?: string | null;
  share_expires_at?: string | null;
  share_revoked_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ReportShareAccessLogRow = {
  id: string;
  report_id: string;
  share_token: string;
  accessed_at: string;
  user_agent?: string | null;
  referer?: string | null;
};

type LibraryRow = {
  id: string;
  title: string;
  source_url: string | null;
  summary: string | null;
  tags: unknown;
  created_at: string | null;
  deleted_at?: string | null;
  embedding_key?: string | null;
};

export type LibraryImportInput = {
  title: string;
  sourceUrl?: string;
  summary: string;
  tags?: Partial<ViralLibraryItem["tags"]>;
};

const REPORT_SHARE_TTL_HOURS = 24 * 7;

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    userId: row.user_id,
    videoId: row.video_id,
    status: row.status,
    analysisJson: row.analysis_json,
    benchmarksJson: row.benchmarks_json,
    scoreJson: row.score_json,
    scoreTotal: row.score_total,
    modelTrace: row.model_trace,
    errorMessage: row.error_message ?? undefined,
    shareToken: row.share_token ?? null,
    shareEnabledAt: row.share_enabled_at ?? null,
    shareExpiresAt: row.share_expires_at ?? null,
    shareRevokedAt: row.share_revoked_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function resolveReportShareExpiresAt(ttlHours = REPORT_SHARE_TTL_HOURS) {
  const safeTtlHours = Math.max(1, Math.floor(ttlHours));
  return new Date(Date.now() + safeTtlHours * 3600_000).toISOString();
}

function isReportShareActive(report: Pick<Report, "shareToken" | "shareEnabledAt" | "shareExpiresAt" | "shareRevokedAt">) {
  if (!report.shareToken || !report.shareEnabledAt || !report.shareExpiresAt || report.shareRevokedAt) {
    return false;
  }

  const expiresAt = new Date(report.shareExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function parseUsageLimitDetails(raw: unknown): {
  plan?: string;
  used_today?: number;
  limit_per_day?: number;
} | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      plan?: string;
      used_today?: number;
      limit_per_day?: number;
    };

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toUsage(row: {
  id: string;
  user_id: string;
  action: string;
  cost_tokens: number;
  cost_usd: number | null;
  created_at: string;
}): UsageLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    costTokens: row.cost_tokens,
    costUsd: row.cost_usd,
    createdAt: row.created_at
  };
}

async function getSupabaseUserClient(options?: QueryOptions): Promise<SupabaseClient | null> {
  if (!useSupabaseBackend()) {
    return null;
  }

  if (options?.supabaseClient) {
    return options.supabaseClient;
  }

  try {
    return await createServerSupabaseClient();
  } catch {
    throw new Error("SUPABASE_REQUEST_CONTEXT_MISSING");
  }
}

export async function createReport(
  input: {
    userId: string;
    videoId: string;
    status?: ReportStatus;
  },
  options?: QueryOptions
): Promise<Report> {
  const now = new Date().toISOString();

  const client = await getSupabaseUserClient(options);
  if (client) {
    const payload = {
      user_id: normalizeUserIdForBackend(input.userId),
      video_id: input.videoId,
      status: input.status ?? "queued",
      analysis_json: null,
      benchmarks_json: null,
      score_json: null,
      score_total: null,
      model_trace: null,
      share_token: null,
      share_enabled_at: null,
      share_expires_at: null,
      share_revoked_at: null,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await client
      .from("reports")
      .insert(payload)
      .select("*")
      .single<ReportRow>();

    if (error) {
      throw new Error(`SUPABASE_CREATE_REPORT_FAILED:${error.message}`);
    }

    return toReport(data);
  }

  const db = await readDb();
  const report: Report = {
    id: crypto.randomUUID(),
    userId: input.userId,
    videoId: input.videoId,
    status: input.status ?? "queued",
    analysisJson: null,
    benchmarksJson: null,
    scoreJson: null,
    scoreTotal: null,
    modelTrace: null,
    shareToken: null,
    shareEnabledAt: null,
    shareExpiresAt: null,
    shareRevokedAt: null,
    createdAt: now,
    updatedAt: now
  };

  db.reports.unshift(report);
  await writeDb(db);
  return report;
}

export async function updateReport(
  reportId: string,
  patch: Partial<Omit<Report, "id" | "userId" | "videoId" | "createdAt">>,
  options?: QueryOptions
): Promise<Report | null> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (patch.status !== undefined) {
      payload.status = patch.status;
    }
    if (patch.analysisJson !== undefined) {
      payload.analysis_json = patch.analysisJson;
    }
    if (patch.benchmarksJson !== undefined) {
      payload.benchmarks_json = patch.benchmarksJson;
    }
    if (patch.scoreJson !== undefined) {
      payload.score_json = patch.scoreJson;
    }
    if (patch.scoreTotal !== undefined) {
      payload.score_total = patch.scoreTotal;
    }
    if (patch.modelTrace !== undefined) {
      payload.model_trace = patch.modelTrace;
    }
    if (patch.errorMessage !== undefined) {
      payload.error_message = patch.errorMessage;
    }
    if (patch.shareToken !== undefined) {
      payload.share_token = patch.shareToken;
    }
    if (patch.shareEnabledAt !== undefined) {
      payload.share_enabled_at = patch.shareEnabledAt;
    }
    if (patch.shareExpiresAt !== undefined) {
      payload.share_expires_at = patch.shareExpiresAt;
    }
    if (patch.shareRevokedAt !== undefined) {
      payload.share_revoked_at = patch.shareRevokedAt;
    }

    const { data, error } = await client
      .from("reports")
      .update(payload)
      .eq("id", reportId)
      .select("*")
      .maybeSingle<ReportRow>();

    if (error) {
      throw new Error(`SUPABASE_UPDATE_REPORT_FAILED:${error.message}`);
    }

    return data ? toReport(data) : null;
  }

  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId);

  if (!report) {
    return null;
  }

  Object.assign(report, patch, { updatedAt: new Date().toISOString() });
  await writeDb(db);
  return report;
}

export async function getReportById(
  reportId: string,
  userId?: string,
  options?: QueryOptions
): Promise<Report | null> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    let query = client.from("reports").select("*").eq("id", reportId);

    if (userId) {
      query = query.eq("user_id", normalizeUserIdForBackend(userId));
    }

    const { data, error } = await query.maybeSingle<ReportRow>();

    if (error) {
      throw new Error(`SUPABASE_GET_REPORT_FAILED:${error.message}`);
    }

    return data ? toReport(data) : null;
  }

  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId) ?? null;

  if (!report) {
    return null;
  }

  if (userId && report.userId !== userId) {
    return null;
  }

  return report;
}

export async function getReportByShareToken(
  shareToken: string,
  options?: QueryOptions
): Promise<Report | null> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("share_token", shareToken)
      .maybeSingle<ReportRow>();

    if (error) {
      throw new Error(`SUPABASE_GET_SHARED_REPORT_FAILED:${error.message}`);
    }

    return data ? toReport(data) : null;
  }

  const db = await readDb();
  return db.reports.find((item) => item.shareToken === shareToken && isReportShareActive(item)) ?? null;
}

export async function enableReportShare(
  reportId: string,
  userId: string,
  options?: QueryOptions & { ttlHours?: number }
): Promise<Report | null> {
  const report = await getReportById(reportId, userId, options);
  if (!report) {
    return null;
  }

  const now = new Date().toISOString();
  const keepExistingToken = isReportShareActive(report) && report.shareToken;

  return updateReport(
    reportId,
    {
      shareToken: keepExistingToken ? report.shareToken : crypto.randomUUID(),
      shareEnabledAt: now,
      shareExpiresAt: resolveReportShareExpiresAt(options?.ttlHours),
      shareRevokedAt: null
    },
    options
  );
}

export async function disableReportShare(
  reportId: string,
  userId: string,
  options?: QueryOptions
): Promise<Report | null> {
  const report = await getReportById(reportId, userId, options);
  if (!report || !report.shareToken || !report.shareEnabledAt || report.shareRevokedAt) {
    return report;
  }

  return updateReport(
    reportId,
    {
      shareRevokedAt: new Date().toISOString()
    },
    options
  );
}

export async function recordReportShareAccess(
  reportId: string,
  shareToken: string,
  metadata?: {
    userAgent?: string | null;
    referer?: string | null;
    supabaseClient?: SupabaseClient | null;
  }
): Promise<void> {
  if (useSupabaseBackend()) {
    const client = metadata?.supabaseClient;
    if (!client) {
      return;
    }

    const { error } = await client.from("report_share_access_logs").insert({
      report_id: reportId,
      share_token: shareToken,
      user_agent: metadata?.userAgent?.trim() || null,
      referer: metadata?.referer?.trim() || null
    });

    if (error) {
      throw new Error(`SUPABASE_RECORD_SHARE_ACCESS_FAILED:${error.message}`);
    }
    return;
  }

  const db = await readDb();
  const report = db.reports.find((item) => item.id === reportId && item.shareToken === shareToken);
  if (!report || !isReportShareActive(report)) {
    return;
  }

  db.reportShareAccessLogs.unshift({
    id: crypto.randomUUID(),
    reportId,
    shareToken,
    accessedAt: new Date().toISOString(),
    userAgent: metadata?.userAgent?.trim() || null,
    referer: metadata?.referer?.trim() || null
  });
  await writeDb(db);
}

export async function getReportShareAuditSummary(
  reportId: string,
  options?: QueryOptions
): Promise<ReportShareAuditSummary> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const [{ count, error: countError }, { data, error: lastError }] = await Promise.all([
      client
        .from("report_share_access_logs")
        .select("id", { count: "exact", head: true })
        .eq("report_id", reportId),
      client
        .from("report_share_access_logs")
        .select("accessed_at")
        .eq("report_id", reportId)
        .order("accessed_at", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<ReportShareAccessLogRow, "accessed_at">>()
    ]);

    if (countError) {
      throw new Error(`SUPABASE_REPORT_SHARE_AUDIT_COUNT_FAILED:${countError.message}`);
    }
    if (lastError) {
      throw new Error(`SUPABASE_REPORT_SHARE_AUDIT_LAST_FAILED:${lastError.message}`);
    }

    return {
      accessCount: count ?? 0,
      lastAccessedAt: data?.accessed_at ?? null
    };
  }

  const db = await readDb();
  const matchingLogs = db.reportShareAccessLogs
    .filter((item) => item.reportId === reportId)
    .sort((left, right) => +new Date(right.accessedAt) - +new Date(left.accessedAt));

  return {
    accessCount: matchingLogs.length,
    lastAccessedAt: matchingLogs[0]?.accessedAt ?? null
  };
}

export async function listReports(
  params: {
    userId: string;
    limit: number;
    cursor?: string;
  },
  options?: QueryOptions
): Promise<{ data: Report[]; nextCursor: string | null }> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(params.userId);
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<ReportRow[]>();

    if (error) {
      throw new Error(`SUPABASE_LIST_REPORTS_FAILED:${error.message}`);
    }

    const reports = (data ?? []).map(toReport);
    const startIndex = params.cursor
      ? Math.max(0, reports.findIndex((item) => item.id === params.cursor) + 1)
      : 0;

    const page = reports.slice(startIndex, startIndex + params.limit);
    const next = reports[startIndex + params.limit];

    return {
      data: page,
      nextCursor: next?.id ?? null
    };
  }

  const db = await readDb();
  const sorted = db.reports
    .filter((item) => item.userId === params.userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const startIndex = params.cursor
    ? Math.max(0, sorted.findIndex((item) => item.id === params.cursor) + 1)
    : 0;

  const data = sorted.slice(startIndex, startIndex + params.limit);
  const next = sorted[startIndex + params.limit];

  return {
    data,
    nextCursor: next?.id ?? null
  };
}

export async function consumeUsage(
  input: {
    userId: string;
    plan: User["plan"];
    action: string;
    costTokens: number;
    costUsd?: number | null;
  },
  options?: QueryOptions
): Promise<UsageLog> {
  if (input.action === "analyze") {
    const usedToday = await countUsageForDay(input.userId, {
      ...options,
      action: "analyze"
    });
    assertUsageWithinLimit(input.plan, usedToday);
  }

  const client = await getSupabaseUserClient(options);
  if (client) {
    const payload = {
      user_id: normalizeUserIdForBackend(input.userId),
      action: input.action,
      cost_tokens: input.costTokens,
      cost_usd: input.costUsd ?? null
    };

    const { data, error } = await client
      .from("usage_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.message.includes("USAGE_LIMIT_EXCEEDED")) {
        const parsedDetails = parseUsageLimitDetails(error.details);
        const usedToday =
          typeof parsedDetails?.used_today === "number" ? parsedDetails.used_today : 0;
        const fallback = toUsageLimitDetails(input.plan, usedToday);

        throw new UsageLimitExceededError({
          plan: parsedDetails?.plan === "pro" ? "pro" : fallback.plan,
          used_today: usedToday,
          limit_per_day:
            typeof parsedDetails?.limit_per_day === "number"
              ? parsedDetails.limit_per_day
              : fallback.limit_per_day
        });
      }

      throw new Error(`SUPABASE_CONSUME_USAGE_FAILED:${error.message}`);
    }

    return toUsage(data as {
      id: string;
      user_id: string;
      action: string;
      cost_tokens: number;
      cost_usd: number | null;
      created_at: string;
    });
  }

  const db = await readDb();
  const usage: UsageLog = {
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    costTokens: input.costTokens,
    costUsd: input.costUsd ?? null,
    createdAt: new Date().toISOString()
  };

  db.usageLogs.unshift(usage);
  await writeDb(db);
  return usage;
}

export async function countUsageForDay(userId: string, options?: QueryOptions): Promise<number> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(userId);
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    let query = client
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", normalizedUserId);

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    const { count, error } = await query
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString());

    if (error) {
      throw new Error(`SUPABASE_COUNT_USAGE_FAILED:${error.message}`);
    }

    return count ?? 0;
  }

  const db = await readDb();
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const dayKey = `${yyyy}-${mm}-${dd}`;

  return db.usageLogs.filter(
    (item) =>
      item.userId === userId &&
      item.createdAt.startsWith(dayKey) &&
      (options?.action ? item.action === options.action : true)
  ).length;
}

function normalizeTags(value: unknown): ViralLibraryItem["tags"] {
  const fallback = {
    hookType: "unknown",
    topic: "general",
    durationBucket: "5-10m"
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  return {
    hookType: String(candidate.hookType ?? candidate.hook_type ?? fallback.hookType),
    topic: String(candidate.topic ?? fallback.topic),
    durationBucket: String(candidate.durationBucket ?? candidate.duration_bucket ?? fallback.durationBucket)
  };
}

function toLibraryItem(row: LibraryRow): ViralLibraryItem {
  return {
    id: String(row.id),
    title: String(row.title),
    sourceUrl: String(row.source_url ?? ""),
    summary: String(row.summary ?? ""),
    tags: normalizeTags(row.tags),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null
  };
}

function normalizeLibraryImportItem(input: LibraryImportInput): LibraryImportInput {
  return {
    title: input.title.trim(),
    sourceUrl: (input.sourceUrl ?? "").trim(),
    summary: input.summary.trim(),
    tags: {
      hookType: input.tags?.hookType?.trim() || "unknown",
      topic: input.tags?.topic?.trim() || "general",
      durationBucket: input.tags?.durationBucket?.trim() || "5-10m"
    }
  };
}

export function buildLibraryEmbeddingKey(input: LibraryImportInput): string {
  const normalized = normalizeLibraryImportItem(input);
  const payload = [
    normalized.title.toLowerCase(),
    (normalized.sourceUrl ?? "").toLowerCase(),
    normalized.summary.toLowerCase(),
    normalized.tags?.hookType?.toLowerCase() ?? "unknown",
    normalized.tags?.topic?.toLowerCase() ?? "general",
    normalized.tags?.durationBucket?.toLowerCase() ?? "5-10m"
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function listLibraryItems(options?: QueryOptions): Promise<ViralLibraryItem[]> {
  const includeDeleted = Boolean(options?.includeDeleted);
  const client = await getSupabaseUserClient(options);
  if (client) {
    let query = client
      .from("viral_library_items")
      .select("id,title,source_url,summary,tags,created_at,deleted_at,embedding_key")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`SUPABASE_LIST_LIBRARY_FAILED:${error.message}`);
    }

    const mapped = (data ?? []).map((item) => toLibraryItem(item as LibraryRow));
    if (mapped.length > 0) {
      return mapped;
    }
  }

  const db = await readDb();
  const list = db.library.length > 0 ? db.library : fallbackLibrary;
  return list
    .filter((item) => includeDeleted || !item.deletedAt)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function importLibraryItems(
  items: LibraryImportInput[],
  options?: QueryOptions
): Promise<ViralLibraryItem[]> {
  const normalizedItems = items
    .map(normalizeLibraryImportItem)
    .filter((item) => item.title && item.summary);

  if (normalizedItems.length === 0) {
    return listLibraryItems(options);
  }

  const deduped = Array.from(
    new Map(normalizedItems.map((item) => [buildLibraryEmbeddingKey(item), item])).entries()
  );

  const client = await getSupabaseUserClient(options);
  if (client) {
    const payload = deduped.map(([embeddingKey, item]) => ({
      title: item.title,
      source_url: item.sourceUrl || null,
      summary: item.summary,
      tags: {
        hook_type: item.tags?.hookType ?? "unknown",
        topic: item.tags?.topic ?? "general",
        duration_bucket: item.tags?.durationBucket ?? "5-10m"
      },
      embedding_key: embeddingKey,
      deleted_at: null
    }));

    const { error } = await client
      .from("viral_library_items")
      .upsert(payload, { onConflict: "embedding_key" });

    if (error) {
      throw new Error(`SUPABASE_IMPORT_LIBRARY_FAILED:${error.message}`);
    }

    return listLibraryItems({ ...options, supabaseClient: client });
  }

  const db = await readDb();
  const existingByKey = new Map(
    db.library.map((item) => [
      buildLibraryEmbeddingKey({
        title: item.title,
        sourceUrl: item.sourceUrl,
        summary: item.summary,
        tags: item.tags
      }),
      item
    ])
  );

  for (const [embeddingKey, item] of deduped) {
    const existing = existingByKey.get(embeddingKey);
    if (existing) {
      existing.title = item.title;
      existing.sourceUrl = item.sourceUrl ?? "";
      existing.summary = item.summary;
      existing.tags = {
        hookType: item.tags?.hookType ?? "unknown",
        topic: item.tags?.topic ?? "general",
        durationBucket: item.tags?.durationBucket ?? "5-10m"
      };
      existing.deletedAt = null;
      continue;
    }

    db.library.unshift({
      id: crypto.randomUUID(),
      title: item.title,
      sourceUrl: item.sourceUrl ?? "",
      summary: item.summary,
      tags: {
        hookType: item.tags?.hookType ?? "unknown",
        topic: item.tags?.topic ?? "general",
        durationBucket: item.tags?.durationBucket ?? "5-10m"
      },
      createdAt: new Date().toISOString(),
      deletedAt: null
    });
  }

  db.library.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  await writeDb(db);
  return db.library.filter((item) => !item.deletedAt);
}

export async function getLibraryItemById(id: string, options?: QueryOptions): Promise<ViralLibraryItem | null> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { data, error } = await client
      .from("viral_library_items")
      .select("id,title,source_url,summary,tags,created_at,deleted_at,embedding_key")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`SUPABASE_GET_LIBRARY_ITEM_FAILED:${error.message}`);
    }

    return data ? toLibraryItem(data as LibraryRow) : null;
  }

  const db = await readDb();
  return db.library.find((item) => item.id === id) ?? null;
}

export async function deleteLibraryItem(id: string, options?: QueryOptions): Promise<boolean> {
  const deletedAt = new Date().toISOString();
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { data, error } = await client
      .from("viral_library_items")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`SUPABASE_DELETE_LIBRARY_FAILED:${error.message}`);
    }

    return Boolean(data?.id);
  }

  const db = await readDb();
  const item = db.library.find((entry) => entry.id === id && !entry.deletedAt);
  if (!item) {
    return false;
  }

  item.deletedAt = deletedAt;
  await writeDb(db);
  return true;
}

export async function restoreLibraryItem(id: string, options?: QueryOptions): Promise<boolean> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { data, error } = await client
      .from("viral_library_items")
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`SUPABASE_RESTORE_LIBRARY_FAILED:${error.message}`);
    }

    return Boolean(data?.id);
  }

  const db = await readDb();
  const item = db.library.find((entry) => entry.id === id && entry.deletedAt);
  if (!item) {
    return false;
  }

  item.deletedAt = null;
  await writeDb(db);
  return true;
}

export async function purgeLibraryItem(id: string, options?: QueryOptions): Promise<boolean> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { error, count } = await client
      .from("viral_library_items")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(`SUPABASE_PURGE_LIBRARY_FAILED:${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  const db = await readDb();
  const before = db.library.length;
  db.library = db.library.filter((item) => item.id !== id);
  if (db.library.length === before) {
    return false;
  }

  await writeDb(db);
  return true;
}

