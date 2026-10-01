# Customer Requirement

Xây dựng hệ thống quản lý thư viện có tích hợp trí tuệ nhân tạo.

Hệ thống có ba nhóm người dùng:

## 1. Quản trị viên

Quản trị viên có thể:

- Đăng nhập vào hệ thống.
- Quản lý sách.
- Quản lý độc giả.
- Quản lý phiếu mượn và trả sách.
- Quản lý đặt trước sách.
- Xem thống kê.
- Xem báo cáo và xuất dữ liệu.
- Quản lý cài đặt hệ thống.
- Sử dụng các chức năng AI.

## 2. Thủ thư

Thủ thư có thể:

- Đăng nhập vào hệ thống.
- Quản lý sách.
- Quản lý độc giả.
- Tạo phiếu mượn sách.
- Xác nhận trả sách.
- Gia hạn sách.
- Quản lý đặt trước sách.
- Xem thống kê.
- Xem báo cáo.
- Sử dụng các chức năng AI.

## 3. Độc giả

Độc giả có thể:

- Đăng nhập hoặc đăng ký tài khoản.
- Xem và tìm kiếm sách.
- Xem thông tin mượn sách của bản thân.
- Đặt trước sách.
- Xem tiền phạt của bản thân.
- Sử dụng AI để tra cứu sách.
- Sử dụng AI để tóm tắt sách.
- Nhận gợi ý sách từ AI.

## 4. Quản lý sách

Mỗi sách có các thông tin:

- Mã sách.
- Tên sách.
- Tác giả.
- Thể loại.
- Nhà xuất bản.
- Năm xuất bản.
- ISBN.
- Số lượng.
- Số lượng còn lại.
- Mô tả.

Quản trị viên và thủ thư có thể thêm, sửa, xóa và tìm kiếm sách.

## 5. Quản lý mượn trả

Thủ thư có thể tạo phiếu mượn sách cho độc giả.

Khi mượn sách:

- Sách phải còn ít nhất một bản.
- Số lượng sách còn lại phải giảm tương ứng.
- Hệ thống phải lưu ngày mượn và hạn trả.

Khi trả sách:

- Hệ thống cập nhật trạng thái phiếu mượn.
- Số lượng sách còn lại tăng lại.
- Nếu trả quá hạn, hệ thống phải tính tiền phạt.

Hệ thống hỗ trợ gia hạn sách theo quy định cấu hình.

## 6. Đặt trước sách

Độc giả có thể đặt trước sách khi sách không còn bản khả dụng.

Thủ thư có thể cập nhật trạng thái đặt trước.

## 7. Tiền phạt

Tiền phạt được tính dựa trên:

- Số ngày quá hạn.
- Mức tiền phạt mỗi ngày trong cài đặt hệ thống.

Hệ thống phải lưu thông tin tiền phạt và trạng thái thanh toán.

## 8. Thống kê và báo cáo

Hệ thống có thể thống kê:

- Tổng số sách.
- Tổng số độc giả.
- Số phiếu đang mượn.
- Số phiếu quá hạn.
- Sách được mượn nhiều.
- Độc giả có nhiều lượt mượn.
- Tiền phạt chưa thanh toán.

Hệ thống hỗ trợ xuất một số dữ liệu ra file CSV.

## 9. Chức năng AI

Hệ thống phải có AI hỗ trợ người dùng.

### AI tra cứu sách

Người dùng có thể đặt câu hỏi bằng ngôn ngữ tự nhiên.

Ví dụ:

- Có sách nào về trí tuệ nhân tạo không?
- Tôi muốn tìm sách công nghệ cho người mới bắt đầu.
- Có sách nào của tác giả X không?

AI phải sử dụng dữ liệu sách có trong cơ sở dữ liệu.

AI không được tự tạo ra sách không tồn tại trong thư viện.

Nếu không có sách phù hợp, AI phải thông báo không tìm thấy.

### AI tóm tắt sách

Người dùng có thể chọn một sách và yêu cầu AI tạo bản tóm tắt dựa trên thông tin và mô tả hiện có của sách.

AI không được tự tạo nội dung không có căn cứ từ dữ liệu sách.

### AI gợi ý sách

AI có thể gợi ý sách dựa trên:

- Thể loại.
- Tác giả.
- Lịch sử mượn sách của độc giả.
- Dữ liệu sách hiện có trong thư viện.

AI không được gợi ý sách không tồn tại trong cơ sở dữ liệu.

## 10. Yêu cầu bảo mật

- Người dùng phải đăng nhập để sử dụng các chức năng yêu cầu xác thực.
- Hệ thống phải phân quyền giữa Admin, Librarian và Reader.
- Độc giả chỉ được xem dữ liệu cá nhân của mình.
- API key của dịch vụ AI không được xuất hiện trong mã nguồn frontend.
- Các thông tin bí mật phải được lưu bằng biến môi trường.