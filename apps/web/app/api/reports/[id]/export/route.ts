import { access, readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { z } from "zod";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse,
} from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { assertPlanFeature } from "@/lib/plan-access";
import { localizeSourceLabel } from "@/lib/report-localize";
import { withApiRoute } from "@/lib/api-response";
import { getReportById } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1),
});

type PdfCursor = {
  page: PDFPage;
  y: number;
};

type EmbeddedFonts = {
  regular: PDFFont;
  bold: PDFFont;
  unicodeEnabled: boolean;
};

type PdfCopy = {
  reportTitle: string;
  reportId: string;
  videoId: string;
  status: string;
  created: string;
  source: string;
  videoSnapshot: string;
  channel: string;
  viewsLikesComments: string;
  captions: string;
  noCaptions: string;
  scoreActions: string;
  totalScore: string;
  noScoreBreakdown: string;
  structureAnalysis: string;
  thumbnailReview: string;
  audienceInsights: string;
  sentiment: string;
  benchmarks: string;
  noBenchmarks: string;
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 44,
};

const DEFAULT_CJK_FONT_PATHS = [
  process.env.PDF_CJK_FONT_PATH,
  "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsunb.ttf",
];

const DEFAULT_CJK_BOLD_FONT_PATHS = [
  process.env.PDF_CJK_BOLD_FONT_PATH,
  process.env.PDF_CJK_FONT_PATH,
  "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsunb.ttf",
];

function resolvePdfCopy(lang: "en" | "zh"): PdfCopy {
  if (lang === "zh") {
    return {
      reportTitle: "ViralBrain.ai 视频分析报告",
      reportId: "报告 ID",
      videoId: "视频 ID",
      status: "状态",
      created: "创建时间",
      source: "数据来源",
      videoSnapshot: "视频快照",
      channel: "频道",
      viewsLikesComments: "播放 / 点赞 / 评论",
      captions: "字幕",
      noCaptions: "未抓取到字幕",
      scoreActions: "评分与动作建议",
      totalScore: "总分",
      noScoreBreakdown: "暂无评分拆解",
      structureAnalysis: "结构分析",
      thumbnailReview: "缩略图诊断",
      audienceInsights: "观众洞察",
      sentiment: "情绪",
      benchmarks: "对标样本",
      noBenchmarks: "暂无对标样本。",
    };
  }

  return {
    reportTitle: "ViralBrain.ai Viral Report",
    reportId: "report_id",
    videoId: "video_id",
    status: "status",
    created: "Created",
    source: "Source",
    videoSnapshot: "Video Snapshot",
    channel: "Channel",
    viewsLikesComments: "Views / Likes / Comments",
    captions: "Captions",
    noCaptions: "No captions captured",
    scoreActions: "Score and Actions",
    totalScore: "Total Score",
    noScoreBreakdown: "No score breakdown available",
    structureAnalysis: "Structure Analysis",
    thumbnailReview: "Thumbnail Review",
    audienceInsights: "Audience Insights",
    sentiment: "Sentiment",
    benchmarks: "Benchmarks",
    noBenchmarks: "No benchmarks available.",
  };
}

function ensurePage(document: PDFDocument, cursor: PdfCursor, minY = 80): PdfCursor {
  if (cursor.y >= minY) {
    return cursor;
  }

  return {
    page: document.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin,
  };
}

function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "viral-report";
}

function isPresent(value: string | undefined | null): value is string {
  return Boolean(value);
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

function splitLongToken(token: string, font: PDFFont, size: number, maxWidth: number) {
  const segments: string[] = [];
  let current = "";

  for (const char of Array.from(token)) {
    const next = current + char;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      segments.push(current);
      current = char;
      continue;
    }
    current = next;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function wrapParagraph(text: string, font: PDFFont, size: number, maxWidth: number) {
  const tokens = text.match(/\S+\s*/g) ?? [];
  if (tokens.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const normalized = current.trimEnd();
    if (normalized) {
      lines.push(normalized);
    }
    current = "";
  };

  for (const token of tokens) {
    if (font.widthOfTextAtSize(token, size) <= maxWidth) {
      const next = current + token;
      if (!current || font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
        continue;
      }

      pushCurrent();
      current = token;
      continue;
    }

    if (current) {
      pushCurrent();
    }

    for (const segment of splitLongToken(token, font, size, maxWidth)) {
      lines.push(segment.trimEnd());
    }
  }

  if (current) {
    pushCurrent();
  }

  return lines.length ? lines : [""];
}

function drawWrappedText(input: {
  document: PDFDocument;
  cursor: PdfCursor;
  text: string;
  font: PDFFont;
  size: number;
  unicodeEnabled: boolean;
  color?: ReturnType<typeof rgb>;
  lineGap?: number;
  indent?: number;
}): PdfCursor {
  const maxWidth = PAGE.width - PAGE.margin * 2 - (input.indent ?? 0);
  const paragraphs = normalizeText(input.text, input.unicodeEnabled).replace(/\r\n/g, "\n").split("\n");
  const lineHeight = input.size + (input.lineGap ?? 4);
  let cursor = input.cursor;

  for (const paragraph of paragraphs) {
    const lines = wrapParagraph(paragraph, input.font, input.size, maxWidth);
    for (const line of lines) {
      cursor = ensurePage(input.document, cursor);
      cursor.page.drawText(line, {
        x: PAGE.margin + (input.indent ?? 0),
        y: cursor.y,
        size: input.size,
        font: input.font,
        color: input.color ?? rgb(0.15, 0.17, 0.22),
      });
      cursor = { ...cursor, y: cursor.y - lineHeight };
    }

    if (paragraph !== paragraphs[paragraphs.length - 1]) {
      cursor = { ...cursor, y: cursor.y - lineHeight / 2 };
    }
  }

  return cursor;
}

function drawSectionTitle(input: {
  document: PDFDocument;
  cursor: PdfCursor;
  font: PDFFont;
  title: string;
  unicodeEnabled: boolean;
}): PdfCursor {
  const next = ensurePage(input.document, { ...input.cursor, y: input.cursor.y - 8 });
  next.page.drawText(normalizeText(input.title, input.unicodeEnabled), {
    x: PAGE.margin,
    y: next.y,
    size: 16,
    font: input.font,
    color: rgb(0.04, 0.09, 0.2),
  });
  return { ...next, y: next.y - 24 };
}

export const GET = withApiRoute<Params>(async (_request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return new Response("Invalid report id.", { status: 422 });
  }

  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  assertPlanFeature(user.plan, "canExportReports", "Upgrade to Pro to export reports.");

  const report = await getReportById(parsedParams.data.id, authUser.id, { supabaseClient });
  if (!report) {
    return new Response("Report not found.", { status: 404 });
  }

  const video = await getVideoByVideoId(report.videoId, { supabaseClient });
  const analysis = report.analysisJson;
  const benchmarks = report.benchmarksJson;
  const score = report.scoreJson;

  const pdf = await PDFDocument.create();
  const fonts = await loadEmbeddedFonts(pdf);
  const pdfLang = lang === "zh" && fonts.unicodeEnabled ? "zh" : "en";
  const copy = resolvePdfCopy(pdfLang);
  let cursor: PdfCursor = {
    page: pdf.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin,
  };

  cursor.page.drawText(normalizeText(copy.reportTitle, fonts.unicodeEnabled), {
    x: PAGE.margin,
    y: cursor.y,
    size: 24,
    font: fonts.bold,
    color: rgb(0.02, 0.08, 0.21),
  });
  cursor = { ...cursor, y: cursor.y - 34 };

  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: video?.title ?? report.videoId,
    font: fonts.bold,
    size: 18,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  cursor = { ...cursor, y: cursor.y - 6 };

  const locale = pdfLang === "zh" ? "zh-CN" : "en-US";
  const summaryLines = [
    `${copy.reportId}: ${report.id}`,
    `${copy.videoId}: ${report.videoId}`,
    `${copy.status}: ${report.status}`,
    `${copy.created}: ${new Date(report.createdAt).toLocaleString(locale)}`,
    `${copy.source}: ${video ? localizeSourceLabel(pdfLang, video.dataSource) : "--"}`,
  ];

  for (const line of summaryLines) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: line,
      font: fonts.regular,
      size: 10,
      unicodeEnabled: fonts.unicodeEnabled,
      color: rgb(0.36, 0.4, 0.48),
    });
  }

  cursor = { ...cursor, y: cursor.y - 12 };
  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.videoSnapshot,
    unicodeEnabled: fonts.unicodeEnabled,
  });

  const snapshotLines = [
    `${copy.channel}: ${video?.channelName ?? "--"}`,
    `${copy.viewsLikesComments}: ${video?.stats.viewCount.toLocaleString(locale) ?? "--"} / ${video?.stats.likeCount.toLocaleString(locale) ?? "--"} / ${video?.stats.commentCount.toLocaleString(locale) ?? "--"}`,
    `${copy.captions}: ${video?.captionsText ? video.captionsText.slice(0, 700) : copy.noCaptions}`,
  ];

  for (const line of snapshotLines) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: line,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
    cursor = { ...cursor, y: cursor.y - 4 };
  }

  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.scoreActions,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: `${copy.totalScore}: ${score?.total ?? "--"}`,
    font: fonts.bold,
    size: 12,
    unicodeEnabled: fonts.unicodeEnabled,
  });

  const breakdown = score?.breakdown
    ? [
        `title ${score.breakdown.title}`,
        `thumbnail ${score.breakdown.thumbnail}`,
        `hook ${score.breakdown.hook}`,
        `pacing ${score.breakdown.pacing}`,
        `value ${score.breakdown.valueDensity}`,
        `emotion ${score.breakdown.emotionResonance}`,
      ].join(" / ")
    : copy.noScoreBreakdown;
  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: breakdown,
    font: fonts.regular,
    size: 11,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  cursor = { ...cursor, y: cursor.y - 6 };

  for (const action of score?.topActions ?? []) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: `- ${action}`,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
  }

  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.structureAnalysis,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  for (const block of [
    analysis?.structure.hookAnalysis,
    ...(analysis?.structure.pacingNotes ?? []),
    analysis?.structure.ctaReview,
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: `- ${block}`,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
  }

  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.thumbnailReview,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  for (const block of [
    `Score: ${analysis?.thumbnailReview.score ?? "--"}/100`,
    analysis?.thumbnailReview.diagnosis,
    ...(analysis?.thumbnailReview.improvements ?? []).map((item) => `- ${item}`),
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: block,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
  }

  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.audienceInsights,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  for (const block of [
    `${copy.sentiment}: ${analysis?.commentsInsights.sentiment ?? "--"}`,
    analysis?.commentsInsights.audiencePersona,
    ...(analysis?.commentsInsights.motivations ?? []).map((item) => `- ${item}`),
    ...(analysis?.commentsInsights.concerns ?? []).map((item) => `- ${item}`),
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: block,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
  }

  cursor = drawSectionTitle({
    document: pdf,
    cursor,
    font: fonts.bold,
    title: copy.benchmarks,
    unicodeEnabled: fonts.unicodeEnabled,
  });
  if (benchmarks?.topMatches?.length) {
    for (const item of benchmarks.topMatches) {
      cursor = drawWrappedText({
        document: pdf,
        cursor,
        text: `${item.title} (${item.similarity})`,
        font: fonts.bold,
        size: 12,
        unicodeEnabled: fonts.unicodeEnabled,
      });
      for (const line of [
        ...item.sharedPoints,
        ...item.differences,
        ...item.copy,
        ...item.avoid,
      ]) {
        cursor = drawWrappedText({
          document: pdf,
          cursor,
          text: `- ${line}`,
          font: fonts.regular,
          size: 10,
          unicodeEnabled: fonts.unicodeEnabled,
        });
      }
      cursor = { ...cursor, y: cursor.y - 8 };
    }
  } else {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: copy.noBenchmarks,
      font: fonts.regular,
      size: 11,
      unicodeEnabled: fonts.unicodeEnabled,
    });
  }

  const bytes = await pdf.save();
  const filename = `${sanitizeFilename(video?.title ?? report.videoId)}.pdf`;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Pdf-Unicode": fonts.unicodeEnabled ? "enabled" : "fallback",
    },
  });
});
