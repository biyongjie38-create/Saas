import path from "node:path";
import { spawn } from "node:child_process";

const webDir = process.cwd();
const repoRoot = path.resolve(webDir, "..");
const aiDir = path.join(repoRoot, "ai-service");
const nextBin = path.join(webDir, "node_modules", "next", "dist", "bin", "next");

const children = [];
let closing = false;

function terminateChildren(signal = "SIGTERM") {
  if (closing) {
    return;
  }

  closing = true;
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill(signal);
      } catch {
        // ignore shutdown races
      }
    }
  }
}

function spawnManaged(command, args, options) {
  const child = spawn(command, args, {
    stdio: "inherit",
    ...options,
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (!closing) {
      terminateChildren(signal ?? "SIGTERM");
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exit(code ?? 0);
    }
  });

  return child;
}

spawnManaged("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
  cwd: aiDir,
  env: {
    ...process.env,
  },
});

spawnManaged(process.execPath, [nextBin, "dev", "-H", "localhost", "-p", "3200"], {
  cwd: webDir,
  env: {
    ...process.env,
    PORT: "3200",
    HOSTNAME: "localhost",
    APP_RUNTIME_MODE: "production",
    NEXT_PUBLIC_APP_RUNTIME_MODE: "production",
    DATA_BACKEND: "mock",
    ENABLE_E2E_AUTH_BYPASS: "true",
    YOUTUBE_FETCH_MODE: "live",
    AI_SERVICE_MODE: "remote",
  },
});

process.on("SIGINT", () => terminateChildren("SIGINT"));
process.on("SIGTERM", () => terminateChildren("SIGTERM"));
