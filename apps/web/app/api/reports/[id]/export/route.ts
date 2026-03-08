import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { z } from "zod";
import { withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { assertPlanFeature } from "@/lib/plan-access";
import { localizeSourceLabel } from "@/lib/report-localize";
import { getReportById } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
});

type PdfCursor = {
  page: PDFPage;
  y: number;
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 44
};

function ensurePage(document: PDFDocument, cursor: PdfCursor, minY = 80): PdfCursor {
  if (cursor.y >= minY) {
    return cursor;
  }

  return {
    page: document.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin
  };
}

function drawWrappedText(input: {
  document: PDFDocument;
  cursor: PdfCursor;
  text: string;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  lineGap?: number;
  indent?: number;
}): PdfCursor {
  const maxWidth = PAGE.width - PAGE.margin * 2 - (input.indent ?? 0);
  const words = input.text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (input.font.widthOfTextAtSize(next, input.size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
    }
  }

  if (current) {
    lines.push(current);
  }

  let cursor = input.cursor;
  const lineHeight = input.size + (input.lineGap ?? 4);

  for (const line of lines) {
    cursor = ensurePage(input.document, cursor);
    cursor.page.drawText(line, {
      x: PAGE.margin + (input.indent ?? 0),
      y: cursor.y,
      size: input.size,
      font: input.font,
      color: input.color ?? rgb(0.15, 0.17, 0.22)
    });
    cursor = { ...cursor, y: cursor.y - lineHeight };
  }

  return cursor;
}

function drawSectionTitle(
  document: PDFDocument,
  cursor: PdfCursor,
  font: PDFFont,
  title: string
): PdfCursor {
  const next = ensurePage(document, { ...cursor, y: cursor.y - 8 });
  next.page.drawText(title, {
    x: PAGE.margin,
    y: next.y,
    size: 16,
    font,
    color: rgb(0.04, 0.09, 0.2)
  });
  return { ...next, y: next.y - 24 };
}

function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "viral-report";
}

function isPresent(value: string | undefined | null): value is string {
  return Boolean(value);
}

export const GET = withApiRoute<Params>(async (request, { requestId }, context) => {
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
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let cursor: PdfCursor = {
    page: pdf.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - PAGE.margin
  };

  cursor.page.drawText("ViralBrain.ai Viral Report", {
    x: PAGE.margin,
    y: cursor.y,
    size: 24,
    font: bold,
    color: rgb(0.02, 0.08, 0.21)
  });
  cursor = { ...cursor, y: cursor.y - 34 };

  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: video?.title ?? report.videoId,
    font: bold,
    size: 18
  });
  cursor = { ...cursor, y: cursor.y - 6 };

  const summaryLines = [
    `report_id: ${report.id}`,
    `video_id: ${report.videoId}`,
    `status: ${report.status}`,
    `Created: ${new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}`,
    `Source: ${video ? localizeSourceLabel("en", video.dataSource) : "--"}`
  ];

  for (const line of summaryLines) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: line,
      font: regular,
      size: 10,
      color: rgb(0.36, 0.4, 0.48)
    });
  }

  cursor = { ...cursor, y: cursor.y - 12 };
  cursor = drawSectionTitle(pdf, cursor, bold, "Video Snapshot");

  const snapshotLines = [
    `Channel: ${video?.channelName ?? "--"}`,
    `Views / Likes / Comments: ${video?.stats.viewCount.toLocaleString() ?? "--"} / ${video?.stats.likeCount.toLocaleString() ?? "--"} / ${video?.stats.commentCount.toLocaleString() ?? "--"}`,
    `Captions: ${video?.captionsText ? video.captionsText.slice(0, 500) : "No captions captured"}`
  ];

  for (const line of snapshotLines) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: line,
      font: regular,
      size: 11
    });
    cursor = { ...cursor, y: cursor.y - 4 };
  }

  cursor = drawSectionTitle(pdf, cursor, bold, "Score and Actions");
  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: `Total Score: ${score?.total ?? "--"}`,
    font: bold,
    size: 12
  });

  const breakdown = score?.breakdown
    ? [
        `title ${score.breakdown.title}`,
        `thumbnail ${score.breakdown.thumbnail}`,
        `hook ${score.breakdown.hook}`,
        `pacing ${score.breakdown.pacing}`,
        `value ${score.breakdown.valueDensity}`,
        `emotion ${score.breakdown.emotionResonance}`
      ].join(" · ")
    : "No score breakdown available";
  cursor = drawWrappedText({
    document: pdf,
    cursor,
    text: breakdown,
    font: regular,
    size: 11
  });
  cursor = { ...cursor, y: cursor.y - 6 };

  for (const action of score?.topActions ?? []) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: `• ${action}`,
      font: regular,
      size: 11
    });
  }

  cursor = drawSectionTitle(pdf, cursor, bold, "Structure Analysis");
  for (const block of [
    analysis?.structure.hookAnalysis,
    ...(analysis?.structure.pacingNotes ?? []),
    analysis?.structure.ctaReview
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: `• ${block}`,
      font: regular,
      size: 11
    });
  }

  cursor = drawSectionTitle(pdf, cursor, bold, "Thumbnail Review");
  for (const block of [
    `Score: ${analysis?.thumbnailReview.score ?? "--"}/100`,
    analysis?.thumbnailReview.diagnosis,
    ...(analysis?.thumbnailReview.improvements ?? []).map((item) => `• ${item}`)
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: block,
      font: regular,
      size: 11
    });
  }

  cursor = drawSectionTitle(pdf, cursor, bold, "Audience Insights");
  for (const block of [
    `Sentiment: ${analysis?.commentsInsights.sentiment ?? "--"}`,
    analysis?.commentsInsights.audiencePersona,
    ...(analysis?.commentsInsights.motivations ?? []).map((item) => `• ${item}`),
    ...(analysis?.commentsInsights.concerns ?? []).map((item) => `• ${item}`)
  ].filter(isPresent)) {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: block,
      font: regular,
      size: 11
    });
  }

  cursor = drawSectionTitle(pdf, cursor, bold, "Benchmarks");
  if (benchmarks?.topMatches?.length) {
    for (const item of benchmarks.topMatches) {
      cursor = drawWrappedText({
        document: pdf,
        cursor,
        text: `${item.title} (${item.similarity})`,
        font: bold,
        size: 12
      });
      for (const line of [
        ...item.sharedPoints,
        ...item.differences,
        ...item.copy,
        ...item.avoid
      ]) {
        cursor = drawWrappedText({
          document: pdf,
          cursor,
          text: `• ${line}`,
          font: regular,
          size: 10
        });
      }
      cursor = { ...cursor, y: cursor.y - 8 };
    }
  } else {
    cursor = drawWrappedText({
      document: pdf,
      cursor,
      text: "No benchmarks available.",
      font: regular,
      size: 11
    });
  }

  const bytes = await pdf.save();
  const filename = `${sanitizeFilename(video?.title ?? report.videoId)}.pdf`;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
});
