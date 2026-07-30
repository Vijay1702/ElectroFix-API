import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

const parsed = dotenv.config({ path: path.resolve(__dirname, ".env.test") }).parsed || {};

const PORT = parsed.PORT || "5001";
// Trailing slash matters: APIRequestContext resolves relative paths via the
// same rules as `new URL(path, base)` — a base without a trailing slash drops
// its own path segment when joined with a path that starts with "/". All spec
// files call request.get/post/etc with NO leading slash for this reason.
const BASE_URL = `http://localhost:${PORT}${parsed.API_PREFIX || "/api/v1"}/`;
const ROOT_URL = `http://localhost:${PORT}/`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // specs share one DB; individual tests inside a file may still run in parallel
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },
  webServer: {
    command: "npm run dev",
    cwd: __dirname,
    url: ROOT_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { ...(process.env as Record<string, string>), ...parsed },
    stdout: "pipe",
    stderr: "pipe",
  },
});
