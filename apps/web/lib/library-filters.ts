import type { ViralLibraryItem } from "@/lib/types";

export const ALL_LIBRARY_FOLDERS = "__all__";
export const UNCATEGORIZED_LIBRARY_FOLDER = "__uncategorized__";

export function normalizeLibraryFolder(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 60);
}

export function listLibraryFolders(items: ViralLibraryItem[]): string[] {
  return Array.from(
    new Set(items.map((item) => normalizeLibraryFolder(item.folder)).filter((value): value is string => Boolean(value)))
  ).sort((left, right) => left.localeCompare(right, "en"));
}

export function matchesLibraryFolderFilter(item: ViralLibraryItem, folderFilter: string): boolean {
  if (!folderFilter || folderFilter === ALL_LIBRARY_FOLDERS) {
    return true;
  }

  const folder = normalizeLibraryFolder(item.folder);
  if (folderFilter === UNCATEGORIZED_LIBRARY_FOLDER) {
    return !folder;
  }

  return folder === folderFilter;
}

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreField(field: string, token: string, startWeight: number, containsWeight: number) {
  if (!field) {
    return 0;
  }

  if (field.startsWith(token)) {
    return startWeight;
  }

  if (field.includes(token)) {
    return containsWeight;
  }

  return 0;
}

function scoreLibraryItem(item: ViralLibraryItem, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = tokenizeQuery(query);

  if (!normalizedQuery || tokens.length === 0) {
    return 0;
  }

  const title = item.title.toLowerCase();
  const channel = (item.channelName ?? "").toLowerCase();
  const folder = (item.folder ?? "").toLowerCase();
  const topic = item.tags.topic.toLowerCase();
  const hookType = item.tags.hookType.toLowerCase();
  const durationBucket = item.tags.durationBucket.toLowerCase();
  const summary = item.summary.toLowerCase();
  const sourceUrl = item.sourceUrl.toLowerCase();
  const stats = [
    item.stats?.viewCount?.toString() ?? "",
    item.stats?.likeCount?.toString() ?? "",
    item.stats?.commentCount?.toString() ?? ""
  ].join(" ");

  let score = 0;

  for (const token of tokens) {
    const tokenScore = Math.max(
      scoreField(title, token, 150, 120),
      scoreField(channel, token, 110, 85),
      scoreField(folder, token, 100, 80),
      scoreField(topic, token, 90, 70),
      scoreField(hookType, token, 80, 65),
      scoreField(durationBucket, token, 70, 55),
      scoreField(stats, token, 75, 60),
      scoreField(summary, token, 40, 30),
      scoreField(sourceUrl, token, 35, 25)
    );

    if (tokenScore === 0) {
      return -1;
    }

    score += tokenScore;
  }

  if (title === normalizedQuery) {
    score += 240;
  } else if (title.startsWith(normalizedQuery)) {
    score += 180;
  } else if (title.includes(normalizedQuery)) {
    score += 120;
  }

  return score;
}

export function filterLibraryItems(
  items: ViralLibraryItem[],
  input: {
    query?: string;
    folderFilter?: string;
  }
): ViralLibraryItem[] {
  const normalizedQuery = input.query?.trim() ?? "";
  const folderFilter = input.folderFilter ?? ALL_LIBRARY_FOLDERS;

  const filtered = items.filter((item) => {
    if (!matchesLibraryFolderFilter(item, folderFilter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return scoreLibraryItem(item, normalizedQuery) >= 0;
  });

  if (!normalizedQuery) {
    return filtered;
  }

  return filtered.sort((left, right) => {
    const scoreDelta = scoreLibraryItem(right, normalizedQuery) - scoreLibraryItem(left, normalizedQuery);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return +new Date(right.createdAt) - +new Date(left.createdAt);
  });
}
