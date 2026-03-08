import { promises as fs } from "node:fs";
import path from "node:path";
import { fallbackLibrary } from "@/lib/mock-data";
import type { MockDb } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "data", "mock-db.json");

const initialDb: MockDb = {
  users: [
    {
      id: "local-user",
      email: "local@viralbrain.ai",
      plan: "free",
      subscriptionStatus: "none",
      billingCycle: null,
      planStartedAt: null,
      planExpiresAt: null,
    },
  ],
  videos: [],
  reports: [],
  reportShareAccessLogs: [],
  usageLogs: [],
  library: fallbackLibrary,
  membershipOrders: [],
};

function cloneInitialDb(): MockDb {
  return structuredClone(initialDb);
}

export async function readDb(): Promise<MockDb> {
  try {
    const content = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<MockDb>;
    return {
      ...cloneInitialDb(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : cloneInitialDb().users,
      videos: Array.isArray(parsed.videos) ? parsed.videos : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      reportShareAccessLogs: Array.isArray(parsed.reportShareAccessLogs) ? parsed.reportShareAccessLogs : [],
      usageLogs: Array.isArray(parsed.usageLogs) ? parsed.usageLogs : [],
      library: Array.isArray(parsed.library) ? parsed.library : cloneInitialDb().library,
      membershipOrders: Array.isArray(parsed.membershipOrders) ? parsed.membershipOrders : [],
    };
  } catch {
    const db = cloneInitialDb();
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: MockDb): Promise<void> {
  const content = JSON.stringify(db, null, 2);
  await fs.writeFile(DB_PATH, content, "utf8");
}

export async function resetDb(): Promise<MockDb> {
  const db = cloneInitialDb();
  await writeDb(db);
  return db;
}

