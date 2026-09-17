# Giải thưởng "Thanh niên sống đẹp" 2026

Trang giới thiệu và hệ thống tiếp nhận hồ sơ đề cử Giải thưởng "Thanh niên sống đẹp" của Trung ương Hội Liên hiệp Thanh niên Việt Nam, kèm trang quản trị có thống kê, trợ lý AI đọc và tổng hợp hồ sơ, đồng bộ hồ sơ lên Google Drive.

Bản đang vận hành: https://thanhniensongdep.vn

## Tính năng chính

**Trang công khai**
- Giới thiệu giải thưởng, đối tượng, tiêu chuẩn, lĩnh vực xét chọn và thời hạn nộp hồ sơ.
- Biểu mẫu đề cử trực tuyến kèm tải lên đầy đủ thành phần hồ sơ: công văn giới thiệu, trích ngang lý lịch (mẫu M2), báo cáo thành tích, ảnh chân dung, 5–10 ảnh hoạt động và minh chứng khen thưởng.
- Chống nộp trùng: đối chiếu họ tên kèm ngày sinh, số điện thoại và thư điện tử cá nhân; hồ sơ trùng bị chặn kèm cảnh báo, đơn vị có thể xác nhận nếu là cá nhân khác.
- Trang chính sách bảo mật và điều khoản sử dụng phục vụ xác minh OAuth của Google.

**Trang quản trị**
- Bảng thống kê tổng hồ sơ, số đơn vị đề cử, tệp đính kèm, tiến độ xử lý AI và cảnh báo độ tuổi.
- Biểu đồ hồ sơ theo lĩnh vực và theo trạng thái thẩm định.
- Trợ lý AI (Gemini trên Vertex AI) đọc tệp đính kèm, nhận dạng ký tự và tổng hợp thành các ô báo cáo: đơn vị đề cử, họ tên, ngày sinh, vị trí/nơi công tác, tóm tắt thành tích nổi bật, khen thưởng, nhận xét đánh giá về độ tuổi và điều kiện thành tích.
- Sửa thông tin và xóa hồ sơ (kèm xác nhận), rà soát nhóm hồ sơ nghi trùng.
- Đồng bộ mỗi hồ sơ thành một thư mục riêng trên Google Drive kèm tệp tổng hợp, ghi nhận qua OAuth phạm vi `drive.file`.
- Xuất tổng hợp toàn bộ hồ sơ ra tệp CSV.

## Công nghệ

- Giao diện: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts, wouter, TanStack Query.
- Máy chủ: Express, TypeScript, Drizzle ORM trên SQLite (better-sqlite3), Multer.
- AI: Vertex AI (Gemini 2.5 Pro) hoặc Google AI Studio.
- Triển khai: giao diện tĩnh trên Vercel; máy chủ chạy Docker Compose sau Caddy trên máy ảo.

## Cấu trúc thư mục

```
client/     Giao diện React (trang chủ, đăng ký, quản trị, chính sách)
server/     Express: định tuyến, lưu trữ, xử lý AI, đồng bộ Google Drive
shared/     Lược đồ dữ liệu và hằng số dùng chung
deploy/     Docker Compose và cấu hình Caddy
script/     Tiện ích dòng lệnh
```

## Chạy ở máy cá nhân

```bash
npm install
cp .env.example .env    # khai báo biến môi trường
npm run dev             # chạy ở http://localhost:5000
```

Kiểm tra kiểu và đóng gói:

```bash
npx tsc --noEmit
npx vite build          # giao diện -> dist/public
npm run build           # máy chủ  -> dist/index.cjs
```

## Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `ADMIN_PASSWORD` | Mật khẩu đăng nhập trang quản trị |
| `DATA_DIR` | Thư mục lưu cơ sở dữ liệu và tệp tải lên |
| `ALLOWED_ORIGINS` | Danh sách nguồn được phép gọi API |
| `AI_PROVIDER` | `vertex` hoặc `gemini` |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_MODEL` | Cấu hình Vertex AI |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT` | OAuth kết nối Google Drive |
| `DRIVE_ROOT_NAME`, `DRIVE_SHARE_EMAILS` | Thư mục gốc trên Drive và danh sách chia sẻ |

## Triển khai bằng Docker

```bash
cd deploy
cp .env.example .env    # khai báo bí mật
docker compose up -d --build
```

## Lưu ý về dữ liệu

Kho mã này không chứa hồ sơ, cơ sở dữ liệu hay bất kỳ khóa bí mật nào. Thư mục `uploads/`, tệp `data.db` và mọi tệp `.env` đều được loại trừ. Hồ sơ đề cử chứa dữ liệu cá nhân, đề nghị không đưa lên kho mã công khai.

## Giấy phép

Sản phẩm phục vụ hoạt động của Trung ương Hội Liên hiệp Thanh niên Việt Nam. Vui lòng liên hệ đơn vị chủ quản trước khi sử dụng lại cho mục đích khác.
