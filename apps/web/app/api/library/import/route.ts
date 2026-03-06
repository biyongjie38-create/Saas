import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { importLibraryItems, type LibraryImportInput } from "@/lib/report-store";

export const runtime = "nodejs";

const schema = z.object({
  format: z.enum(["json", "csv"]),
  content: z.string().min(2).max(200_000)
});

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeItem(input: Record<string, unknown>): LibraryImportInput {
  const tags = typeof input.tags === "object" && input.tags ? (input.tags as Record<string, unknown>) : {};

  return {
    title: String(input.title ?? "").trim(),
    sourceUrl: String(input.sourceUrl ?? input.source_url ?? input.url ?? "").trim(),
    summary: String(input.summary ?? input.description ?? "").trim(),
    tags: {
      hookType: String(tags.hookType ?? tags.hook_type ?? input.hookType ?? input.hook_type ?? "unknown").trim(),
      topic: String(tags.topic ?? input.topic ?? "general").trim(),
      durationBucket: String(
        tags.durationBucket ?? tags.duration_bucket ?? input.durationBucket ?? input.duration_bucket ?? "5-10m"
      ).trim()
    }
  };
}

function parseJsonContent(content: string): LibraryImportInput[] {
  const raw = JSON.parse(content) as unknown;
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : null;

  if (!list) {
    throw new Error("INVALID_JSON_ITEMS");
  }

  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeItem);
}

function parseCsvContent(content: string): LibraryImportInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV_NEEDS_HEADER_AND_ROWS");
  }

  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cells = parseCsvLine(line);
    const record = Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]));
    return normalizeItem(record);
  });
}

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Missing import format or content."
      },
      requestId,
      422
    );
  }

  let items: LibraryImportInput[];
  try {
    items = body.data.format === "json"
      ? parseJsonContent(body.data.content)
      : parseCsvContent(body.data.content);
  } catch (error) {
    return errorJsonResponse(
      {
        code: "LIBRARY_IMPORT_PARSE_FAILED",
        message: error instanceof Error ? error.message : "Failed to parse import content."
      },
      requestId,
      422
    );
  }

  if (items.length === 0) {
    return errorJsonResponse(
      {
        code: "LIBRARY_IMPORT_EMPTY",
        message: "No valid library items found in the payload."
      },
      requestId,
      422
    );
  }

  if (items.length > 200) {
    return errorJsonResponse(
      {
        code: "LIBRARY_IMPORT_TOO_LARGE",
        message: "Import up to 200 items at a time."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const merged = await importLibraryItems(items, { supabaseClient });

  return okJsonResponse(
    {
      imported_count: items.length,
      items: merged
    },
    requestId
  );
});
