import { access, readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import {
  ALL_LIBRARY_FOLDERS,
  UNCATEGORIZED_LIBRARY_FOLDER,
  filterLibraryItems
} from "@/lib/library-filters";
import { getServerLang } from "@/lib/i18n";
import { listLibraryItems } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import type { ViralLibraryItem } from "@/lib/types";

export const runtime = "nodejs";

type PdfCursor = {
  page: PDFPage;
  y: number;
};

type EmbeddedFonts = {
  regular: PDFFont;
  bold: PDFFont;
  unicodeEnabled: boolean;
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 44
};

const DEFAULT_CJK_FONT_PATHS = [
  process.env.PDF_CJK_FONT_PATH,
  "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsunb.ttf"
];

const DEFAULT_CJK_BOLD_FONT_PATHS = [
  process.env.PDF_CJK_BOLD_FONT_PATH,
  process.env.PDF_CJK_FONT_PATH,
  "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsunb.ttf"
];

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "viral-library";
}

function normalizeText(text: string, unicodeEnabled: boolean) {
  if (unicodeEnabled) {
    return text;
  }
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadEmbeddedFonts(pdf: PDFDocument): Promise<EmbeddedFonts> {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const regularCandidates = DEFAULT_CJK_FONT_PATHS.filter((value): value is string => Boolean(value));
  const boldCandidates = DEFAULT_CJK_BOLD_FONT_PATHS.filter((value): value is string => Boolean(value));

  if (regularCandidates.length === 0) {
    return { regular, bold, unicodeEnabled: false };
  }

  pdf.registerFontkit(fontkit);

  for (const regularPath of regularCandidates) {
    if (!(await pathExists(regularPath))) {
      continue;
    }

    try {
      const regularBytes = await readFile(regularPath);
      const embeddedRegular = await pdf.embedFont(regularBytes);

      for (const boldPath of boldCandidates) {
        if (!(await pathExists(boldPath))) {
          continue;
        }

        try {
          const boldBytes = await readFile(boldPath);
          const embeddedBold = await pdf.embedFont(boldBytes);
          return { regular: embeddedRegular, bold: embeddedBold, unicodeEnabled: true };
        } catch {
          continue;
        }
      }

      return { regular: embeddedRegular, bold: embeddedRegular, unicodeEnabled: true };
    } catch {
      continue;
    }
  }

  return { regular, bold, unicodeEnabled: false };
}

function ensurePage(document: PDFDocument, cursor: PdfCursor, minY = 90): PdfCursor {
  if (cursor.y >= minY) {
    return cursor;
  }

  return {
    page: document.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin
  };
}

function wrapParagraph(text: string, font: PDFFont, size: number, maxWidth: number) {
  const tokens = text.match(/\S+\s*/g) ?? [];
  if (tokens.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const token of tokens) {
    const next = current + token;
    if (!current || font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    lines.push(current.trimEnd());
    current = token;
  }

  if (current.trim()) {
    lines.push(current.trimEnd());
  }

  return lines;
}

function drawTextBlock(
  document: PDFDocument,
  cursor: PdfCursor,
  text: string,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
  unicodeEnabled: boolean
) {
  let nextCursor = cursor;
  const normalized = normalizeText(text, unicodeEnabled);
  const lines = normalized
    .split(/\r?\n/)
    .flatMap((line) => wrapParagraph(line, font, size, PAGE.width - PAGE.margin * 2));

  for (const line of lines) {
    nextCursor = ensurePage(document, nextCursor);
    nextCursor.page.drawText(line, {
      x: PAGE.margin,
      y: nextCursor.y,
      size,
      font,
      color
    });
    nextCursor = { ...nextCursor, y: nextCursor.y - lineHeight };
  }

  return nextCursor;
}

function formatStat(value: number | undefined | null) {
  if (!value || value <= 0) {
    return "--";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(durationSec: number | undefined | null) {
  if (!durationSec || durationSec <= 0) {
    return "--";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function resolveFolderLabel(item: ViralLibraryItem, lang: "en" | "zh") {
  if (item.folder) {
    return item.folder;
  }
  return lang === "zh" ? "未分类" : "Uncategorized";
}

function resolveExportTitle(lang: "en" | "zh", count: number) {
  return lang === "zh" ? `爆款库导出 (${count} 条)` : `Viral Library Export (${count} items)`;
}

function resolveFilterSubtitle(lang: "en" | "zh", query: string, folder: string) {
  const queryLabel = query || (lang === "zh" ? "全部关键词" : "All queries");
  const folderLabel =
    folder === ALL_LIBRARY_FOLDERS
      ? lang === "zh"
        ? "全部分类"
        : "All folders"
      : folder === UNCATEGORIZED_LIBRARY_FOLDER
        ? lang === "zh"
          ? "未分类"
          : "Uncategorized"
        : folder || (lang === "zh" ? "全部分类" : "All folders");

  return lang === "zh"
    ? `筛选条件：关键词 ${queryLabel} ｜ 分类 ${folderLabel}`
    : `Filters: query ${queryLabel} | folder ${folderLabel}`;
}

export const GET = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const folder = url.searchParams.get("folder")?.trim() || ALL_LIBRARY_FOLDERS;
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const lang = await getServerLang();
  const libraryItems = await listLibraryItems({ supabaseClient });
  const filteredItems = filterLibraryItems(libraryItems, {
    query,
    folderFilter: folder
  });

  const pdf = await PDFDocument.create();
  const fonts = await loadEmbeddedFonts(pdf);
  let cursor: PdfCursor = {
    page: pdf.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin
  };

  cursor = drawTextBlock(
    pdf,
    cursor,
    resolveExportTitle(lang, filteredItems.length),
    fonts.bold,
    20,
    rgb(0.07, 0.12, 0.2),
    28,
    fonts.unicodeEnabled
  );
  cursor = drawTextBlock(
    pdf,
    { ...cursor, y: cursor.y - 4 },
    resolveFilterSubtitle(lang, query, folder),
    fonts.regular,
    10,
    rgb(0.38, 0.46, 0.58),
    16,
    fonts.unicodeEnabled
  );

  for (const [index, item] of filteredItems.entries()) {
    cursor = ensurePage(pdf, { ...cursor, y: cursor.y - 6 }, 140);
    cursor.page.drawRectangle({
      x: PAGE.margin - 10,
      y: cursor.y - 104,
      width: PAGE.width - PAGE.margin * 2 + 20,
      height: 110,
      borderColor: rgb(0.79, 0.86, 0.95),
      borderWidth: 1
    });

    cursor = drawTextBlock(
      pdf,
      cursor,
      `${index + 1}. ${item.title}`,
      fonts.bold,
      13,
      rgb(0.08, 0.12, 0.2),
      18,
      fonts.unicodeEnabled
    );
    cursor = drawTextBlock(
      pdf,
      cursor,
      `${lang === "zh" ? "分类" : "Folder"}: ${resolveFolderLabel(item, lang)} | ${
        lang === "zh" ? "频道" : "Channel"
      }: ${item.channelName || "--"} | ${lang === "zh" ? "时长" : "Duration"}: ${formatDuration(item.durationSec)}`,
      fonts.regular,
      10,
      rgb(0.35, 0.43, 0.54),
      14,
      fonts.unicodeEnabled
    );
    cursor = drawTextBlock(
      pdf,
      cursor,
      `${lang === "zh" ? "播放" : "Views"}: ${formatStat(item.stats?.viewCount)} | ${
        lang === "zh" ? "点赞" : "Likes"
      }: ${formatStat(item.stats?.likeCount)} | ${lang === "zh" ? "评论" : "Comments"}: ${formatStat(item.stats?.commentCount)}`,
      fonts.regular,
      10,
      rgb(0.35, 0.43, 0.54),
      14,
      fonts.unicodeEnabled
    );
    cursor = drawTextBlock(
      pdf,
      cursor,
      `${lang === "zh" ? "标签" : "Tags"}: ${item.tags.topic} / ${item.tags.hookType} / ${item.tags.durationBucket}`,
      fonts.regular,
      10,
      rgb(0.35, 0.43, 0.54),
      14,
      fonts.unicodeEnabled
    );
    cursor = drawTextBlock(
      pdf,
      cursor,
      `${lang === "zh" ? "来源" : "Source"}: ${item.sourceUrl || "--"}`,
      fonts.regular,
      9,
      rgb(0.23, 0.38, 0.6),
      13,
      fonts.unicodeEnabled
    );
    cursor = drawTextBlock(
      pdf,
      cursor,
      `${lang === "zh" ? "摘要" : "Summary"}: ${item.summary || "--"}`,
      fonts.regular,
      10,
      rgb(0.19, 0.24, 0.31),
      14,
      fonts.unicodeEnabled
    );
    cursor = { ...cursor, y: cursor.y - 14 };
  }

  if (filteredItems.length === 0) {
    cursor = drawTextBlock(
      pdf,
      { ...cursor, y: cursor.y - 18 },
      lang === "zh" ? "当前筛选条件下没有可导出的爆款条目。" : "No viral library items matched the current filters.",
      fonts.regular,
      11,
      rgb(0.4, 0.45, 0.52),
      16,
      fonts.unicodeEnabled
    );
  }

  const bytes = await pdf.save();
  const fileName = sanitizeFilename(resolveExportTitle(lang, filteredItems.length));

  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}.pdf"`
    }
  });
});
