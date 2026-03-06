import path from "node:path";
import { spawn } from "node:child_process";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "localhost", "-p", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: "3100",
      HOSTNAME: "localhost",
      DATA_BACKEND: "mock",
      ENABLE_E2E_AUTH_BYPASS: "true",
      YOUTUBE_FETCH_MODE: "mock",
      AI_SERVICE_MODE: "local"
    }
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
