import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Same SKIP_DOTENV guard as env.config.ts — without it, this second unconditional
// dotenv.config() call was silently reloading the committed .env (real Neon
// DATABASE_URL) after the e2e harness had already set process.env.DATABASE_URL
// to the local test database, so the app's HTTP layer looked test-configured
// (NODE_ENV=test) while the actual Prisma client connected to production data.
if (process.env.SKIP_DOTENV !== "true") {
  dotenv.config({ override: true });
}

const prisma = new PrismaClient();

export default prisma;
