import * as XLSX from "xlsx";
import { z } from "zod";
import { errorJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { getLibraryItemById } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
});

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "viral-library-item";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDuration(durationSec: number | null | undefined) {
  if (!durationSec || durationSec <= 0) {
    return "";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const GET = withApiRoute<Params>(async (_request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library item id."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const item = await getLibraryItemById(parsedParams.data.id, { supabaseClient });

  if (!item) {
    return errorJsonResponse(
      {
        code: "LIBRARY_ITEM_NOT_FOUND",
        message: "Library item not found."
      },
      requestId,
      404
    );
  }

  const lang = await getServerLang();
  const rows =
    lang === "zh"
      ? [
          ["标题", item.title],
          ["来源链接", item.sourceUrl],
          ["频道", item.channelName ?? ""],
          ["发布时间", formatDate(item.publishedAt)],
          ["时长", formatDuration(item.durationSec)],
          ["播放量", item.stats?.viewCount ?? ""],
          ["点赞数", item.stats?.likeCount ?? ""],
          ["评论数", item.stats?.commentCount ?? ""],
          ["分类夹", item.folder ?? ""],
          ["主题", item.tags.topic],
          ["钩子类型", item.tags.hookType],
          ["时长标签", item.tags.durationBucket],
          ["摘要", item.summary],
          ["创建时间", formatDate(item.createdAt)]
        ]
      : [
          ["Title", item.title],
          ["Source URL", item.sourceUrl],
          ["Channel", item.channelName ?? ""],
          ["Published At", formatDate(item.publishedAt)],
          ["Duration", formatDuration(item.durationSec)],
          ["Views", item.stats?.viewCount ?? ""],
          ["Likes", item.stats?.likeCount ?? ""],
          ["Comments", item.stats?.commentCount ?? ""],
          ["Folder", item.folder ?? ""],
          ["Topic", item.tags.topic],
          ["Hook Type", item.tags.hookType],
          ["Duration Bucket", item.tags.durationBucket],
          ["Summary", item.summary],
          ["Created At", formatDate(item.createdAt)]
        ];

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    lang === "zh" ? "爆款详情" : "Viral Item"
  );

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer"
  });
  const filename = sanitizeFilename(item.title);

  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}.xlsx"`
    }
  });
});
