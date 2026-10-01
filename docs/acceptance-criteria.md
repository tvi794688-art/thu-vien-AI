# Acceptance criteria

Mỗi tiêu chí tham chiếu User Story; story tham chiếu FR/NFR trong `requirements.md`.

## US-001 — Đăng ký độc giả (FR-001)
- AC-001.1: Form đăng ký nhận họ tên, email, mật khẩu và reader_type.
- AC-001.2: Chỉ student, teacher, staff, guest là reader_type hợp lệ.
- AC-001.3: Email đã đăng ký không thể dùng tạo tài khoản khác.
- AC-001.4: Mật khẩu dưới 6 ký tự bị từ chối.
- AC-001.5: Đăng ký hợp lệ tạo role=reader, card_status=active; form công khai không tạo role Admin/Librarian.

## US-002 — Đăng nhập và bảo vệ session (FR-001, FR-002, FR-017)
- AC-002.1: Authentication được thực hiện qua Supabase Auth; mật khẩu không được lưu thủ công trong application database.
- AC-002.2: Chức năng yêu cầu xác thực không sử dụng được khi chưa đăng nhập.
- AC-002.3: Backend dùng danh tính/role từ session khi có thể và không tin role/readerId do frontend gửi.

## US-003 — Quản lý tài khoản bởi Admin (FR-002, FR-004)
- AC-003.1: Admin có thể xem, tìm kiếm, sửa, khóa và mở khóa Reader và Librarian.
- AC-003.2: Không xóa tài khoản còn dữ liệu nghiệp vụ liên quan.

## US-004 — Quản lý Reader bởi Librarian (FR-002, FR-004)
- AC-004.1: Librarian có thể quản lý Reader, nhưng không quản lý tài khoản Librarian.

## US-005 — Quyền xem dữ liệu Reader (FR-002, FR-004, FR-017)
- AC-005.1: Reader chỉ xem được dữ liệu cá nhân, loan và fine của chính mình.
- AC-005.2: RLS được bật trên bảng nghiệp vụ và chặn Reader xem dữ liệu Reader khác.

## US-006 — Quản lý sách (FR-003)
- AC-006.1: Admin/Librarian có thể thêm, sửa, xóa và tìm sách theo đầu sách.
- AC-006.2: book_code trùng bị từ chối; available < 0 hoặc available > quantity bị từ chối.
- AC-006.3: Có thể tìm theo title, author, book_code và lọc category, còn/hết.
- AC-006.4: Xóa sách bị chặn khi có loan chưa trả hoặc reservation pending.

## US-007 — Tìm sách (FR-003)
- AC-007.1: Reader có thể tìm theo title, author, book_code và lọc category/tình trạng còn/hết.

## US-008 — Tạo loan (FR-005, FR-006, NFR-004)
- AC-008.1: Chỉ Admin/Librarian tạo loan.
- AC-008.2: Tạo loan bị từ chối nếu Reader không active hoặc available không lớn hơn 0.
- AC-008.3: Loan thành công có borrow_date là ngày hiện tại và due_date bằng borrow_date + loan_period_days.
- AC-008.4: available giảm đúng 1; kết quả không bao giờ âm.
- AC-008.5: Không áp dụng giới hạn tổng số loan đồng thời; một loan đại diện một đầu sách.

## US-009 — Trả loan (FR-007, NFR-004)
- AC-009.1: Khi trả, return_date là ngày hiện tại, status=returned và available tăng đúng 1.
- AC-009.2: Không hỗ trợ trả một phần loan.
- AC-009.3: Trả đúng due_date không được xác định overdue; ngày hiện tại chỉ sau due_date mới overdue.
- AC-009.4: available không được âm trong nghiệp vụ trả/mượn.

## US-010 — Overdue và fine (FR-007, FR-010)
- AC-010.1: Loan overdue khi status=borrowing và current_date > due_date.
- AC-010.2: days_overdue là số ngày lịch giữa due_date và return_date/current_date; trả ngày kế tiếp due_date cho kết quả 1.
- AC-010.3: Trả quá hạn tạo fine có amount = days_overdue × fine_per_day, đơn vị VNĐ, paid=false.
- AC-010.4: Trả đúng hạn không tạo fine quá hạn.
- AC-010.5: Không áp dụng miễn phạt, điều chỉnh thủ công hoặc mức phạt tối đa trong phiên bản này.

## US-011 — Gia hạn (FR-008)
- AC-011.1: Chỉ Admin/Librarian được gia hạn loan borrowing.
- AC-011.2: Từ chối gia hạn loan returned, overdue, đã đạt max_renewals hoặc có reservation pending của Reader khác.
- AC-011.3: Gia hạn hợp lệ cộng renewal_days vào due_date và tăng số lần gia hạn tương ứng.

## US-012 — Tạo reservation (FR-009)
- AC-012.1: Reader chỉ đặt trước khi available=0.
- AC-012.2: Không cho tạo reservation pending thứ hai cho cùng Reader và sách.
- AC-012.3: Reservation mới có status=pending.

## US-013 — Cập nhật/hủy reservation (FR-002, FR-009)
- AC-013.1: Reader hoặc Staff có thể hủy; trạng thái sau hủy là cancelled.
- AC-013.2: Khi Reader nhận sách và loan được tạo, reservation chuyển fulfilled.
- AC-013.3: Thứ tự xử lý pending theo reserved_date sớm trước.
- AC-013.4: Không tự động hết hạn giữ sách.

## US-014 — Fine và thanh toán (FR-010, FR-017)
- AC-014.1: Reader chỉ xem fine của mình.
- AC-014.2: Admin/Librarian có thể đánh dấu fine đã thanh toán; trạng thái ban đầu false.

## US-015 — Thống kê (FR-011)
- AC-015.1: Có tổng đầu sách, tổng độc giả, loan đang mượn, loan overdue, sách mượn nhiều nhất, độc giả nhiều lượt mượn nhất, tổng fine chưa thanh toán và phân bố sách theo thể loại.
- AC-015.2: Overdue dùng status=borrowing và due_date < ngày hiện tại.
- AC-015.3: Xếp hạng theo tổng lượt mượn giảm dần; không giới hạn ở 50 hoặc 100 record.
- AC-015.4: Sách phổ biến được xếp theo tổng lượt mượn giảm dần.

## US-016 — Admin xuất CSV (FR-012)
- AC-016.1: Admin có thể xuất báo cáo/dữ liệu trong phạm vi quyền xem.

## US-023 — Librarian xuất CSV (FR-012)
- AC-023.1: Librarian có thể xuất Books: book_code, title, author, category, publisher, publish_year, isbn, quantity, available.
- AC-023.2: Librarian có thể xuất Readers: full_name, email, phone, reader_type, card_status, address, created_at.
- AC-023.3: Librarian có thể xuất Loans: reader, book, borrow_date, due_date, return_date, status, renewed_count, note.
- AC-023.4: Librarian có thể xuất Overdue loans: reader, book, borrow_date, due_date, days_overdue, estimated_fine.
- AC-023.5: Librarian có thể xuất Fines: reader, book, days_overdue, amount, paid, created_at.
- AC-023.6: Reader không có chức năng xuất CSV.
- AC-023.7: CSV UTF-8 có header; ngày DD/MM/YYYY; tiền VNĐ.
- AC-023.8: Chỉ dữ liệu trong quyền xem/nghiệp vụ của vai trò được xuất; filter hiện tại áp dụng cho dữ liệu xuất.

## US-017 — Settings (FR-013)
- AC-017.1: Chỉ Admin sửa Settings.
- AC-017.2: Settings có library_name, loan_period_days, max_renewals, fine_per_day, renewal_days.
- AC-017.3: Từ chối library_name rỗng; loan_period_days không nguyên hoặc <1; max_renewals không nguyên hoặc <0; fine_per_day không nguyên hoặc <0; renewal_days không nguyên hoặc <1.
- AC-017.4: fine_per_day được biểu diễn bằng VNĐ.

## US-018 — AI tra cứu sách (FR-014, NFR-002, NFR-007)
- AC-018.1: Cả Admin, Librarian, Reader gửi được câu hỏi tiếng Việt tự nhiên.
- AC-018.2: Luồng xử lý lần lượt Question, Question Analyzer, Structured Intent, Book Retriever, Context Builder, Prompt Builder, Gemini, Answer.
- AC-018.3: Chỉ dùng sách truy xuất từ database; không gửi toàn bộ database vào context; không bịa tên sách/tác giả.
- AC-018.4: Câu ngoài phạm vi tra cứu sách bị từ chối phù hợp; không có kết quả phù hợp thì thông báo rõ.
- AC-018.5: Ưu tiên khớp tên sách, tác giả, thể loại, từ khóa mô tả theo thứ tự; nếu mức phù hợp bằng nhau, sách có nhiều lượt mượn xếp trước.
- AC-018.6: Trong khi chờ phản hồi AI, giao diện hiển thị loading state.

## US-019 — AI tóm tắt (FR-015, NFR-002, NFR-007)
- AC-019.1: Cả ba vai trò có thể yêu cầu tóm tắt sách được chọn.
- AC-019.2: Chỉ dùng title, author, category, description và metadata liên quan của sách đó.
- AC-019.3: Trả lời tiếng Việt, mặc định khoảng 3–5 câu; thiếu dữ liệu thì thông báo không đủ dữ liệu để tóm tắt.
- AC-019.4: Không thêm nội dung không có căn cứ; có loading state khi chờ.

## US-020 — AI gợi ý (FR-016, NFR-002, NFR-007)
- AC-020.1: Cả ba vai trò có thể yêu cầu gợi ý; tối đa 5 sách và mọi sách đều tồn tại trong database.
- AC-020.2: Reader có lịch sử: ưu tiên thể loại và tác giả đã từng mượn.
- AC-020.3: Reader không có lịch sử: gợi ý theo sách phổ biến (tổng lượt mượn giảm dần).
- AC-020.4: Không có sách phù hợp thì thông báo rõ.
- AC-020.5: Admin/Librarian không dùng lịch sử riêng của Reader khác; có loading state khi chờ.

## US-021 — Trải nghiệm và tương thích (NFR-001, NFR-003, NFR-005, NFR-008)
- AC-021.1: CRUD thông thường phản hồi trong khoảng vài giây trong môi trường đồ án.
- AC-021.2: Giao diện dùng được trên desktop và responsive cơ bản ở màn hình nhỏ.
- AC-021.3: Lỗi hiển thị thông báo phù hợp; client không nhận stack trace chi tiết.
- AC-021.4: Hỗ trợ Chrome và Edge hiện đại.

## US-022 — Bảo mật và cấu trúc code (FR-017, NFR-006, NFR-009, NFR-010)
- AC-022.1: RLS bật trên các bảng nghiệp vụ; Reader chỉ đọc dữ liệu của mình.
- AC-022.2: Input được validate; backend xác định session/role thay vì tin role hoặc readerId từ frontend khi có thể.
- AC-022.3: AI API key không ở frontend và không xuất hiện trong log; secrets lưu bằng environment variable hoặc Supabase secret.
- AC-022.4: Code tách component/page/lib/context; backend AI tách các module đã nêu ở NFR-007.
- AC-022.5: Không đặt SLA production cụ thể cho backup/availability trong phạm vi đồ án.

