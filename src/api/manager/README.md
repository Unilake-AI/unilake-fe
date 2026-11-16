# API Manager

Ba role `*_MANAGER` dùng chung `reports.ts`, với Bearer token qua HTTP client
hiện có. Hợp đồng được sinh từ OpenAPI backend trong `docs/api/openapi.json` và
`src/api/schema.d.ts`.

- `/manager`: gọi context và overview; KPI giữ riêng theo nguồn Gold, không tự
  cộng các nguồn có thể trùng người.
- `/manager/records`: gọi record-types theo lĩnh vực, lấy danh sách/chi tiết đã
  đồng bộ từ Gold vào DB; tìm kiếm mã/tên, lọc trạng thái/dataset và phân trang.
  Loại dữ liệu và trường hiển thị do backend trả về; đổi phòng hoặc loại dữ liệu
  sẽ xóa bộ lọc/chi tiết cũ. Phòng phụ trách chưa được cấu hình thì chưa gọi API
  nghiệp vụ.
- `/manager/analytics`: gọi analytics, lấy danh sách phép nhóm từ Gold recipes.
  Không có bộ lọc thời gian hay tỷ lệ giả khi Gold chưa hỗ trợ.
- `/manager/datasets`: danh sách và chi tiết bộ dữ liệu, trạng thái đồng bộ từng
  nguồn.
- `/manager/quality-issues`: danh sách, lọc trạng thái, thống kê và lịch sử yêu
  cầu sửa; chỉ đọc.

Context được đọc trước; phòng phụ trách theo role chưa được cấu hình thì không
gọi API dữ liệu. Backend xác định quyền theo role hiện hành và phòng sở hữu
dataset. UI hỗ trợ trạng thái tải, lỗi, không có dữ liệu, đang tổng hợp và phân
trang. Polling 15 giây và nút Làm mới giúp cập nhật tiến độ. Khi API lỗi/thu hồi
quyền, số liệu đang lỗi không tiếp tục được hiển thị.

Trang Hỏi AI và lịch sử vẫn dùng các API NLQ dùng chung hiện có. Các trang mẫu
dành cho VIEWER không bị thay đổi.

Tổng quan hiển thị riêng `database_sync` (đã ghi DB, đang xử lý, bị chặn hoặc
lỗi) và trạng thái báo cáo tổng hợp Gold. Chi tiết dataset hiển thị
`database_sync_status` / `database_sync_error`. Nguồn có Gold nhưng DB chưa
SYNCED không được coi là đã có bản ghi chi tiết. API mới dùng `records.ts`,
đường dẫn `/manager/{domain}/record-types` và
`/manager/{domain}/records/{entity}[/{id}]`.

Cache dữ liệu manager được tách theo `context.user_id`; mỗi lần mở workspace đều
đọc lại context trước khi hiển thị để không dùng quyền/cache của tài khoản cũ.

Manager được xác định phòng trực tiếp từ role: HR_MANAGER → PNS,
ACADEMIC_MANAGER → PDT, ADMISSIONS_MANAGER → PTS; không yêu cầu liên kết nhân
viên hoặc assignment. `needs_department_configuration` chỉ báo thiếu/ngừng hoạt
động phòng trong danh mục. Không dùng `needs_department_assignment` để chặn
manager.
