# Triển khai hệ thống Giải thưởng "Thanh niên sống đẹp" 2026

Tên miền: **thanhniensongdep.vn** (đăng ký tại Mắt Bão)

## 1. Kiến trúc triển khai

| Thành phần | Nền tảng | Địa chỉ |
|---|---|---|
| Giao diện web (landing page, form nộp hồ sơ, trang quản trị) | Vercel – project `thanhniensongdep` (team `vypa`) | `https://thanhniensongdep.vn` |
| API, lưu trữ hồ sơ, OCR + tổng hợp AI | Google Cloud (VM Compute Engine chạy Docker, hoặc Cloud Run) | `https://api.thanhniensongdep.vn` |
| Tệp đính kèm + cơ sở dữ liệu SQLite | Ổ đĩa bền vững gắn vào máy chủ (`/mnt/tnsd-data`), sao lưu sang Cloud Storage | – |

Giao diện gọi API qua đường dẫn `/api/*` cùng tên miền; Vercel chuyển tiếp (rewrite) sang `api.thanhniensongdep.vn` nên trình duyệt không gặp lỗi CORS. Cấu hình này nằm trong `vercel.json`.

## 2. Bản ghi DNS cần nhập tại Mắt Bão

Vào **Quản lý tên miền → thanhniensongdep.vn → Quản lý DNS**, giữ nguyên các bản ghi MX/email đang dùng, thêm/sửa các bản ghi sau:

| STT | Loại | Tên (Host) | Giá trị (Value / Points to) | TTL | Ghi chú |
|---|---|---|---|---|---|
| 1 | A | `@` | `216.198.79.1` | 3600 | Trỏ tên miền gốc về Vercel |
| 2 | CNAME | `www` | Giá trị Vercel cấp riêng cho dự án, dạng `xxxxxxxxxxxxxxxx.vercel-dns-017.com` | 3600 | Sao chép đúng chuỗi hiển thị trong Vercel → Project → Settings → Domains |
| 3 | A | `api` | `35.197.129.12` | 3600 | IP tĩnh của máy ảo `tnsd-api` đã dựng trên Google Cloud |
| 3′ | CNAME | `api` | `ghs.googleapis.com` | 3600 | Chỉ dùng thay cho mục 3 nếu triển khai bằng **Cloud Run domain mapping** |
| 4 | CAA | `@` | `0 issue "letsencrypt.org"` | 3600 | Tùy chọn; nếu đã có CAA thì bổ sung thêm `0 issue "pki.goog"` |

Lưu ý:

- Nếu Mắt Bão không cho tạo bản ghi CNAME cho `www` do trùng bản ghi A cũ, hãy xóa bản ghi A của `www` trước.
- Bản ghi `A @ 76.76.21.21` và `CNAME www cname.vercel-dns.com` (kiểu cũ của Vercel) vẫn hoạt động nhưng đang được Vercel thay dần; nên dùng giá trị mới ở bảng trên.
- Nếu Vercel yêu cầu xác minh quyền sở hữu, thêm bản ghi `TXT` tên `_vercel` với giá trị chuỗi `vercel=...` mà Vercel hiển thị.
- Nếu dùng Cloud Run, trước khi ánh xạ tên miền phải xác minh tên miền trong Google Search Console bằng một bản ghi `TXT` tên `@` với giá trị `google-site-verification=...`.
- DNS thường có hiệu lực sau 15–60 phút, tối đa 24 giờ.

## 3. Hiện trạng hạ tầng đã dựng

| Tài nguyên | Giá trị |
|---|---|
| Project | `thanhniensongdep` |
| Máy ảo | `tnsd-api`, e2-small, zone `asia-southeast1-a`, đĩa 30GB |
| IP tĩnh | `35.197.129.12` (tên `tnsd-ip`, region `asia-southeast1`) |
| Tường lửa | `tnsd-allow-web` mở cổng 80/443 cho tag `tnsd-web` |
| Ứng dụng | Docker Compose (`api` + `caddy`) tại `~/tnsd2026/deploy`, dữ liệu ở `/mnt/tnsd-data` |
| AI | Vertex AI, model `gemini-2.5-pro`, endpoint `global`, dùng quyền của service account gắn vào máy ảo |

Lệnh quản trị thường dùng (chạy sau khi `gcloud compute ssh tnsd-api --zone=asia-southeast1-a`):

```bash
cd ~/tnsd2026/deploy
sudo docker compose ps           # trạng thái
sudo docker compose logs -f api  # nhật ký
sudo docker compose restart api  # khởi động lại
```

## 4. Các lệnh đã dùng để dựng máy chủ (tham khảo)

Phương án này giữ nguyên cơ sở dữ liệu SQLite và thư mục tệp đính kèm, phù hợp quy mô vài nghìn hồ sơ, chi phí thấp và dễ sao lưu.

```bash
# 1. Tạo IP tĩnh và máy ảo (chọn vùng asia-southeast1 - Singapore cho độ trễ thấp tại Việt Nam)
gcloud compute addresses create tnsd-ip --region=asia-southeast1
gcloud compute instances create tnsd-api \
  --zone=asia-southeast1-a \
  --machine-type=e2-small \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --address=tnsd-ip \
  --tags=http-server,https-server

# 2. Mở cổng 80/443
gcloud compute firewall-rules create allow-web \
  --allow=tcp:80,tcp:443 --target-tags=http-server,https-server

# 3. Lấy IP tĩnh để nhập vào bản ghi A của "api"
gcloud compute addresses describe tnsd-ip --region=asia-southeast1 --format='value(address)'
```

Trên máy ảo:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
sudo mkdir -p /mnt/tnsd-data/uploads
# tải mã nguồn lên máy (git clone hoặc scp thư mục dự án)
cd tnsd2026/deploy
export ADMIN_PASSWORD='<mật khẩu quản trị mạnh>'
export ANTHROPIC_API_KEY='<khóa API Anthropic của đơn vị>'
sudo -E docker compose up -d --build
```

Caddy trong `docker-compose.yml` tự động xin chứng chỉ HTTPS cho `api.thanhniensongdep.vn` sau khi bản ghi DNS đã trỏ đúng.

### Biến môi trường của backend

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `ADMIN_PASSWORD` | Có | Mật khẩu đăng nhập trang quản trị |
| `AI_PROVIDER` | Có | Đặt `vertex` để dùng Vertex AI trong project Google Cloud |
| `GOOGLE_CLOUD_PROJECT` | Có | `thanhniensongdep` |
| `GOOGLE_CLOUD_LOCATION` | Có | `global` (model Gemini chưa phục vụ tại `asia-southeast1`) |
| `VERTEX_MODEL` | Không | Mặc định `gemini-2.5-pro` |
| `DATA_DIR` | Không | Thư mục dữ liệu, mặc định `/data` trong container |
| `ALLOWED_ORIGINS` | Nên có | `https://thanhniensongdep.vn,https://www.thanhniensongdep.vn` |
| `PORT` | Không | Mặc định 5000 |

### Sao lưu định kỳ sang Cloud Storage

```bash
gcloud storage buckets create gs://tnsd2026-backup --location=asia-southeast1
# thêm vào crontab: sao lưu hằng ngày lúc 1h sáng
0 1 * * * tar czf /tmp/tnsd-$(date +\%F).tgz -C /mnt tnsd-data && gcloud storage cp /tmp/tnsd-*.tgz gs://tnsd2026-backup/ && rm -f /tmp/tnsd-*.tgz
```

## 5. Phương án thay thế: Cloud Run

Cloud Run không giữ dữ liệu giữa các lần khởi động, nên nếu chọn phương án này cần:

- Gắn volume Cloud Storage (`--add-volume`, `--add-volume-mount`) cho thư mục tệp đính kèm, và
- Chuyển cơ sở dữ liệu sang Cloud SQL (PostgreSQL) thay cho SQLite.

```bash
gcloud run deploy tnsd-api --source . --region=asia-southeast1 \
  --allow-unauthenticated --port=5000 --memory=2Gi \
  --set-env-vars=ALLOWED_ORIGINS=https://thanhniensongdep.vn
gcloud beta run domain-mappings create --service=tnsd-api \
  --domain=api.thanhniensongdep.vn --region=asia-southeast1
```

## 6. Cập nhật giao diện trên Vercel

```bash
cd tnsd2026
npx vercel deploy --prod
```

Vercel tự build theo `vercel.json` (`npx vite build`, thư mục xuất bản `dist/public`).

## 7. Kiểm tra sau khi lên tên miền

1. `https://thanhniensongdep.vn` mở được landing page, có chứng chỉ HTTPS hợp lệ.
2. `https://api.thanhniensongdep.vn/api/nominations/count` trả về JSON.
3. Nộp thử một hồ sơ đầy đủ, kiểm tra mã hồ sơ được cấp.
4. Đăng nhập `https://thanhniensongdep.vn/#/admin`, kiểm tra bảng tổng hợp AI và nút xuất CSV.
5. Đổi ngay mật khẩu quản trị mặc định trước khi công bố.
