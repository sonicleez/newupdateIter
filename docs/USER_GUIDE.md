# 📚 Scene Director - Hướng Dẫn Sử Dụng Toàn Diện

**Scene Director (Genyu AI)** là công cụ tạo storyboard và hình ảnh hóa kịch bản bằng AI. Được hỗ trợ bởi **Google Gemini**, giúp đạo diễn và nhà sáng tạo tạo ra storyboard chuyên nghiệp từ ý tưởng đơn giản.

---

## Mục Lục

1. [Bắt Đầu](#1-bắt-đầu)
2. [Quản Lý Dự Án](#2-quản-lý-dự-án)
3. [Nhân Vật](#3-nhân-vật)
4. [Sản Phẩm](#4-sản-phẩm)
5. [Tạo Kịch Bản](#5-tạo-kịch-bản)
6. [Quản Lý Cảnh](#6-quản-lý-cảnh)
7. [Tạo Ảnh](#7-tạo-ảnh)
8. [Director Chat](#8-director-chat)
9. [Xuất Dự Án](#9-xuất-dự-án)
10. [Cài Đặt Nâng Cao](#10-cài-đặt-nâng-cao)

---

## 1. Bắt Đầu

### 1.1 Đăng Nhập
1. Mở ứng dụng
2. Nhập **API Key** của Google AI Studio
3. Hoặc đăng nhập với tài khoản Supabase

### 1.2 Giao Diện Chính
| Vùng | Mô tả |
|------|-------|
| **Sidebar trái** | Nhân vật, Sản phẩm, Kịch bản |
| **Vùng giữa** | Danh sách Scenes |
| **Góc dưới trái** | Director Chat |
| **Góc trên phải** | Settings, Export |

---

## 2. Quản Lý Dự Án

### 2.1 Tạo Dự Án Mới
1. Click **"Clean All"** để xóa dữ liệu cũ
2. Hoặc vào **Project Browser** để quản lý nhiều dự án

### 2.2 Lưu Dự Án
- Dự án tự động lưu vào **Local Storage**
- Hoặc sync lên **Supabase** (nếu đăng nhập)

### 2.3 Tải Dự Án
1. Mở **Project Browser**
2. Chọn dự án từ danh sách
3. Click **Load**

---

## 3. Nhân Vật

### 3.1 Thêm Nhân Vật
1. Click **"+ Thêm Nhân Vật"** ở sidebar trái
2. Nhập **Tên** và **Mô tả** chi tiết
3. Upload **Ảnh tham chiếu** (Face ID)

### 3.2 Tạo Face ID Tự Động
1. Click vào nhân vật đã tạo
2. Chọn **"Generate Face ID"**
3. AI sẽ tạo 4 góc nhìn để đảm bảo consistency

### 3.3 Gán Nhân Vật Vào Cảnh
- Mỗi cảnh có checkbox **"Nhân vật"**
- Tick vào nhân vật muốn xuất hiện trong cảnh đó
- AI sẽ giữ **Face ID** nhất quán

---

## 4. Sản Phẩm

### 4.1 Thêm Sản Phẩm
1. Click **"+ Thêm Sản Phẩm"**
2. Nhập **Tên** và **Mô tả** chi tiết
3. Upload **Ảnh sản phẩm** (bắt buộc)

### 4.2 Gán Sản Phẩm Vào Cảnh
- Mỗi cảnh có checkbox **"Sản phẩm"**
- Tick vào sản phẩm muốn xuất hiện
- AI sẽ giữ **Object Consistency**

---

## 5. Tạo Kịch Bản

### 5.1 Script Generator (AI)
1. Click **"Tạo Script"** hoặc icon ✨
2. Nhập **Ý tưởng** (ví dụ: "Quảng cáo kem đánh răng vui nhộn")
3. Chọn **Thể loại**: TVC, Music Video, Film, etc.
4. Chọn **Số cảnh** mong muốn
5. Click **Generate**

### 5.2 Manual Script
1. Click **"Nhập Script"**
2. Paste kịch bản đã viết sẵn
3. AI sẽ phân tích và tách thành các cảnh

### 5.3 Tùy Chỉnh Script
- **Tone**: Hài hước, Cảm động, Hành động, etc.
- **Style**: Cinematic, Anime, Realistic, etc.
- **Duration**: Số giây cho mỗi cảnh

---

## 6. Quản Lý Cảnh

### 6.1 Danh Sách Cảnh
Mỗi cảnh (Scene) bao gồm:
- **Mô tả cảnh** (Context Description)
- **Loại góc máy** (Shot Type)
- **Lens**
- **Transition**
- **Nhân vật / Sản phẩm** được gán

### 6.2 Chỉnh Sửa Cảnh
1. Click vào cảnh muốn sửa
2. Chỉnh **Mô tả** trong textarea
3. Chọn **Shot Type**, **Lens**, **Transition** từ dropdown
4. Hoặc chọn **"Custom"** để nhập tùy chỉnh

### 6.3 Thêm / Xóa Cảnh
- **Thêm**: Click **"+ Scene"** hoặc dùng Director Chat
- **Xóa**: Click icon 🗑️ trên cảnh
- **Sắp xếp**: Kéo thả cảnh

### 6.4 Cinematography Options

| Option | Ví dụ |
|--------|-------|
| **Shot Type** | Wide, Medium, Close-up, POV, Custom |
| **Lens** | 24mm, 35mm, 50mm, 85mm, Macro, Custom |
| **Transition** | Cut, Dissolve, Fade, Match Cut, Custom |

---

## 7. Tạo Ảnh

### 7.1 Tạo Ảnh Cho 1 Cảnh
1. Click **"Tạo Lại"** trên cảnh muốn gen
2. Chờ AI xử lý (30-60 giây)
3. Ảnh sẽ hiển thị ở khung bên phải

### 7.2 Tạo Ảnh Hàng Loạt
1. Click **"Generate All"** ở thanh công cụ
2. AI sẽ tạo ảnh cho tất cả cảnh chưa có ảnh
3. Có thể dừng giữa chừng bằng **"Stop"**

### 7.3 Reference Image (Tham Chiếu)
- **Mở Neo Tham Chiếu**: Click vùng ảnh tham chiếu
- **Chọn ảnh**: Từ scene khác hoặc upload mới
- AI sẽ giữ style/object từ ảnh tham chiếu

### 7.4 Chỉnh Sửa Ảnh
1. Click ảnh đã tạo
2. Mở **Image Editor**
3. Có thể:
   - **Mask**: Chọn vùng cần sửa
   - **Prompt**: Mô tả thay đổi muốn làm
   - **Regenerate**: Tạo lại vùng được chọn

---

## 8. Director Chat

### 8.1 Mở Director Chat
- Góc dưới trái màn hình
- Ô input: *"Type a command..."*

### 8.2 Các Lệnh Phổ Biến

| Lệnh | Ví dụ |
|------|-------|
| **Tạo lại cảnh** | `Tạo lại cảnh 5`, `Regenerate scene 3-7` |
| **Đổi style** | `Style anime`, `Phong cách Pixar` |
| **Composite** | `Lấy ghế từ cảnh 2 đặt vào cảnh 1` |
| **Insert** | `Chèn sau cảnh 1, zoom vào tay` |
| **Sync** | `Cảnh 5 giống cảnh 1` |

### 8.3 Chi Tiết
Xem **[DIRECTOR_CHAT_GUIDE.md](./DIRECTOR_CHAT_GUIDE.md)** để biết thêm.

---

## 9. Xuất Dự Án

### 9.1 Download All
1. Click **"Download All"** ở góc phải
2. Chọn định dạng:
   - **Images only**: Chỉ ảnh
   - **Full package**: Ảnh + Script + Metadata
3. File ZIP sẽ được tải về

### 9.2 Cấu Trúc ZIP
```
Project_Export/
├── Scenes/
│   ├── 001_scene.png
│   ├── 002_scene.png
│   └── ...
├── Assets/
│   ├── Characters/
│   └── Products/
└── script.json
```

### 9.3 Copy Prompts
- Click **"Copy All Prompts"** để copy tất cả prompt
- Dùng cho **Veo 3** hoặc video generation khác

---

## 10. Cài Đặt Nâng Cao

### 10.1 API Key
1. Vào **Settings** (icon ⚙️)
2. Nhập **Google AI Studio API Key**
3. Kiểm tra bằng **Test Connection**

### 10.2 Image Model
- **gemini-3-pro-image-preview**: Chất lượng cao (mặc định)
- **gemini-2.0-flash**: Nhanh hơn, chất lượng thấp hơn

### 10.3 Generation Settings
| Setting | Mô tả |
|---------|-------|
| **Concurrent Prompts** | Số cảnh gen song song (1-5) |
| **Prompt Delay** | Độ trễ giữa các request (ms) |
| **Image Resolution** | 1K, 2K |
| **Aspect Ratio** | 16:9, 9:16, 1:1 |

### 10.4 DOP Mode
- **Enable DOP**: Bật kiểm tra raccord giữa các cảnh
- AI sẽ tự động validate visual continuity

### 10.5 Style Presets
1. Vào **Presets** 
2. Chọn preset có sẵn (Cinematic, Anime, etc.)
3. Hoặc tạo **Custom Preset** với prompt riêng

---

## Keyboard Shortcuts

| Shortcut | Hành động |
|----------|-----------|
| `Cmd/Ctrl + K` | Focus Director Chat |
| `Cmd/Ctrl + G` | Generate All |
| `Cmd/Ctrl + S` | Save Project |
| `Esc` | Đóng Modal |

---

## FAQ

### Q: Tại sao ảnh không giống nhau giữa các cảnh?
**A:** Đảm bảo:
1. Nhân vật có **Face ID** (4 góc nhìn)
2. Nhân vật được **tick** trong cảnh đó
3. Mô tả cảnh phải đề cập nhân vật

### Q: Lỗi 429 Too Many Requests?
**A:** Giảm **Concurrent Prompts** xuống 1-2, tăng **Prompt Delay** lên 2000ms

### Q: Làm sao để export video?
**A:** 
1. Copy prompts với **"Copy All Prompts"**
2. Dùng **Veo 3** hoặc **Runway** để gen video từ prompts

### Q: API Key ở đâu?
**A:** Vào [Google AI Studio](https://aistudio.google.com/apikey) để tạo key miễn phí.

---

## Liên Hệ Hỗ Trợ

- **GitHub**: [sonicleez/scense_director](https://github.com/sonicleez/scense_director)
- **Issues**: Tạo issue trên GitHub để báo lỗi

---

**Chúc bạn sáng tạo vui vẻ với Scene Director! 🎬✨**
