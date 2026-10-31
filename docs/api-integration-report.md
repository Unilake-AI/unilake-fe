# Báo cáo kiểm thử kết nối Frontend với REST API (UDL-192)

Ngày kiểm thử: 29/10/2026. Người thực hiện: Trương Đình Đạt.

Môi trường: backend, PostgreSQL, MinIO, Redis chạy bằng `docker compose up -d` (nhánh `developer`,
commit `3627993`); frontend chạy ở `http://localhost:3001` và trong container ở `http://localhost:3000`.
Frontend gọi thẳng `http://localhost:8000/api/v1` bằng client trong `src/api/http.ts`.

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| CORS | ✅ Cho phép `localhost:3000/3001`, chặn origin lạ |
| Xác thực (login, gửi token, refresh, logout) | ✅ Hoạt động end-to-end |
| Endpoint frontend đang gọi | 9 / 9 trả đúng như frontend mong đợi |
| Xử lý lỗi | ✅ Xem `error-checklist.md` (UDL-189) |
| Lệch so với API Contract | 4 điểm, ghi ở mục 5 |

## 2. CORS

| Kiểm tra | Kết quả |
|---|---|
| Preflight `OPTIONS /datasources` từ `http://localhost:3000` | 200, `access-control-allow-origin: http://localhost:3000`, cho phép header `authorization` |
| Preflight từ `http://evil.example` | 400, không có header cho phép |
| Request thật từ trình duyệt (GET, POST, PATCH) | Không lỗi CORS |

Danh sách origin lấy từ `CORS_ORIGINS` (`backend/app/core/config.py`). Khi deploy cần thêm domain thật.

## 3. Xác thực

| Luồng | Request | Kết quả |
|---|---|---|
| Đăng nhập | `POST /auth/login` `{username, password}` | 200, trả `access_token`, `refresh_token`, `user.role`; frontend chuyển đúng trang theo vai trò |
| Gửi token | Header `Authorization: Bearer <access_token>` | Backend chấp nhận ở mọi endpoint cần đăng nhập |
| Làm mới token | `POST /auth/refresh` `{refresh_token}` khi gặp 401 | 200, frontend lưu token mới và gửi lại request |
| Đăng xuất | `POST /auth/logout` `{refresh_token}` | 200; dùng lại refresh token cũ bị từ chối `SESSION_EXPIRED` |
| Không có / sai token | — | 401 `UNAUTHORIZED` / `INVALID_TOKEN` |

## 4. Kết quả theo endpoint

| Endpoint | Màn hình | Thành công | Lỗi đã kiểm | Kết quả |
|---|---|---|---|---|
| `POST /auth/login` | Đăng nhập | 200 | 401 sai mật khẩu, 422 thiếu trường | ✅ |
| `POST /auth/refresh` | (tự động) | 200 | 401 token không hợp lệ | ✅ |
| `POST /auth/logout` | Menu người dùng | 200 | — | ✅ |
| `GET /datasources` | Nguồn dữ liệu | 200, lọc và phân trang | 401, 403 (manager) | ✅ |
| `GET /datasources/{id}` | Chỉnh sửa nguồn | 200 | 404 `DATA_SOURCE_NOT_FOUND` | ✅ |
| `POST /datasources/create` | Thêm nguồn | 200, có thông báo và quay về danh sách | 403 (viewer), 422 `CONFIGURATION_INVALID` | ✅ |
| `PATCH /datasources/{id}` | Sửa, bật/tắt nguồn | 200 | — | ✅ |
| `GET /ingestion/jobs` | Nạp dữ liệu | 200, tự hỏi lại khi có job đang chạy | 401 → refresh | ✅ |
| `POST /ingestion/jobs` | Nạp dữ liệu | Chưa kiểm được (database chưa có dataset) | 404 `INGESTION_NOT_FOUND`, 422 sai kiểu | ⚠️ Một phần |
| `GET /governance/catalog` | Data Catalog, Khám phá dữ liệu | 200 (2 dataset domain `demo`) | timeout, mất kết nối | ✅ |
| `POST /nlq/ask` | Hỏi AI | 200 | — | ⚠️ Backend trả dữ liệu giả |

### Quyền theo vai trò (tài khoản mẫu)

| Vai trò | `GET /datasources` | `GET /ingestion/jobs` | `GET /governance/catalog` | `POST /nlq/ask` |
|---|---|---|---|---|
| ADMIN | 200 | 200 | 200 | 200 |
| DATA_ADMIN | 200 | 200 | 200 | 200 |
| ANALYST | 200 | 200 | 200 | 200 |
| MANAGER | 403 | 403 | 200 | 200 |
| VIEWER | 200 | 200 | 200 | 200 |

Chỉ ADMIN và DATA_ADMIN được ghi nguồn dữ liệu (đã kiểm `viewer` bị 403). Ma trận quyền chính thức
thuộc UDL-166.

## 5. Lệch giữa API Contract (Drive) và backend hiện tại

Frontend đang theo **backend hiện tại**. Cần nhóm chốt (UDL-190) trước khi đổi:

| API Contract | Backend hiện tại | Ảnh hưởng frontend |
|---|---|---|
| `/data-sources`, tạo bằng `POST /data-sources` | `/datasources`, tạo bằng `POST /datasources/create` | Đổi đường dẫn trong `src/api/api_data.ts` |
| Login bằng `email` | Login bằng `username` | Form đã nhận cả hai |
| Response bọc `{success, data, meta, request_id}` | Response trả thẳng dữ liệu; lỗi đã theo envelope trừ 422 của FastAPI | Nếu đổi, cần sửa các hàm trong `src/api/` |
| `GET /auth/me`, `/ai/queries`, `/governance/catalog/datasets`, `/governance/quality/*`, `/governance/lineage/*`, `/dashboard/*` | Chưa có | Các trang tương ứng đang dùng dữ liệu mẫu |

## 6. Việc cần làm tiếp

1. Backend: bổ sung API Lineage (UDL-177), Quality, Dashboard, `/auth/me`, lịch sử truy vấn.
2. Backend: đưa lỗi 422 về envelope chuẩn (UDL-187); hoàn thiện `/nlq/ask`.
3. Seed dataset Bronze để kiểm được job ingestion thành công từ giao diện.
4. Sau khi nhóm chốt API Contract: đổi đường dẫn trong `src/api/api_data.ts` và chạy lại báo cáo này.
