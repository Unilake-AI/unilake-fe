# Checklist kịch bản lỗi giữa Frontend và Backend (UDL-189)

Ngày kiểm thử: 29/10/2026. Người thực hiện: Trương Đình Đạt.

Môi trường: `docker compose up -d` trên nhánh `developer` (commit `3627993`), frontend nhánh
`feature/FE-error-handling` chạy bằng `next start`. Tài khoản mẫu theo `docs/db-local-sync.md`.

Cách đọc cột **Cách kiểm**:

- **UI**: thao tác trên trình duyệt với backend thật.
- **API**: gọi backend bằng `curl` để xem đúng response frontend nhận được.
- **Test**: kiểm thử tự động trong `frontend/src` (chạy bằng `pnpm test`).

## 1. Kết nối và thời gian chờ

| # | Kịch bản | Cách tạo lỗi | Kết quả mong đợi | Cách kiểm | Kết quả |
|---|---|---|---|---|---|
| 1.1 | Backend tắt hẳn | `docker stop unilake-backend`, mở `/data/ingestion` | Khung lỗi "Không thể kết nối đến máy chủ. Vui lòng thử lại sau." kèm nút Thử lại | UI | ✅ Đạt |
| 1.2 | Backend treo, không trả lời | `docker pause unilake-backend`, mở `/data/catalog` | Sau 30 giây (timeout của client) hiện "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau." | UI | ✅ Đạt (xem ghi chú A) |
| 1.3 | Backend chạy lại sau khi lỗi | `docker start unilake-backend`, bấm Thử lại | Tải lại được dữ liệu, không cần tải lại trang | UI | ✅ Đạt |
| 1.4 | Lỗi máy chủ 5xx có nội dung kỹ thuật | Backend trả 500 kèm traceback | Chỉ hiện "Máy chủ đang gặp sự cố…", không lộ traceback | Test (`http.test.ts`) | ✅ Đạt |
| 1.5 | Request lỗi tạm thời | Mất mạng thoáng qua hoặc 5xx | Tự thử lại 1 lần; lỗi 4xx và timeout không thử lại | Test (`shouldRetryRequest`) | ✅ Đạt |

## 2. Cấu hình sai

| # | Kịch bản | Cách tạo lỗi | Kết quả mong đợi | Cách kiểm | Kết quả |
|---|---|---|---|---|---|
| 2.1 | `NEXT_PUBLIC_API_URL` có sẵn hậu tố `/api/v1` | Giá trị trong `docker-compose.yml` | Không gọi trùng `/api/v1/api/v1/...` | Test (`api.test.ts`), UI qua Docker | ✅ Đạt |
| 2.2 | Thiếu biến `NEXT_PUBLIC_API_URL` | Chạy `pnpm dev` không có `.env.local` | Mặc định gọi `http://localhost:8000` | Test (`api.test.ts`) | ✅ Đạt |
| 2.3 | Frontend chạy ở origin không được phép | Gọi từ `http://evil.example` | Backend chặn CORS (preflight 400) | API | ✅ Đạt |
| 2.4 | Cấu hình nguồn dữ liệu thiếu khoá | Gửi CSV thiếu `encoding`, `has_header` | Frontend chặn trước khi gửi; nếu backend trả `CONFIGURATION_INVALID` thì hiện câu lỗi kèm từng khoá thiếu | Test (`source-form-view.test.tsx`), API | ✅ Đạt |

## 3. Xác thực và phân quyền

| # | Kịch bản | Cách tạo lỗi | Kết quả mong đợi | Cách kiểm | Kết quả |
|---|---|---|---|---|---|
| 3.1 | Sai mật khẩu | Đăng nhập `dataadmin` với mật khẩu sai | Khung đỏ "Đăng nhập không thành công – Tên đăng nhập hoặc mật khẩu chưa đúng" (nội dung từ backend) | UI | ✅ Đạt |
| 3.2 | Access token hết hạn / sai chữ ký | Sửa cookie `access_token` thành token sai chữ ký | Gặp 401 → tự gọi `/auth/refresh` → gửi lại request → vẫn ở trang hiện tại | UI (Network: 401 → refresh 200 → 200) | ✅ Đạt |
| 3.3 | Refresh token không dùng được | Refresh bị thu hồi hoặc hết hạn | Xoá phiên, chuyển về `/login?expired=1` với thông báo "Phiên đăng nhập đã hết hạn" | Test (`http.test.ts`, `login-view.test.tsx`), UI thông báo | ✅ Đạt |
| 3.4 | Nhiều request cùng hết hạn | 3 request đồng thời bị 401 | Chỉ gọi `/auth/refresh` một lần | Test | ✅ Đạt |
| 3.5 | Đăng xuất | Bấm Đăng xuất trong menu người dùng | Gọi `/auth/logout` (200), xoá token, về `/login`; refresh token cũ bị backend thu hồi (`SESSION_EXPIRED`) | UI + API | ✅ Đạt |
| 3.6 | Không đủ quyền (403) | `viewer` gọi `POST /datasources/create` | Hiện "Bạn không có quyền ghi data source" (nội dung backend) | API + Test | ✅ Đạt |

## 4. Dữ liệu không hợp lệ (validation)

| # | Kịch bản | Cách tạo lỗi | Kết quả mong đợi | Cách kiểm | Kết quả |
|---|---|---|---|---|---|
| 4.1 | Bỏ trống ô bắt buộc ở form | Bấm Lưu khi chưa nhập | Báo lỗi dưới từng ô, viền đỏ, không gọi API | UI + Test | ✅ Đạt |
| 4.2 | Email sai định dạng ở Login | Nhập `admin@unilake` | "Email không đúng định dạng." | Test | ✅ Đạt |
| 4.3 | Lỗi 422 mặc định của FastAPI | Gửi `data_source_id: "x"` tới `/ingestion/jobs` | Câu chung "Dữ liệu gửi lên không hợp lệ…" và danh sách `trường: lỗi` | API + Test | ✅ Đạt |
| 4.4 | Không tìm thấy dữ liệu (404) | `GET /datasources/99999`, tạo job với dataset không tồn tại | Hiện nội dung backend ("Không tìm thấy nguồn dữ liệu", "Source hoặc dataset không tồn tại") | API + Test | ✅ Đạt |
| 4.5 | Đường dẫn trang không tồn tại | Mở `/admin/khong-co-trang-nay` | Trang 404 "Không tìm thấy trang" có nút về trang chủ | UI | ✅ Đạt |
| 4.6 | Lỗi bất ngờ khi hiển thị trang | Component ném lỗi | Trang lỗi chung, có Thử lại và mã tra cứu, không lộ nội dung lỗi | Test | ✅ Đạt |

## 5. Hiển thị thông báo lỗi

- Mọi khung lỗi trên trang có gọi API đều có nút **Thử lại** và hiện **Mã tra cứu** (`request_id` backend trả về) để đối chiếu log.
- Thao tác thành công (thêm, sửa, bật, tắt nguồn) có thông báo xác nhận góc màn hình.
- Không chỗ nào hiện stack trace hay nội dung exception.

## Ghi chú

**A. Thời gian chờ:** client đặt timeout 30 giây. Trước khi sửa, React Query tự thử lại cả lỗi
timeout nên người dùng phải chờ khoảng 70 giây; đã đổi để chỉ thử lại khi mất kết nối hoặc lỗi 5xx.

**B. Vấn đề phía backend phát hiện khi kiểm thử** (gửi Sơn/Bảo Toàn, không sửa trong frontend):

1. Lỗi 422 của FastAPI vẫn trả dạng `{"detail": [...]}`, chưa theo envelope chuẩn
   `{"success": false, "error": {...}}` trong API Contract (thuộc UDL-187).
2. `POST /nlq/ask` hiện luôn trả `{"sql": "select 1", "rows": []}`, nhận cả câu hỏi rỗng.
3. Chưa có `GET /auth/me`; frontend đang tự đọc vai trò từ JWT.
4. Database Docker chưa có dataset nào nên chưa chạy được một job ingestion thành công từ giao diện.
