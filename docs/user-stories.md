# User stories

Mỗi story liên kết tới FR/NFR trong `requirements.md`; tiêu chí tương ứng được ghi trong `acceptance-criteria.md`.

| ID | User story | Requirement |
|---|---|---|
| US-001 | Là độc giả, tôi muốn tự đăng ký bằng thông tin của mình để tạo tài khoản thư viện. | FR-001 |
| US-002 | Là người dùng, tôi muốn đăng nhập an toàn để sử dụng chức năng theo vai trò. | FR-001, FR-002, FR-017 |
| US-003 | Là Admin, tôi muốn quản lý Reader và Librarian để duy trì tài khoản và quyền truy cập. | FR-002, FR-004, FR-017 |
| US-004 | Là Librarian, tôi muốn quản lý Reader để hỗ trợ hoạt động thư viện. | FR-002, FR-004, FR-017 |
| US-005 | Là Reader, tôi muốn chỉ xem thông tin cá nhân của mình để bảo vệ dữ liệu riêng tư. | FR-002, FR-004, FR-017 |
| US-006 | Là Admin/Librarian, tôi muốn thêm, sửa, xóa và tìm sách theo đầu sách để quản lý danh mục. | FR-003 |
| US-007 | Là Reader, tôi muốn tìm và lọc sách theo tên, tác giả, mã, thể loại và tình trạng còn/hết để tìm sách cần đọc. | FR-003 |
| US-008 | Là Admin/Librarian, tôi muốn tạo loan cho Reader đủ điều kiện để ghi nhận việc mượn. | FR-005, FR-006, NFR-004 |
| US-009 | Là Admin/Librarian, tôi muốn xác nhận trả loan để cập nhật hạn mượn và số lượng sách. | FR-007, NFR-004 |
| US-010 | Là Admin/Librarian, tôi muốn hệ thống tính overdue và fine đúng quy tắc để ghi nhận khoản phạt. | FR-007, FR-010, NFR-004 |
| US-011 | Là Admin/Librarian, tôi muốn gia hạn loan đủ điều kiện để cập nhật due date. | FR-008 |
| US-012 | Là Reader, tôi muốn đặt trước sách hết bản khả dụng để ghi nhận nhu cầu. | FR-009 |
| US-013 | Là Reader/Staff, tôi muốn hủy reservation và Staff muốn cập nhật trạng thái để quản lý yêu cầu đặt trước. | FR-002, FR-009 |
| US-014 | Là Reader, tôi muốn xem fine của mình; là Admin/Librarian, tôi muốn đánh dấu fine đã thanh toán. | FR-002, FR-010, FR-017 |
| US-015 | Là Admin/Librarian, tôi muốn xem thống kê thư viện được xếp hạng đầy đủ để theo dõi hoạt động. | FR-011 |
| US-016 | Là Admin, tôi muốn xuất báo cáo/dữ liệu CSV trong phạm vi quyền xem để sử dụng báo cáo. | FR-012 |
| US-023 | Là Librarian, tôi muốn xuất Books, Readers, Loans, Overdue loans và Fines trong phạm vi dữ liệu nghiệp vụ được phép xem để hỗ trợ công việc thư viện. | FR-012 |
| US-017 | Là Admin, tôi muốn sửa Settings hợp lệ để cấu hình mượn, gia hạn và tiền phạt. | FR-013 |
| US-018 | Là Admin/Librarian/Reader, tôi muốn tra cứu sách bằng câu hỏi tiếng Việt để tìm sách thư viện phù hợp. | FR-014, NFR-002, NFR-007 |
| US-019 | Là Admin/Librarian/Reader, tôi muốn tóm tắt một sách dựa trên dữ liệu hiện có để nắm thông tin sách. | FR-015, NFR-002, NFR-007 |
| US-020 | Là Admin/Librarian/Reader, tôi muốn nhận tối đa 5 gợi ý sách phù hợp để khám phá danh mục thư viện. | FR-016, NFR-002, NFR-007 |
| US-021 | Là người dùng, tôi muốn giao diện responsive, phản hồi nhanh và báo lỗi dễ hiểu trên trình duyệt được hỗ trợ. | NFR-001, NFR-003, NFR-005, NFR-008 |
| US-022 | Là người vận hành hệ thống, tôi muốn bảo vệ secrets/dữ liệu và tách rõ các phần code để hệ thống an toàn, dễ bảo trì. | FR-017, NFR-006, NFR-009, NFR-010 |

## Ghi chú vai trò

“Staff” trong thao tác hủy reservation bao gồm Admin/Librarian được phân quyền thao tác; các quyền khác được nêu cụ thể trong yêu cầu. Reader không được sử dụng lịch sử mượn của Reader khác.


