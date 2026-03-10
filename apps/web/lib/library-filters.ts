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

export function filterLibraryItems(
  items: ViralLibraryItem[],
  input: {
    query?: string;
    folderFilter?: string;
  }
): ViralLibraryItem[] {
  const normalizedQuery = input.query?.trim().toLowerCase() ?? "";
  const folderFilter = input.folderFilter ?? ALL_LIBRARY_FOLDERS;

  return items.filter((item) => {
    if (!matchesLibraryFolderFilter(item, folderFilter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      item.title,
      item.summary,
      item.sourceUrl,
      item.channelName ?? "",
      item.folder ?? "",
      item.tags.hookType,
      item.tags.topic,
      item.tags.durationBucket,
      item.stats?.viewCount?.toString() ?? "",
      item.stats?.likeCount?.toString() ?? "",
      item.stats?.commentCount?.toString() ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
