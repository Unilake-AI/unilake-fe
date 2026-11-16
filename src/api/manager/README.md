# API Manager

Ba role `*_MANAGER` dùng chung `reports.ts`, với Bearer token qua HTTP client
hiện có. Hợp đồng được sinh từ OpenAPI backend trong `docs/api/openapi.json` và
`src/api/schema.d.ts`.

- `/manager`: gọi context và overview; KPI giữ riêng theo nguồn Gold, không tự
  cộng các nguồn có thể trùng người.
- `/manager/analytics`: gọi analytics, lấy danh sách phép nhóm từ Gold recipes.
  Không có bộ lọc thời gian hay tỷ lệ giả khi Gold chưa hỗ trợ.
- `/manager/datasets`: danh sách và chi tiết bộ dữ liệu, trạng thái đồng bộ từng
  nguồn.
- `/manager/quality-issues`: danh sách, lọc trạng thái, thống kê và lịch sử yêu
  cầu sửa; chỉ đọc.

Context được đọc trước; thiếu phân công hợp lệ thì không gọi API dữ liệu.
Backend xác định quyền theo role, phân công và phòng sở hữu dataset. UI hỗ trợ
trạng thái tải, lỗi, không có dữ liệu, đang tổng hợp và phân trang. Polling 15
giây và nút Làm mới giúp cập nhật tiến độ. Khi API lỗi/thu hồi quyền, số liệu
đang lỗi không tiếp tục được hiển thị.

Trang Hỏi AI và lịch sử vẫn dùng các API NLQ dùng chung hiện có. Các trang mẫu
dành cho VIEWER không bị thay đổi.

Chuông thông báo dùng `/notifications?workspace=MANAGER`, lưu đã đọc qua
`/notifications/read` và mở trực tiếp `/manager/quality-issues/{issue_id}`.
Trạng thái đọc được lưu riêng cho tài khoản. Manager xem nội dung, vị trí/mã lỗi
và lịch sử; quyền giao việc/xác minh vẫn thuộc quản trị dữ liệu.
