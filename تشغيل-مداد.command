#!/bin/bash

# ============================================
# تشغيل مداد المحاسبي
# ============================================

PROJECT_DIR="/Users/ahmedslem/Desktop/midad-accounting"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🖋️  مداد المحاسبي - تشغيل                    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1) تنظيف العمليات القديمة
echo "🧹 تنظيف العمليات القديمة..."

lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null

sleep 2

echo "✅ تم التنظيف"
echo ""

# 2) تشغيل السيرفر في نافذة جديدة
echo "🔧 تشغيل السيرفر (Backend)..."

osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_DIR/server' && clear && echo '🖋️ مداد - السيرفر' && npm run dev"
    activate
end tell
EOF

sleep 5

# 3) تشغيل الواجهة في نافذة جديدة
echo "🎨 تشغيل الواجهة (Frontend)..."

osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_DIR/client' && clear && echo '🎨 مداد - الواجهة' && npm run dev"
end tell
EOF

sleep 8

# 4) تشغيل Cloudflare Tunnel
echo "🌐 تشغيل Cloudflare Tunnel..."

osascript <<EOF
tell application "Terminal"
    do script "clear && echo '🌐 Cloudflare Tunnel' && cloudflared tunnel --url http://localhost:5173"
end tell
EOF

sleep 5

# 5) فتح المتصفح
echo "🌐 فتح المتصفح..."

sleep 3
open "http://localhost:5173"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ مداد المحاسبي يعمل الآن!                ║"
echo "╠══════════════════════════════════════════════╣"
echo "║   🖥️  البرنامج: http://localhost:5173        ║"
echo "║   👨‍👩‍👧 بوابة ولي الأمر: /parent-login         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""