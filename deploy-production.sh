#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║  EVT Production Deployment Script                           ║
# ║  Automatisiert Build + PWA-Dateien kopieren                  ║
# ╚══════════════════════════════════════════════════════════════╝

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "🔥 EVT Production Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Build
echo "📦 Step 1/4: Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build completed"
echo ""

# Step 2: Copy Service Worker
echo "🔧 Step 2/4: Copying Service Worker..."
cp -f public/sw.js dist/public/sw.js

if [ ! -f dist/public/sw.js ]; then
  echo "❌ Service Worker copy failed!"
  exit 1
fi

echo "✅ Service Worker copied"
echo ""

# Step 3: Copy Manifest
echo "🔧 Step 3/4: Copying PWA Manifest..."
cp -f public/manifest.json dist/public/manifest.json

if [ ! -f dist/public/manifest.json ]; then
  echo "❌ Manifest copy failed!"
  exit 1
fi

echo "✅ Manifest copied"
echo ""

# Step 4: Copy Icons
echo "🔧 Step 4/4: Copying PWA Icons..."

# iOS Icons
cp -f public/apple-touch-icon-180x180.png dist/public/apple-touch-icon-180x180.png
cp -f public/apple-touch-icon-167x167.png dist/public/apple-touch-icon-167x167.png
cp -f public/apple-touch-icon-152x152.png dist/public/apple-touch-icon-152x152.png
cp -f public/apple-touch-icon.png dist/public/apple-touch-icon.png

# Android Icons
cp -f public/icon-192.png dist/public/icon-192.png
cp -f public/icon-512.png dist/public/icon-512.png

echo "✅ All icons copied"
echo ""

# Verification
echo "═══════════════════════════════════════════════════════════"
echo "🔍 Verifying PWA Files..."
echo "═══════════════════════════════════════════════════════════"

PWA_FILES=(
  "dist/public/sw.js"
  "dist/public/manifest.json"
  "dist/public/apple-touch-icon-180x180.png"
  "dist/public/apple-touch-icon-167x167.png"
  "dist/public/apple-touch-icon-152x152.png"
  "dist/public/apple-touch-icon.png"
  "dist/public/icon-192.png"
  "dist/public/icon-512.png"
)

MISSING=0
for file in "${PWA_FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(du -h "$file" | cut -f1)
    echo "  ✅ $file ($SIZE)"
  else
    echo "  ❌ $file MISSING!"
    MISSING=$((MISSING + 1))
  fi
done

echo ""

if [ $MISSING -gt 0 ]; then
  echo "❌ Deployment incomplete: $MISSING file(s) missing!"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "✅ Deployment successful!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. pm2 restart evt"
echo "  2. pm2 logs evt --lines 50"
echo ""
echo "For iOS users:"
echo "  1. Delete existing PWA from home screen"
echo "  2. Safari → Clear website data"
echo "  3. Restart device"
echo "  4. Reinstall PWA"
echo ""
