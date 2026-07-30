import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Loaded here (not via the app's own env.config.ts) so this script controls
// exactly which DATABASE_URL prisma migrate/seed run against — independent of
// whatever the spawned API server processes are doing.
export default function globalSetup() {
  const envFile = process.env.E2E_ENV_FILE || ".env.test";
  const parsed = dotenv.config({ path: path.resolve(__dirname, "..", envFile) }).parsed;

  if (!parsed?.DATABASE_URL) {
    throw new Error(`e2e global-setup: DATABASE_URL missing from ${envFile}`);
  }

  const childEnv = { ...process.env, ...parsed };

  console.log(`[e2e setup] Syncing schema + seeding ${parsed.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`);

  // The committed migration history is out of sync with schema.prisma (it predates
  // fields like User.operationalStatus), so `migrate deploy` can't bring a fresh
  // database up to date. `db push` syncs the disposable test DB straight from the
  // schema instead — appropriate here since this DB only ever exists for tests.
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: path.resolve(__dirname, ".."),
    env: childEnv,
    stdio: "inherit",
  });

  execSync("npx ts-node prisma/seed.e2e.ts", {
    cwd: path.resolve(__dirname, ".."),
    env: childEnv,
    stdio: "inherit",
  });
}
