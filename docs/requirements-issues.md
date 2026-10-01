# Requirements issues và trạng thái Human Review

## Resolved issues

Các quyết định RI-001 đến RI-024 đã được Human Review xác nhận và được phản ánh trong `requirements.md`, `user-stories.md` và `acceptance-criteria.md`.

| ID | Chủ đề | Trạng thái | Quyết định đã ghi nhận |
|---|---|---|---|
| RI-001 | Đăng ký | Resolved | Họ tên/email/mật khẩu/reader_type; loại student, teacher, staff, guest; email duy nhất; role=reader, card_status=active; mật khẩu tối thiểu 6; form công khai không tạo staff role. |
| RI-002 | Quản lý độc giả | Resolved | Admin quản lý Reader/Librarian; Librarian quản lý Reader; Reader chỉ dữ liệu mình; chặn xóa khi còn nghiệp vụ liên quan. |
| RI-003 | Quản lý sách | Resolved | Theo đầu sách; quantity/available; book_code duy nhất; giới hạn available; chặn xóa có loan chưa trả/reservation pending; quy định tìm/lọc. |
| RI-004 | Mượn | Resolved | Staff-only creation; Reader active; available>0; borrow_date hiện tại; due_date theo loan_period_days; không hạn mức loan đồng thời. |
| RI-005 | Trả | Resolved | Trạng thái borrowing/returned; overdue động; return_date hiện tại; tăng available; fine nếu trễ; không trả một phần. |
| RI-006 | Gia hạn | Resolved | Admin/Librarian; loan borrowing, chưa overdue; max_renewals; cộng renewal_days; chặn pending reservation của người khác. |
| RI-007 | Đặt trước | Resolved | available=0; một pending mỗi Reader/sách; trạng thái pending/fulfilled/cancelled; ưu tiên reserved_date; không tự hết hạn. |
| RI-008 | Fine | Resolved | VNĐ; công thức theo ngày trễ và fine_per_day; tạo lúc trả muộn; paid=false; staff đánh dấu thanh toán; Reader xem của mình; không miễn/chỉnh/trần. |
| RI-009 | Quyền AI | Resolved | Admin, Librarian, Reader đều dùng tra cứu, tóm tắt, gợi ý; Reader gợi ý từ lịch sử của mình. |
| RI-010 | AI tra cứu | Resolved | Câu hỏi tiếng Việt; pipeline đã xác nhận; chỉ dữ liệu truy xuất; không bịa; từ chối ngoài phạm vi; báo không tìm thấy; ưu tiên trường; không gửi toàn database. |
| RI-011 | AI tóm tắt | Resolved | Chỉ dữ liệu sách được chọn và metadata; tiếng Việt, khoảng 3–5 câu; thiếu dữ liệu thì thông báo; không bịa. |
| RI-012 | AI gợi ý | Resolved | Bắt buộc; lịch sử Reader ưu tiên thể loại/tác giả; không lịch sử dùng sách phổ biến; tối đa 5; chỉ sách trong database; báo không có kết quả. |
| RI-013 | Thống kê | Resolved | Tám thống kê; overdue theo borrowing và due_date < ngày hiện tại; xếp theo lượt mượn giảm dần; không giới hạn 50/100. |
| RI-014 | CSV | Resolved | Năm tập dữ liệu và cột xác định; UTF-8/header; ngày DD/MM/YYYY; VNĐ; quyền xem và filter hiện tại được áp dụng. |
| RI-015 | Settings | Resolved | Năm trường; chỉ Admin sửa; validation cụ thể cho từng trường. |
| RI-016 | Bảo mật | Resolved | Supabase Auth; không lưu mật khẩu thủ công; role, RLS, session, secrets, logging, stack trace và input validation đã xác định. |
| RI-017 | NFR | Resolved | Hiệu năng đồ án, AI loading, responsive, available không âm, lỗi, cấu trúc code/module, Chrome/Edge; không SLA production backup/availability. |
| RI-018 | Reader type | Resolved | Các giá trị hợp lệ: student, teacher, staff, guest. |
| RI-019 | Cột CSV | Resolved | Cột Books, Readers, Loans, Overdue loans, Fines được liệt kê trong FR-012. |
| RI-020 | Sách phổ biến | Resolved | Xác định theo tổng lượt mượn giảm dần. |
| RI-021 | Xếp hạng AI | Resolved | Tra cứu ưu tiên title, author, category, description keywords; tie-break lượt mượn; gợi ý dựa trên lịch sử hoặc sách phổ biến, tối đa 5. |
| RI-022 | Biên overdue | Resolved | Chỉ trễ khi current_date > due_date; số ngày lịch; ngày tiếp theo due_date là 1 ngày. |
| RI-023 | Validation Settings | Resolved | library_name không rỗng; loan_period_days nguyên ≥1; max_renewals nguyên ≥0; fine_per_day nguyên ≥0 VNĐ; renewal_days nguyên ≥1. |
| RI-024 | Quyền xuất CSV | Resolved | Admin xuất báo cáo/dữ liệu trong phạm vi quyền xem; Librarian xuất năm bộ Books, Readers, Loans, Overdue loans và Fines trong phạm vi dữ liệu được phép xem; Reader không có chức năng CSV. |

## Unresolved issues

Không còn unresolved issue nào được xác định từ yêu cầu khách hàng và các quyết định Human Review RI-001 đến RI-024 hiện có.


