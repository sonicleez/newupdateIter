# 🚀 Coolify Deployment Guide - Genyu Scene Director (Unified Build)

## Bước 1: Cấu hình Coolify

1. **Ports Exposes**: Điền `3001`
2. **Ports Mappings**: Điền `3001:3001`

---

## Bước 2: Environment Variables

Trong Coolify Application → **Environment Variables**:

```env
# AI & Backend
GROQ_API_KEY=your_key
FAL_KEY=your_key
PERPLEXITY_API_KEY=your_key

# Supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Giải thích kỹ thuật:
Tôi đã hợp nhất (Unified) hệ thống:
- **Port 3001** hiện tại sẽ gánh cả giao diện (Frontend) và bộ não xử lý (Backend).
- Việc này giúp Boss không cần cấu hình Proxy phức tạp trên Coolify, chỉ cần mở đúng 1 cổng 3001 là xong.

---

## Cấu hình Supabase cho Domain mới

1. **Supabase Dashboard → Authentication → URL Configuration**
2. Thêm **Site URL**: `https://your-coolify-domain.com` (phải bao gồm port 3001 nếu không dùng domain riêng).

