#!/usr/bin/env node

/**
 * Database Migration Runner
 * This script runs Prisma migrations with proper error handling
 * Usage: node scripts/migrate.js
 */

const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function runMigrations() {
  try {
    console.log(`${colors.blue}=========================================${colors.reset}`);
    console.log(`${colors.blue}Database Migration Runner${colors.reset}`);
    console.log(`${colors.blue}=========================================${colors.reset}\n`);

    console.log(`${colors.yellow}⏳ Running Prisma migrations...${colors.reset}`);

    const { stdout, stderr } = await execPromise('npx prisma migrate deploy', {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 120000 // 2 minutes timeout
    });

    if (stdout) {
      console.log(stdout);
    }

    console.log(`${colors.green}✅ Migrations completed successfully!${colors.reset}`);
    console.log(`${colors.blue}=========================================${colors.reset}\n`);

    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Migration failed:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);

    if (error.stderr) {
      console.error(`${colors.red}Error details:${colors.reset}`);
      console.error(error.stderr);
    }

    console.log(`${colors.yellow}⚠️  Troubleshooting tips:${colors.reset}`);
    console.log(`  1. Check if DATABASE_URL is correct in .env`);
    console.log(`  2. Verify database server is running`);
    console.log(`  3. Check network connectivity to database`);
    console.log(`  4. Try running: npm run migrate:force\n`);

    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Migration interrupted by user${colors.reset}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}Migration terminated${colors.reset}`);
  process.exit(1);
});

// Run migrations
runMigrations();
