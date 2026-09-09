# Render Deployment - Quick Setup Guide

## Your Database Connection URL

### ❌ OLD (causing timeout):
```
postgresql://neondb_owner:npg_h60QMTJHpEri@ep-blue-wildflower-ap9yjszf-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### ✅ NEW (permanent fix):
```
postgresql://neondb_owner:npg_h60QMTJHpEri@ep-blue-wildflower-ap9yjszf-pooler.neon.tech/neondb?sslmode=require&connect_timeout=30&statement_cache_size=0&application_name=electrofix-api
```

## Key Changes Made

| Change | Reason |
|--------|--------|
| Removed region (c-7.us-east-1) | Use Neon's connection pooler directly |
| Removed `channel_binding=require` | Causes issues with pooling |
| Added `connect_timeout=30` | Prevents premature connection timeouts |
| Added `statement_cache_size=0` | Reduces lock contention during migrations |
| Added `application_name=electrofix-api` | Easier debugging in database logs |

---

## Render Dashboard Setup

### Step 1: Update Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your **ElectroFix-API** service
3. Go to **Environment** tab
4. Find the `DATABASE_URL` variable
5. Replace with:
```
postgresql://neondb_owner:npg_h60QMTJHpEri@ep-blue-wildflower-ap9yjszf-pooler.neon.tech/neondb?sslmode=require&connect_timeout=30&statement_cache_size=0&application_name=electrofix-api
```

### Step 2: Verify Build Configuration

1. Go to **Settings** tab
2. Check **Build Command**:
   ```bash
   chmod +x ./render-build.sh && ./render-build.sh
   ```
3. Check **Start Command**:
   ```bash
   npm run migrate:deploy && npm start
   ```
4. Check **Health Check Path**:
   ```
   /api/v1/health
   ```

### Step 3: Deploy

Push your code to trigger deployment:
```bash
git add .
git commit -m "Add permanent database connection fix"
git push origin main
```

---

## Verify Deployment Success

After deployment completes:

```bash
# Check API is healthy
curl https://your-render-url.onrender.com/api/v1/health

# Expected response (200 OK):
{
  "status": "ok",
  "message": "Application is healthy",
  "database": {
    "status": "connected",
    "type": "PostgreSQL"
  }
}
```

---

## Local Testing (Optional)

Test migrations locally before deploying:

```bash
# Make sure your .env has the new URL
npm run migrate:deploy

# If successful, you should see:
# ✅ Migrations completed successfully!
```

---

## Troubleshooting

### If deployment still fails:

1. **Check Render Logs**:
   - Go to Render Dashboard → ElectroFix-API → Logs
   - Look for the error message

2. **Common Issues**:
   ```
   Error: Timed out
   → Increase connect_timeout to 60
   
   Error: Connection refused
   → Verify DATABASE_URL is correct
   
   Error: Advisory lock
   → Database is locked, wait and retry
   ```

3. **Manual Fix**:
   - Go to Render Dashboard
   - Click "Clear build cache" 
   - Click "Deploy"

---

## Files Changed

✅ `.env` - Updated DATABASE_URL with pooling configuration
✅ `render.yaml` - Build and start commands configured
✅ `render-build.sh` - Safe build script (no migrations)
✅ `scripts/migrate.js` - Safe migration runner
✅ `package.json` - Added migration scripts

---

## Support

If issues persist:
1. Check [Neon Documentation](https://neon.tech/docs)
2. Check [Render Documentation](https://render.com/docs)
3. Review deployment logs for specific errors

**Deploy with confidence! 🚀**
