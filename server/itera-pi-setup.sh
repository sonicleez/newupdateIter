#!/bin/bash
# ITERA Network - Trợ lý Quân sư Pi (Staff Edition) - V1.5 (Final-Robust)

echo "🚀 Đang kích hoạt Quân sư Pi cho nhân sự ITERA..."

# 1. Nạp biến môi trường cơ bản
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$PATH"

# 2. Đảm bảo Homebrew hoạt động
if ! command -v brew &> /dev/null; then
    echo "🍺 Đang cài đặt Homebrew (Cần mật khẩu máy)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv)"
fi

# 3. Đảm bảo Node.js hoạt động
if ! command -v npm &> /dev/null; then
    echo "📦 Đang cài đặt Node.js qua Homebrew..."
    brew install node
fi

# 4. Cài đặt Core Engine qua NPM
echo "🦞 Đang cài đặt Core Engine (Clawdbot)..."
sudo npm install -g clawdbot --unsafe-perm=true

# 5. Xác định đường dẫn tuyệt đối
CLAWDBOT_BIN=$(npm config get prefix)/bin/clawdbot
if [ ! -f "$CLAWDBOT_BIN" ]; then CLAWDBOT_BIN=$(which clawdbot); fi

if [ -z "$CLAWDBOT_BIN" ]; then
    echo "❌ LỖI: Không tìm thấy lệnh 'clawdbot'. Vui lòng thử gõ: sudo npm install -g clawdbot"
    exit 1
fi

# 6. Khởi tạo folder và cấu hình an toàn
AGENT_DIR="$HOME/.clawdbot/agents/partner"
mkdir -p "$AGENT_DIR/memory"
mkdir -p "$HOME/.clawdbot"

# ÉP CẤU HÌNH LOCAL (Tránh lỗi Gateway start blocked)
echo '{"gateway":{"mode":"local"}}' > "$HOME/.clawdbot/config.json"
echo "✅ Đã nạp cấu hình Local Mode."

# 7. Đổ "Linh hồn" chuẩn (SOUL.md)
cat <<EOF > "$AGENT_DIR/SOUL.md"
# SOUL.md - Who You Are
Bạn là AI Quân sư của nhân sự tại ITERA Network.
Vibe: Thẳng thắn, chuyên nghiệp, không nịnh, tập trung vào hiệu quả.
Nhiệm vụ: Phò tá nhân sự xử lý việc hỏa tốc, báo cáo kết quả lên Notion công ty.
EOF

# 8. Nhập API Keys cá nhân
echo ""
echo "🔑 CẤU HÌNH DỮ LIỆU RIÊNG:"
echo "----------------------------------"
read -p ">> Nhập Tên của bạn: " STAFF_NAME
read -p ">> Nhập Telegram Bot Token: " TELE_TOKEN
read -p ">> Nhập Notion API Key: " NOTION_KEY
read -p ">> Nhập Supabase Anon Key: " SUPA_KEY

# 9. Ghi vào TOOLS.md
cat <<EOF > "$AGENT_DIR/TOOLS.md"
### Personal API Keys
- Staff Name: $STAFF_NAME
- Telegram: $TELE_TOKEN
- Notion: $NOTION_KEY
- Supabase: $SUPA_KEY
EOF

# 10. Khởi tạo bộ nhớ dài hạn
echo "# Bộ nhớ dài hạn của $STAFF_NAME" > "$AGENT_DIR/MEMORY.md"

# 11. Báo danh về hệ thống trung tâm
echo "📡 Đang gửi tín hiệu báo danh..."
curl -s -X POST "https://db.itera102.cloud/rest/v1/logs" \
     -H "apikey: $SUPA_KEY" \
     -H "Content-Type: application/json" \
     -d "{\"message\": \"AUDIT: Setup SUCCESS for $STAFF_NAME (Machine: $(hostname))\", \"level\": \"info\"}" > /dev/null

echo ""
echo "✅ ĐÃ BÓC SILK THÀNH CÔNG!"
echo "----------------------------------"
echo "Đang khởi động Pi..."

# 12. Cài đặt và chạy service
$CLAWDBOT_BIN gateway install 2>/dev/null
$CLAWDBOT_BIN gateway stop 2>/dev/null
$CLAWDBOT_BIN gateway start
