#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🛑 إيقاف مداد المحاسبي                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "🛑 إيقاف السيرفر..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
echo "✅ تم"

echo "🛑 إيقاف الواجهة..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
echo "✅ تم"

echo "🛑 إيقاف Cloudflare Tunnel..."
pkill -f "cloudflared tunnel" 2>/dev/null
echo "✅ تم"

echo "🛑 إيقاف nodemon..."
pkill -f nodemon 2>/dev/null
echo "✅ تم"

sleep 1

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ تم إيقاف مداد المحاسبي                   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""