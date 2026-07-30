import dotenv from "dotenv";

// SKIP_DOTENV lets a caller (e.g. the e2e test harness) fully control process.env
// via child_process spawn options without the committed .env file clobbering it.
if (process.env.SKIP_DOTENV !== "true") {
  dotenv.config({ override: true });
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "default_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  NODE_ENV: process.env.NODE_ENV || "development",
};
