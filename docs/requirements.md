# Đặc tả yêu cầu — Hệ thống quản lý thư viện

## 1. Mục đích và phạm vi

Tài liệu này cấu trúc hóa yêu cầu khách hàng và các quyết định Human Review RI-001 đến RI-023. Đây là đặc tả yêu cầu; không mô tả kiến trúc hay thiết kế cơ sở dữ liệu.

## 2. Bên liên quan và tác nhân

| Bên liên quan / tác nhân | Vai trò |
|---|---|
| Quản trị viên (Admin) | Quản lý sách, độc giả, mượn trả, đặt trước, settings; xem thống kê/báo cáo, xuất dữ liệu, dùng AI. |
| Thủ thư (Librarian) | Quản lý sách và Reader; tạo loan, xác nhận trả, gia hạn, quản lý đặt trước; xem thống kê/báo cáo, xuất dữ liệu theo quyền, dùng AI. |
| Độc giả (Reader) | Đăng ký/đăng nhập; xem/tìm sách, thông tin mượn và fine của mình; đặt trước; dùng AI. |
| Dịch vụ AI (Gemini) | Xử lý yêu cầu AI theo dữ liệu sách được truy xuất và context đã xây dựng. |

## 3. Yêu cầu chức năng

| ID | Yêu cầu | User Story |
|---|---|---|
| FR-001 | Authentication dùng Supabase Auth. Reader tự đăng ký bằng họ tên, email, mật khẩu, reader_type; reader_type chỉ nhận student, teacher, staff, guest. Email duy nhất; mật khẩu tối thiểu 6 ký tự. Đăng ký công khai tạo role=reader, card_status=active; không tạo Admin/Librarian. Không lưu mật khẩu thủ công trong database ứng dụng. | US-001, US-002 |
| FR-002 | Hệ thống phân quyền Admin, Librarian, Reader: Admin quản lý Reader/Librarian (xem, tìm, sửa, khóa/mở khóa); Librarian chỉ quản lý Reader; Reader chỉ xem dữ liệu cá nhân của mình. Chỉ Admin/Librarian tạo loan, gia hạn, và cập nhật trạng thái đặt trước; Admin/Librarian đánh dấu fine đã thanh toán; chỉ Admin sửa Settings. Cả ba vai trò dùng các chức năng AI. | US-003–US-005, US-008, US-010, US-012, US-016–US-019 |
| FR-003 | Admin/Librarian có thể thêm, sửa, xóa, tìm sách. Quản lý theo đầu sách, không quản lý từng bản copy. Thông tin: book_code, title, author, category, publisher, publish_year, ISBN, quantity (tổng bản), available (bản có thể mượn), description. book_code duy nhất; 0 ≤ available ≤ quantity. Tìm theo title/author/book_code; lọc category và tình trạng còn/hết. Không xóa sách đang có loan chưa trả hoặc reservation pending. | US-006, US-007 |
| FR-004 | Admin xem/tìm/sửa/khóa-mở khóa Reader và Librarian; Librarian chỉ quản lý Reader. Không xóa tài khoản còn dữ liệu nghiệp vụ liên quan. Reader chỉ xem dữ liệu cá nhân của mình. | US-003–US-005 |
| FR-005 | Chỉ Admin/Librarian được tạo loan. Reader phải có card_status=active và sách phải available>0. Mỗi loan đại diện một đầu sách; không giới hạn tổng số sách mượn đồng thời trong phiên bản đồ án. | US-008 |
| FR-006 | Khi mượn thành công, borrow_date là ngày hiện tại; due_date = borrow_date + settings.loan_period_days; available giảm 1. | US-008 |
| FR-007 | Loan có trạng thái lưu chính borrowing hoặc returned. Overdue được xác định động khi status=borrowing và current_date > due_date. Khi trả: return_date là ngày hiện tại, status=returned, available tăng 1. Không hỗ trợ trả một phần. Trả đúng due_date không quá hạn. days_overdue là số ngày lịch giữa due_date và return_date/current_date; trả vào ngày sau due_date tương ứng 1 ngày. Trả quá hạn tạo fine. | US-009, US-010 |
| FR-008 | Chỉ Admin/Librarian được gia hạn loan đang borrowing, chưa overdue, chưa đạt settings.max_renewals và không có reservation pending của Reader khác. Mỗi lần gia hạn tăng due_date thêm settings.renewal_days. | US-011 |
| FR-009 | Reader chỉ được đặt trước khi available=0 và không được có nhiều reservation pending cho cùng sách. Reservation mới có trạng thái pending. Khi Reader nhận sách và loan được tạo, reservation chuyển fulfilled. Reader hoặc Staff có thể hủy, khi đó trạng thái cancelled. Ưu tiên xử lý theo reserved_date tăng dần. Không triển khai tự động hết hạn giữ sách. | US-012, US-013 |
| FR-010 | Fine tính bằng VNĐ: amount = days_overdue × settings.fine_per_day. Tạo fine khi trả quá hạn; paid mặc định false. Admin/Librarian có thể đánh dấu đã thanh toán. Reader chỉ xem fine của mình. Phiên bản hiện tại không có miễn phạt, điều chỉnh thủ công hoặc mức phạt tối đa. | US-010, US-014 |
| FR-011 | Admin/Librarian xem thống kê: tổng số đầu sách, tổng số độc giả, số loan đang mượn, số loan quá hạn, sách được mượn nhiều nhất, độc giả có nhiều lượt mượn nhất, tổng fine chưa thanh toán, phân bố sách theo thể loại. Overdue = borrowing và due_date < ngày hiện tại. Xếp hạng lượt mượn theo tổng lượt giảm dần; không giới hạn thống kê ở 50 hoặc 100 record. Sách phổ biến được xác định theo tổng lượt mượn giảm dần. | US-015 |
| FR-012 | Admin được xuất báo cáo/dữ liệu trong phạm vi quyền xem. Librarian được xuất Books (book_code, title, author, category, publisher, publish_year, isbn, quantity, available), Readers (full_name, email, phone, reader_type, card_status, address, created_at), Loans (reader, book, borrow_date, due_date, return_date, status, renewed_count, note), Overdue loans (reader, book, borrow_date, due_date, days_overdue, estimated_fine) và Fines (reader, book, days_overdue, amount, paid, created_at), trong phạm vi dữ liệu nghiệp vụ được phép xem. Reader không có chức năng xuất CSV. CSV dùng UTF-8, có header; ngày DD/MM/YYYY, tiền VNĐ. Filter hiện tại được áp dụng cho dữ liệu xuất. | US-016, US-023 |
| FR-013 | Settings gồm library_name, loan_period_days, max_renewals, fine_per_day, renewal_days; chỉ Admin được sửa. Validation: library_name không rỗng; loan_period_days số nguyên ≥1; max_renewals số nguyên ≥0; fine_per_day số nguyên ≥0, đơn vị VNĐ; renewal_days số nguyên ≥1. | US-017 |
| FR-014 | Admin, Librarian và Reader đều có thể tra cứu sách bằng câu hỏi tiếng Việt tự nhiên. Luồng: Question → Question Analyzer → Structured Intent → Book Retriever → Context Builder → Prompt Builder → Gemini → Answer. Chỉ dùng dữ liệu sách được truy xuất từ database; không bịa tên sách/tác giả; không gửi toàn bộ database vào context. Câu hỏi ngoài phạm vi tra cứu sách phải bị từ chối phù hợp; không có kết quả phù hợp thì thông báo rõ. Ưu tiên theo thứ tự tên sách, tác giả, thể loại, từ khóa mô tả; nếu mức phù hợp bằng nhau, ưu tiên sách có nhiều lượt mượn hơn. | US-018 |
| FR-015 | Admin, Librarian và Reader có thể chọn sách để yêu cầu tóm tắt. Chỉ dùng dữ liệu sách được chọn, gồm title, author, category, description và metadata liên quan. Trả lời tiếng Việt, mặc định khoảng 3–5 câu. Nếu dữ liệu không đủ, thông báo không đủ dữ liệu để tóm tắt; không tự thêm nội dung không có căn cứ. | US-019 |
| FR-016 | AI gợi ý sách là chức năng bắt buộc cho Admin, Librarian và Reader; chỉ gợi ý sách có trong database, tối đa 5 kết quả. Với Reader có lịch sử, ưu tiên thể loại và tác giả đã từng mượn; với Reader chưa có lịch sử, dùng sách phổ biến. Không có sách phù hợp thì thông báo rõ. Admin/Librarian không tự ý dùng lịch sử mượn riêng của Reader khác. | US-020 |
| FR-017 | RLS được bật trên các bảng nghiệp vụ; Reader chỉ xem dữ liệu của mình. Backend không tin role hoặc readerId frontend gửi nếu có thể xác định từ session. Input phải được validate. Client không nhận stack trace chi tiết. AI API key không xuất hiện ở frontend hoặc log; secrets lưu bằng environment variable hoặc Supabase secret. | US-002–US-005, US-018–US-022 |

## 4. Yêu cầu phi chức năng

| ID | Yêu cầu | User Story |
|---|---|---|
| NFR-001 | CRUD thông thường phản hồi trong khoảng vài giây trong môi trường đồ án. | US-021 |
| NFR-002 | AI hiển thị loading state trong lúc chờ. | US-018–US-020, US-021 |
| NFR-003 | Giao diện dùng được trên desktop và responsive cơ bản cho màn hình nhỏ. | US-021 |
| NFR-004 | Nghiệp vụ mượn/trả không được làm available âm. | US-008–US-010 |
| NFR-005 | Lỗi được hiển thị bằng thông báo phù hợp; không trả stack trace chi tiết cho client. | US-021, US-022 |
| NFR-006 | Code tách rõ component/page/lib/context. | US-022 |
| NFR-007 | Phần xử lý AI backend tách Question Analyzer, Retriever, Context Builder, Prompt Builder và Gemini Service. | US-018–US-020, US-022 |
| NFR-008 | Hỗ trợ trình duyệt hiện đại như Chrome và Edge. | US-021 |
| NFR-009 | Không đặt SLA production cụ thể cho backup/availability trong phạm vi đồ án. | US-022 |
| NFR-010 | API key không nằm ở frontend, không được ghi log; secrets dùng environment variable hoặc Supabase secret. | US-022 |

## 5. Quy tắc nghiệp vụ

- BR-001: Đăng ký công khai chỉ tạo Reader active; email duy nhất; reader_type thuộc student/teacher/staff/guest; mật khẩu tối thiểu 6 ký tự.
- BR-002: book_code duy nhất; available nằm trong khoảng từ 0 đến quantity; không xóa sách có loan chưa trả hoặc reservation pending.
- BR-003: Chỉ Reader active mượn sách có available>0; ngày mượn là ngày hiện tại; hạn trả theo loan_period_days; mỗi loan là một đầu sách.
- BR-004: Overdue chỉ khi current_date > due_date; trả đúng due_date không bị trễ; ngày kế tiếp tính 1 ngày.
- BR-005: Gia hạn tuân theo max_renewals, renewal_days và các điều kiện FR-008.
- BR-006: Đặt trước chỉ khi available=0; một pending cho mỗi Reader/sách; xử lý theo reserved_date tăng dần.
- BR-007: Fine = ngày quá hạn × fine_per_day, tạo khi trả trễ, paid ban đầu false.
- BR-008: Sách phổ biến và xếp hạng mượn dựa trên tổng lượt mượn giảm dần.
- BR-009: AI chỉ trả về sách có trong database và chỉ sử dụng lịch sử mượn của Reader tương ứng theo quyền đã xác nhận.

## 6. Giả định

- Các tên Admin, Librarian, Reader tương ứng Quản trị viên, Thủ thư, Độc giả.
- Không bổ sung business rule ngoài tài liệu yêu cầu và quyết định Human Review.

## 7. Traceability

Mỗi FR/NFR tham chiếu User Story; mỗi User Story tham chiếu tiêu chí AC. Xem `user-stories.md` và `acceptance-criteria.md`.



