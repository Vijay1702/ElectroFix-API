#!/bin/bash
set -e

echo "========================================="
echo "ElectroFix API - Build Process Started"
echo "========================================="

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Building TypeScript..."
npm run build

echo "⚙️  Generating Prisma client..."
npx prisma generate

echo "✅ Build completed successfully!"
echo "========================================="
echo "Note: Database migrations will be run"
echo "       separately after deployment"
echo "========================================="
