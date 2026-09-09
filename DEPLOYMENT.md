# ElectroFix API - Deployment Guide

## 🚀 Permanent Fix for Database Timeout Issues

This guide explains the permanent solution for handling Prisma migrations during Render deployments.

## Problem Solved

**Issue**: Database connection timeouts during `prisma migrate deploy` in the build phase.

**Root Cause**: 
- Build timeout limit (15 minutes on Render)
- Advisory lock contention
- Connection pooling issues

**Solution**: Separate build and migration into distinct phases with proper connection handling.

---

## Configuration Overview

### 1. **Database URL** (.env)
```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&connect_timeout=30&statement_cache_size=0"
```

**Key Parameters**:
- `connect_timeout=30` - Increases connection timeout from 10s to 30s
- `statement_cache_size=0` - Disables caching to avoid lock contention
- Neon pooler endpoint - Uses connection pooling

### 2. **Build Process** (render-build.sh)
- Installs dependencies
- Compiles TypeScript
- Generates Prisma client
- **Skips migrations** (done in start phase)

### 3. **Start Process** (startCommand)
```bash
npm run migrate:deploy && npm start
```
- Runs migrations safely after build completes
- Starts the application if migrations succeed

### 4. **Health Check**
```
healthCheckPath: /api/v1/health
```
- Verifies API is ready before routing traffic
- Built-in endpoint checks database connectivity

---

## Local Migration Commands

### Run Migrations
```bash
npm run migrate:deploy
```

### Create New Migration
```bash
npm run migrate:create
```

### Reset Database (Development Only)
```bash
npm run migrate:reset
```

### Manual Migration Runner
```bash
npm run migrate
```
- Uses safe migration script with proper error handling
- Includes detailed error messages

---

## Render Deployment Steps

### 1. Update Environment Variables

In Render Dashboard → ElectroFix-API Service → Environment:

```
DATABASE_URL = postgresql://user:pass@host/db?sslmode=require&connect_timeout=30&statement_cache_size=0
NODE_ENV = production
API_PREFIX = /api/v1
PORT = 5000
```

### 2. Verify render.yaml

File: `ElectroFix-API/render.yaml`

```yaml
buildCommand: chmod +x ./render-build.sh && ./render-build.sh
startCommand: npm run migrate:deploy && npm start
healthCheckPath: /api/v1/health
```

### 3. Deploy

```bash
git push origin main
```

### 4. Monitor Build Logs

Render Dashboard → Build logs tab:
- Should see: "Build completed successfully!"
- Should NOT see: "npx prisma migrate deploy" in build phase

---

## Troubleshooting

### If Migration Still Fails

1. **Check Database Connection**
   ```bash
   psql postgresql://user:pass@host/db
   ```

2. **View Render Logs**
   - Go to Render Dashboard → Live logs
   - Look for migration error messages

3. **Manual Migration**
   ```bash
   DATABASE_URL="your_url" npm run migrate:deploy
   ```

4. **Reset & Retry** (if safe)
   ```bash
   DATABASE_URL="your_url" npm run migrate:reset
   ```

### Common Errors

| Error | Solution |
|-------|----------|
| "Timed out trying to acquire lock" | Increase `connect_timeout` in DATABASE_URL |
| "Connection refused" | Check DATABASE_URL is correct |
| "Advisory lock timeout" | Check if other processes are holding locks |
| "Migration failed" | Run migrations manually, debug, then redeploy |

---

## Health Check Verification

After deployment, verify the API is healthy:

```bash
curl https://your-api.onrender.com/api/v1/health
```

**Success Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-09T10:30:00.000Z",
  "message": "Application is healthy",
  "database": {
    "status": "connected",
    "type": "PostgreSQL"
  },
  "environment": "production",
  "uptime": {
    "formatted": "0h 5m 23s"
  }
}
```

---

## Why This Works

✅ **Build Phase**: 
- Fast: No database operations
- Reliable: Only TypeScript compilation
- Timeout: Won't exceed limits

✅ **Start Phase**:
- Runs after build succeeds
- Fresh connection attempt
- Has full service startup time

✅ **Health Check**:
- Ensures database is connected before routing
- Prevents requests to unhealthy instances

✅ **Connection Pooling**:
- Neon pooler handles connection limits
- `connect_timeout=30` prevents premature timeouts
- `statement_cache_size=0` reduces lock contention

---

## Important Notes

⚠️ **Never** change `buildCommand` to include `npx prisma migrate deploy`

✅ **Always** run migrations in `startCommand`

✅ **Keep** `health check` enabled for production

✅ **Monitor** first deployment logs for migration status

---

## Version Info

- Node.js: 24.14.1 (or as configured in Render)
- Prisma: 5.21.1
- TypeScript: 6.0.3
- Database: PostgreSQL (Neon)

---

**Last Updated**: 2026-09-09
