# HỆ THỐNG QUẢN LÝ THƯ VIỆN THÔNG MINH TÍCH HỢP AI (SMARTLIB AI)

> **Hệ thống Quản lý Thư viện Số hiện đại** kết hợp công nghệ cơ sở dữ liệu đám mây **Supabase (PostgreSQL + RLS)** và trí tuệ nhân tạo **Google Gemini AI (LLM + pgvector Semantic Search)**, cung cấp giải pháp chuyển đổi số toàn diện cho công tác quản trị thư viện và trải nghiệm bạn đọc.

---

## MỤC LỤC

1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Mục tiêu xây dựng](#2-mục-tiêu-xây-dựng)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Các chức năng chính theo vai trò](#5-các-chức-năng-chính-theo-vai-trò)
6. [Chức năng tích hợp Trí tuệ nhân tạo (AI Engine)](#6-chức-năng-tích-hợp-trí-tuệ-nhân-tạo-ai-engine)
7. [Cấu trúc thư mục dự án](#7-cấu-trúc-thư-mục-dự-án)
8. [Yêu cầu môi trường](#8-yêu-cầu-môi-trường)
9. [Hướng dẫn cài đặt và cấu hình](#9-hướng-dẫn-cài-đặt-và-cấu-hình)
10. [Hướng dẫn khởi chạy và sử dụng phần mềm](#10-hướng-dẫn-khởi-chạy-và-sử-dụng-phần-mềm)
11. [Tình trạng thực tế và Lưu ý kiểm chứng](#11-tình-trạng-thực-tế-và-lưu-ý-kiểm-chứng)

---

## 1. GIỚI THIỆU TỔNG QUAN

**SmartLib AI** là ứng dụng web quản lý thư viện thông minh được xây dựng nhằm tin học hóa và tối ưu hóa toàn diện mọi nghiệp vụ thư viện truyền thống: từ lập danh mục sách, quản lý thẻ bạn đọc, theo dõi lưu thông mượn - trả, bảo vệ quyền ưu tiên đặt trước (FIFO queue), tự động tính toán và thu nợ phí quá hạn, đến kết xuất báo cáo thống kê chuyên nghiệp.

Điểm đột phá của dự án là việc ứng dụng kiến trúc **RAG (Retrieval-Augmented Generation)** kết hợp cùng mô hình **Google Gemini 3.5 Flash** và cơ chế tìm kiếm ngữ nghĩa vector 768 chiều (**pgvector**). Hệ thống đóng vai trò như một **"Thủ thư số AI 24/7"**, cho phép người dùng trò chuyện tự nhiên để tìm kiếm đầu sách theo nhu cầu thực tế, tóm tắt nhanh nội dung sách cốt lõi và nhận các gợi ý đọc sách cá nhân hóa dựa trên lịch sử đọc cá nhân.

---

## 2. MỤC TIÊU XÂY DỰNG

- **Tự động hóa nghiệp vụ lưu thông:** Loại bỏ sổ sách giấy truyền thống; kiểm soát chính xác từng lượt mượn, hạn trả và số lượng tồn kho khả dụng theo thời gian thực.
- **Bảo toàn tính nhất quán và toàn vẹn dữ liệu (Data Integrity):** Ngăn chặn triệt để hiện tượng số lượng sách tồn kho bị âm (`available < 0`), xử lý cạnh tranh (concurrency control) thông qua giao dịch cơ sở dữ liệu `FOR UPDATE`.
- **Bảo mật và phân quyền nghiêm ngặt (RBAC & RLS):** Đảm bảo quyền riêng tư tuyệt đối cho độc giả (độc giả chỉ xem được dữ liệu mượn/trả/phạt của chính mình); bảo vệ ranh giới xử lý ở tầng cơ sở dữ liệu (Database level) thay vì chỉ ẩn nút bấm ở giao diện.
- **Nâng cao trải nghiệm độc giả bằng Trí tuệ nhân tạo:** Cung cấp công cụ tìm kiếm ngữ nghĩa thông minh, loại bỏ rào cản tìm kiếm từ khóa cứng nhắc, giúp người đọc nhanh chóng tiếp cận nguồn tri thức phù hợp.
- **Kiểm soát ảo giác AI (Anti-Hallucination):** Ràng buộc AI chỉ được phép cung cấp thông tin dựa trên cơ sở dữ liệu sách có thật tại thư viện, tuyệt đối không bịa đặt tên sách, tác giả hay tình trạng khả dụng.

---

## 3. CÔNG NGHỆ SỬ DỤNG

### 3.1. Giao diện người dùng (Frontend)
- **React 18.3.1:** Thư viện xây dựng giao diện người dùng theo kiến trúc component, SPA (Single Page Application).
- **TypeScript 5.5.3:** Đảm bảo tính chặt chẽ về mặt dữ liệu, an toàn kiểu (type-safety) xuyên suốt dự án.
- **Vite 5.4.2:** Công cụ đóng gói (bundler) và phát triển ứng dụng tốc độ cao với Hot Module Replacement (HMR).
- **Tailwind CSS 3.4.1:** Thiết kế hệ thống giao diện tinh tế, hiện đại với bảng màu ấm áp (*Cream, Butter, Ivory, Sage, Terracotta, Charcoal*).
- **Lucide React 0.344.0:** Bộ biểu tượng vector chuẩn hóa, trực quan.

### 3.2. Cơ sở dữ liệu & Nền tảng phụ trợ (Backend as a Service)
- **Supabase Cloud / PostgreSQL 15+:** Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ, đóng vai trò là "Nguồn chân lý" (Single Source of Truth).
- **Row Level Security (RLS):** Cơ chế bảo mật phân quyền đa tầng tại cấp độ từng dòng dữ liệu trong PostgreSQL.
- **PL/pgSQL Functions & Stored Procedures (RPC):** Thực thi các nghiệp vụ phối hợp phức tạp trong một giao dịch ACID nguyên tử (`borrow_book`, `return_book`, `renew_loan`, `create_reservation`, `cancel_reservation`, `fulfill_reservation`, `mark_fine_paid`, `remove_book`, `match_books`, `get_popular_books`).
- **Supabase Auth:** Hệ thống xác thực danh tính người dùng an toàn qua JSON Web Token (JWT), hỗ trợ đăng ký, đăng nhập và đặt lại mật khẩu qua email.

### 3.3. Trí tuệ nhân tạo & Xử lý ngôn ngữ tự nhiên (AI & Vector Search)
- **Google Gemini API (`gemini-3.5-flash`):** Mô hình ngôn ngữ lớn (LLM) tốc độ cao phục vụ phân tích câu hỏi, tóm tắt sách và tạo lời giải thích gợi ý.
- **Google Gemini Embedding API (`gemini-embedding-001`):** Trích xuất vector ngữ nghĩa 768 chiều từ siêu dữ liệu sách (tiêu đề, tác giả, thể loại, mô tả) và câu hỏi của độc giả.
- **PostgreSQL Extension `vector` (pgvector):** Lưu trữ vector nhúng 768 chiều (`extensions.vector(768)`) và thực thi toán tử tính khoảng cách Cosine (`<=>`) cho tìm kiếm ngữ nghĩa.
- **Supabase Edge Functions (Deno Runtime):** Máy chủ serverless xử lý logic AI và tạo độc giả, giữ kín hoàn toàn khóa API bí mật phía máy chủ (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 4. KIẾN TRÚC HỆ THỐNG

Dự án áp dụng mô hình kiến trúc **Client-Server kết hợp Serverless Edge Computing** và **Database-Driven Security**:

```
+-------------------------------------------------------------------------+
|                       TRÌNH DUYỆT NGƯỜI DÙNG                            |
|             (React 18 + TypeScript + Tailwind CSS UI)                   |
+--------------------+--------------------------------+-------------------+
                     |                                | (Kèm Auth JWT)
         (Đăng nhập / Session)                        v
                     |                    +-------------------------------+
                     v                    |    SUPABASE EDGE FUNCTIONS    |
+--------------------+--------------+     |        (Deno Runtime)         |
|           SUPABASE AUTH           |     +---------------+---------------+
|      (JWT Token Verification)     |                     |
+--------------------+--------------+       1. Xác thực Caller Profile & Role
                     |                      2. Semantic RAG & Prompt Guard
                     v                      3. Server-side Secrets (API Key)
+---------------------------------------------------------+       |
|            SUPABASE POSTGRESQL DATABASE                 |       v
|  - Tables: profiles, books, loans, reservations, fines  |   +-----------+
|  - Row Level Security (RLS) Policies                    |   |  GEMINI   |
|  - ACID RPCs (borrow, return, renew, reserve, cancel)   |   |  API /    |
|  - pgvector Extension (Vector Cosine Similarity Search) |   | EMBEDDING |
+---------------------------------------------------------+   +-----------+
```

### Các ranh giới an toàn (Trust Boundaries):
1. **Ranh giới Trình duyệt (Client Boundary - Untrusted):** Không tin cậy bất kỳ tham số quyền hạn (`role`) hoặc danh tính (`reader_id`) nào do frontend gửi lên. Frontend chỉ đóng vai trò điều hướng và hiển thị giao diện.
2. **Ranh giới Xác thực (Supabase Auth Boundary):** Cấp phát và làm mới phiên làm việc; chữ ký số JWT được máy chủ kiểm tra trước khi thực thi bất kỳ truy vấn nào.
3. **Ranh giới Cơ sở dữ liệu (PostgreSQL + RLS Boundary):** RLS kiểm soát trực tiếp quyền `SELECT`, `INSERT`, `UPDATE`, `DELETE` theo định danh `auth.uid()`. Độc giả thông thường không thể can thiệp dữ liệu của người khác dù cố tình gọi API trực tiếp.
4. **Ranh giới Serverless Edge Function (AI Boundary):** Giữ bí mật khóa `GEMINI_API_KEY`, chỉ nạp tối đa dữ liệu ngữ cảnh cần thiết (Bounded Context), không cho phép mô hình AI truy cập trực tiếp toàn bộ database.

---

## 5. CÁC CHỨC NĂNG CHÍNH THEO VAI TRÒ

Hệ thống thiết lập 3 nhóm người dùng chính và giao diện dành riêng cho khách vãng lai:

### 5.1. Khách vãng lai & Trang chủ công khai (Landing Page)
- **Giới thiệu tổng quan:** Hero section, thông số nổi bật, cam kết chất lượng dịch vụ thư viện.
- **Xem trước danh mục sách:** Đọc danh sách sách mới nhất theo thời gian thực từ kho sách thư viện.
- **Trải nghiệm thử AI Demo:** Giao diện tương tác thử nghiệm tính năng AI Tra cứu, Tóm tắt và Gợi ý với các câu hỏi gợi ý có sẵn.
- **Đăng ký tài khoản độc giả:** Khách có thể tự đăng ký tài khoản với loại độc giả phù hợp (*Học sinh, Giáo viên, Nhân viên, Khách*).
- **Đăng nhập & Khôi phục mật khẩu:** Xác thực tài khoản hoặc gửi liên kết đặt lại mật khẩu qua email.

### 5.2. Độc giả (Reader)
- **Bảng điều khiển cá nhân (Dashboard):** Xem tổng số sách đang mượn, số phiếu quá hạn, tổng tiền phạt chưa nộp và danh sách phiếu mượn gần nhất.
- **Tra cứu danh mục sách (Books):** Xem danh sách sách, tìm kiếm theo tên/tác giả/mã sách, lọc theo thể loại, xem trạng thái còn sách hay đã hết.
- **Tóm tắt nhanh bằng AI:** Bấm nút tóm tắt trực tiếp tại từng thẻ sách để đọc nội dung tóm lược ngắn gọn trong 3-5 câu.
- **Theo dõi Phiếu mượn (Loans):** Xem chi tiết ngày mượn, hạn trả và số lần đã gia hạn của cá nhân; cảnh báo trực quan các phiếu mượn đến hạn hoặc quá hạn.
- **Đặt trước sách (Reservations):**
  - Được phép đặt trước những đầu sách hiện đang hết bản khả dụng (`available = 0`).
  - Hệ thống tự động xếp hàng theo thứ tự ưu tiên thời gian (**FIFO - First In, First Out**).
  - Tự chủ động hủy phiếu đặt trước nếu không còn nhu cầu.
- **Theo dõi tiền phạt cá nhân (Fines):** Xem chi tiết các khoản phạt phát sinh do trả muộn (số ngày trễ hạn, số tiền phạt, trạng thái đã nộp hay chưa).
- **Bộ công cụ AI Thông minh:** Toàn quyền sử dụng AI Tra cứu sách bằng ngôn ngữ tự nhiên, AI Tóm tắt tác phẩm và AI Đề xuất sách cá nhân hóa theo gu đọc của mình.

### 5.3. Thủ thư (Librarian)
- **Quản lý danh mục sách:**
  - Thêm mới đầu sách (tự động gợi ý mã sách tiếp theo dạng `BV001`, `BV002`,...).
  - Chỉnh sửa thông tin sách, cập nhật số lượng (ràng buộc không cho phép giảm số lượng thấp hơn số bản đang được mượn).
  - Tải lên ảnh bìa sách tùy chỉnh (Base64 file upload) hoặc lựa chọn các ảnh bìa có sẵn.
  - Xóa sách an toàn (Soft-delete / Archive): Chuyển trạng thái sang `archived` để lưu trữ lịch sử lưu thông, ngăn chặn xóa sách nếu đang có người mượn hoặc đặt trước.
  - Xuất danh mục sách ra file CSV định dạng chuẩn UTF-8.
- **Quản lý tài khoản độc giả (Readers):**
  - Xem danh sách độc giả trong hệ thống, tìm kiếm theo tên, email, phân loại độc giả.
  - Tạo mới tài khoản độc giả thông qua Edge Function `create-reader` với mật khẩu khởi tạo an toàn.
  - Cập nhật thông tin liên hệ, địa chỉ của độc giả.
  - Xuất danh sách độc giả ra file CSV.
- **Nghiệp vụ Mượn - Trả sách:**
  - **Lập phiếu mượn:** Chọn độc giả và sách; hệ thống tự động kiểm tra số lượng tồn kho, tự động kiểm tra xem có độc giả khác đang xếp hàng đặt trước cuốn sách đó hay không (FIFO Protection); tự động tính ngày hạn trả dựa trên cấu hình thời gian mượn hiện hành.
  - **Xác nhận trả sách:** Cập nhật ngày trả thực tế, tự động hoàn trả số lượng khả dụng vào kho (`available = available + 1`); nếu trả quá hạn, hệ thống tự động sinh bản ghi phạt trong bảng `fines`.
  - **Gia hạn mượn sách:** Kiểm tra điều kiện gia hạn (phiếu chưa trả, chưa quá hạn, số lần gia hạn chưa vượt quá ngưỡng tối đa cho phép) và tự động cộng thêm số ngày gia hạn theo cấu hình.
  - **Thu tiền phạt:** Thu tiền phạt quá hạn và bấm xác nhận thanh toán chuyển trạng thái `paid = true`.
  - Xuất danh sách phiếu mượn ra file CSV.
- **Xử lý Đặt trước sách:** Xem danh sách độc giả đang xếp hàng chờ sách theo thứ tự FIFO; xác nhận hoàn tất phát sách (`fulfill_reservation`) hoặc hủy phiếu theo quy định.
- **Thống kê & Báo cáo:** Xem số liệu trực quan (Top 10 sách mượn nhiều nhất, Top độc giả tích cực, cơ cấu thể loại); xuất 5 mẫu báo cáo chuyên đề ra CSV (Sách, Phiếu mượn, Độc giả, Phiếu quá hạn, Nợ phạt).

### 5.4. Quản trị viên (Admin)
- Sở hữu **toàn bộ quyền hạn** của Thủ thư.
- **Quản trị người dùng nâng cao:** Được quyền xem và quản lý danh sách của cả Thủ thư lẫn Độc giả.
- **Cấu hình hệ thống (Settings) - Độc quyền Admin:**
  - Cập nhật Tên thư viện / Học viện.
  - Cấu hình Số ngày mượn mặc định (`loan_period_days`).
  - Cấu hình Số ngày gia hạn mỗi lần (`renewal_days`).
  - Cấu hình Số lần gia hạn tối đa (`max_renewals`).
  - Cấu hình Mức tiền phạt mỗi ngày quá hạn (`fine_per_day`, đơn vị VNĐ).
  *(Tất cả được bảo vệ bằng chính sách RLS phía database, từ chối mọi nỗ lực chỉnh sửa trái phép từ tài khoản không phải Admin).*
- **Đồng bộ dữ liệu Vector AI (Embedding Backfill):** Được quyền kích hoạt hành động tính toán và cập nhật vector nhúng 768 chiều cho toàn bộ kho sách chưa có embedding thông qua Edge Function.

---

## 6. CHỨC NĂNG TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI ENGINE)

Hệ thống ứng dụng kiến trúc **RAG (Retrieval-Augmented Generation)** khép kín bên trong Supabase Edge Function `ai-library`:

```
[Câu hỏi người dùng] 
       │
       ▼
1. Question Analyzer & Security Check (Loại bỏ câu hỏi ngoài phạm vi thư viện)
       │
       ▼
2. Vector Embedding (Gọi gemini-embedding-001 -> Tạo query vector 768 chiều)
       │
       ▼
3. PostgreSQL RPC match_books (Cosine Distance <=> kết hợp match_threshold 0.50)
       │
       ▼
4. Bounded Context Builder (Trích xuất tối đa 10 cuốn sách có độ tương đồng cao nhất)
       │
       ▼
5. Strict Prompt Builder (Ràng buộc chống ảo giác, hướng dẫn tiếng Việt chuẩn)
       │
       ▼
6. Gemini Service (gemini-3.5-flash với cơ chế Retry 3 lần khi quá tải 429/503)
       │
       ▼
[Câu trả lời tin cậy gửi về cho người dùng]
```

### 6.1. AI Tra cứu sách thông minh (AIChatPage)
- Người dùng đặt câu hỏi bằng ngôn ngữ tự nhiên tiếng Việt (Ví dụ: *"Có cuốn nào dạy lập trình Python cho người chưa biết gì không?", "Tìm sách về tâm lý học hành vi"*).
- Hệ thống nhúng câu hỏi thành vector, thực hiện tìm kiếm ngữ nghĩa trong cơ sở dữ liệu `books` thông qua hàm `match_books`.
- Trả về câu trả lời tự nhiên, giới thiệu tối đa 5 cuốn sách sát nhất kèm mã sách, tác giả và lý do phù hợp. Nếu sách đã hết bản khả dụng (`available = 0`), AI sẽ nêu rõ sách hiện đang được mượn hết.

### 6.2. AI Tóm tắt tác phẩm (AISummaryPage)
- Người dùng chọn một cuốn sách bất kỳ trong danh mục.
- Hệ thống gửi siêu dữ liệu của cuốn sách đó (Tên, tác giả, thể loại, nhà xuất bản, năm xuất bản, mô tả) sang Edge Function.
- Gemini AI tạo đoạn tóm tắt súc tích từ 3 đến 5 câu. **Quy tắc nghiêm ngặt:** Chỉ đúc kết từ thông tin thực tế được cung cấp, không được tự suy diễn tình tiết bên ngoài đời thực.

### 6.3. AI Đề xuất sách cá nhân hóa (AIRecommendPage)
- **Đối với Độc giả:** Hệ thống đọc lịch sử 20 lần mượn gần nhất của chính độc giả đó (được ẩn danh hóa chỉ lấy tên sách, thể loại, tác giả). AI phân tích sở thích để đề xuất tối đa 5 cuốn sách cùng chủ đề/tác giả mà độc giả chưa từng mượn.
- **Đối với Độc giả mới (chưa có lịch sử) hoặc Nhân viên:** Hệ thống tự động chuyển sang cơ chế gợi ý dựa trên danh sách các cuốn sách thịnh hành nhất thư viện (thông qua hàm RPC `get_popular_books`).

### 6.4. Cơ chế phòng thủ và dự phòng (Guardrails & Fallback)
- **Ngăn chặn rò rỉ dữ liệu:** Danh tính của độc giả và lịch sử mượn được máy chủ tự trích xuất từ JWT phiên đăng nhập; không chấp nhận client gửi giả mạo `user_id` của người khác.
- **Cơ chế dự phòng khi thiếu khóa API (Fallback mode):** Nếu môi trường chưa cấu hình biến `GEMINI_API_KEY`, Edge Function sẽ phản hồi thông điệp hướng dẫn người dùng sử dụng tính năng tìm kiếm truyền thống thay vì làm sập ứng dụng.

---

## 7. CẤU TRÚC THƯ MỤC DỰ ÁN

```
project/
├── .agents/                          # Bộ kỹ năng và cấu hình quy trình AI Agent
├── .bolt/                            # Cấu hình môi trường WebContainer / Bolt
├── .vscode/                          # Cấu hình gợi ý phát triển trên VS Code
├── docs/                             # Toàn bộ tài liệu phân tích nghiệp vụ & kiến trúc
│   ├── acceptance-criteria.md        # Tiêu chuẩn chấp thuận nghiệp vụ (AC)
│   ├── architecture.md               # Bản đặc tả kiến trúc phần mềm
│   ├── architecture-decisions.md     # Nhật ký các quyết định kiến trúc (ADR)
│   ├── customer-requirement.md       # Yêu cầu khách hàng ban đầu
│   ├── database-review.md            # Đánh giá schema và toàn vẹn dữ liệu
│   ├── implementation-plan.md        # Kế hoạch triển khai theo từng batch
│   └── implementation-checklist.md   # Danh mục kiểm tra tiến độ 12 batch
├── public/                           # Tài nguyên tĩnh công khai (Logo, Ảnh bìa sách mẫu)
│   └── covers/                       # Ảnh bìa sách mẫu cho thư viện
├── src/                              # Mã nguồn ứng dụng Frontend (React + TypeScript)
│   ├── components/                   # Các component giao diện dùng chung
│   │   ├── Layout.tsx                # Khung giao diện chính, thanh điều hướng sidebar đa vai trò
│   │   ├── Modal.tsx                 # Hộp thoại Modal tùy biến
│   │   └── UI.tsx                    # Các phần tử giao diện: PageHeader, LoadingSpinner, EmptyState, Badge
│   ├── context/                      # Context chia sẻ trạng thái toàn cục
│   │   └── AuthContext.tsx           # Quản lý phiên đăng nhập, vai trò người dùng, auth state listener
│   ├── lib/                          # Các hàm tiện ích và thư viện kết nối
│   │   ├── ai.ts                     # Hàm gọi Edge Function AI (Search, Summarize, Recommend)
│   │   ├── supabase.ts               # Khởi tạo Supabase Client và định nghĩa URL Endpoint
│   │   └── utils.ts                  # Tiện ích định dạng ngày tháng vi-VN, tiền tệ, tính quá hạn, xuất CSV
│   ├── pages/                        # Các trang màn hình chức năng của hệ thống
│   │   ├── AIChatPage.tsx            # Trang AI Tra cứu sách thông minh
│   │   ├── AIRecommendPage.tsx       # Trang AI Gợi ý sách cá nhân hóa
│   │   ├── AISummaryPage.tsx         # Trang AI Tóm tắt tác phẩm
│   │   ├── BooksPage.tsx             # Trang Quản lý danh mục sách
│   │   ├── Dashboard.tsx             # Bảng điều khiển tổng quan (phân theo vai trò)
│   │   ├── LandingPage.tsx           # Trang chủ công khai dành cho khách vãng lai & Đăng ký
│   │   ├── LoansPage.tsx             # Trang Quản lý Mượn / Trả / Gia hạn / Thu phạt
│   │   ├── LoginPage.tsx             # Trang Đăng nhập & Đặt lại mật khẩu trực tiếp
│   │   ├── ReadersPage.tsx           # Trang Quản lý tài khoản độc giả (Admin/Librarian)
│   │   ├── ReportsPage.tsx           # Trang Xuất báo cáo đa chuyên đề dạng CSV
│   │   ├── ReservationsPage.tsx      # Trang Quản lý Đặt trước sách theo hàng đợi FIFO
│   │   ├── ResetPasswordPage.tsx     # Trang Đặt lại mật khẩu mới sau khi xác thực email
│   │   ├── SettingsPage.tsx          # Trang Cấu hình tham số thư viện (Admin only)
│   │   └── StatisticsPage.tsx        # Trang Biểu đồ & Thống kê lưu thông chi tiết
│   ├── types/                        # Định nghĩa kiểu dữ liệu TypeScript (Interfaces, Types)
│   │   └── index.ts                  # Toàn bộ types: Profile, Book, Loan, Reservation, Fine, Settings, AI
│   ├── App.tsx                       # Component gốc điều hướng màn hình dựa trên Auth & Vai trò
│   ├── index.css                     # Cấu hình Tailwind CSS và biến màu giao diện
│   ├── main.tsx                      # Điểm khởi đầu ứng dụng React DOM
│   └── vite-env.d.ts                 # Định nghĩa kiểu môi trường Vite
├── supabase/                         # Cấu hình và cơ sở dữ liệu Supabase
│   ├── functions/                    # Mã nguồn các Supabase Edge Functions (Deno Runtime)
│   │   ├── ai-library/index.ts       # Edge Function xử lý AI RAG (Gemini + match_books)
│   │   └── create-reader/index.ts    # Edge Function tạo tài khoản độc giả bảo mật
│   ├── migrations/                   # Toàn bộ các file migration SQL quản lý cơ sở dữ liệu
│   │   ├── 20260802035946_library_schema.sql                  # Schema cơ sở dữ liệu nền tảng ban đầu
│   │   ├── 20261001090000_batch1_profile_security.sql         # Batch 1: RLS bảo vệ hồ sơ và phân quyền
│   │   ├── 20261001160052_batch2_admin_only_settings.sql      # Batch 2: RLS giới hạn cài đặt cho Admin
│   │   ├── 20261001170236_batch3_borrow_eligibility.sql       # Batch 3: RPC mượn sách an toàn & hạn trả
│   │   ├── 20261001171458_batch3_fix_loans_schema.sql         # Batch 3: Chuẩn hóa schema bảng loans
│   │   ├── 20261001174834_batch3_fix_vietnam_borrow_date.sql  # Batch 3: Áp dụng múi giờ Việt Nam
│   │   ├── 20261001183237_batch4_database_constraints.sql     # Batch 4: Ràng buộc toàn vẹn miền dữ liệu
│   │   ├── 20261002032928_batch5_protected_renewal.sql        # Batch 5: RPC gia hạn sách có kiểm soát
│   │   ├── 20261002042000_batch6_reservation_lifecycle.sql    # Batch 6: Vòng đời đặt trước & chống trùng
│   │   ├── 20261002051914_batch7_fine_consistency_payment.sql # Batch 7: Nhất quán mức phạt & thanh toán
│   │   ├── 20261002072512_batch8_reader_type_signup_validation.sql # Batch 8: Xác thực loại độc giả đăng ký
│   │   ├── 20261002092218_batch9_archive_book_preserve_history.sql # Batch 9: Lưu trữ sách giữ lịch sử
│   │   ├── 20261002192000_batch11_popular_books.sql           # Batch 11: Hàm lấy sách mượn nhiều nhất
│   │   ├── 20261002193500_batch11_book_embeddings.sql         # Batch 11: Mở rộng pgvector cột embedding
│   │   ├── 20261002202000_batch11_match_books.sql             # Batch 11: Hàm tìm kiếm tương đồng vector
│   │   └── 20261024223000_fix_reservation_fifo_and_loan_status.sql # Tối ưu bảo vệ hàng đợi FIFO
│   └── config.toml                   # Tệp cấu hình Supabase Local
├── .env                              # Biến môi trường kết nối Supabase phía Client
├── eslint.config.js                  # Cấu hình kiểm tra cú pháp ESLint
├── index.html                        # Tệp HTML mẫu nạp font Inter và thẻ meta ứng dụng
├── package.json                      # Danh mục dependencies và scripts chạy lệnh
├── postcss.config.js                 # Cấu hình PostCSS cho Tailwind
├── tailwind.config.js                # Cấu hình bảng màu ấm và kiểu dáng giao diện
├── tsconfig.json                     # Cấu hình TypeScript gốc
└── vite.config.ts                    # Cấu hình trình đóng gói Vite
```

---

## 8. YÊU CẦU MÔI TRƯỜNG

Để triển khai và vận hành dự án, máy tính cần đáp ứng các yêu cầu sau:

1. **Môi trường thực thi JavaScript:**
   - **Node.js:** Phiên bản `18.x` hoặc `20.x` LTS trở lên.
   - **npm:** Phiên bản `9.x` hoặc `10.x` (đi kèm Node.js).
2. **Cơ sở dữ liệu & Nền tảng phụ trợ:**
   - Một dự án **Supabase** đang hoạt động (trên Supabase Cloud hoặc tự lưu trữ qua Docker).
   - Dự án đã kích hoạt extension **pgvector** (`vector`).
3. **Môi trường Edge Function & AI:**
   - **Supabase CLI:** (Nếu muốn deploy Edge Functions trực tiếp từ máy cá nhân).
   - **Google Gemini API Key:** Lấy miễn phí từ [Google AI Studio](https://aistudio.google.com/) để kích hoạt mô hình `gemini-3.5-flash` và `gemini-embedding-001`.
4. **Trình duyệt web hỗ trợ:**
   - Google Chrome (khuyến nghị), Microsoft Edge, Mozilla Firefox hoặc Safari phiên bản mới.

---

## 9. HƯỚNG DẪN CÀI ĐẶT VÀ CẤU HÌNH

### Bước 1: Mở thư mục dự án
Mở cửa sổ dòng lệnh (Terminal hoặc PowerShell) tại thư mục chứa dự án:
```bash
cd "c:\Users\SIEU THI SO 4G\Desktop\project"
```

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies)
Chạy lệnh npm để cài đặt toàn bộ thư viện cần thiết:
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường Frontend (`.env`)
Tạo hoặc kiểm tra file `.env` tại thư mục gốc của dự án với nội dung cấu hình kết nối Supabase của bạn:
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```
*(Lưu ý: Khóa `VITE_SUPABASE_ANON_KEY` là khóa công khai an toàn, được bảo vệ qua chính sách RLS của Supabase).*

### Bước 4: Thiết lập Cơ sở dữ liệu Supabase
1. Truy cập vào **SQL Editor** trên trang quản trị dự án Supabase.
2. Thực thi lần lượt các file migration SQL nằm trong thư mục `supabase/migrations/` theo thứ tự thời gian tăng dần (từ `20260802035946_library_schema.sql` đến `20261024223000_fix_reservation_fifo_and_loan_status.sql`).
3. Sau khi chạy xong, cơ sở dữ liệu sẽ tự động có đầy đủ các bảng dữ liệu, chỉ mục tìm kiếm, chính sách bảo mật RLS và các hàm RPC xử lý lưu thông sách.

### Bước 5: Cấu hình bí mật cho Supabase Edge Functions
Trên trang quản trị Supabase, vào mục **Project Settings > Edge Functions > Secrets** (hoặc dùng Supabase CLI) để thêm các biến môi trường sau cho hàm `ai-library` và `create-reader`:
- `GEMINI_API_KEY`: Khóa API Google Gemini của bạn.
- `SUPABASE_URL`: Đường dẫn URL dự án Supabase của bạn.
- `SUPABASE_ANON_KEY`: Khóa Anon của dự án.
- `SUPABASE_SERVICE_ROLE_KEY`: Khóa Service Role của dự án (cần thiết để `create-reader` tạo tài khoản độc giả bảo mật).

---

## 10. HƯỚNG DẪN KHỞI CHẠY VÀ SỬ DỤNG PHẦN MỀM

### 10.1. Khởi chạy môi trường phát triển (Development Mode)
Thực thi lệnh:
```bash
npm run dev
```
Trình duyệt sẽ mở ứng dụng tại địa chỉ mặc định: `http://localhost:5173` (hoặc cổng hiển thị trên Terminal).

### 10.2. Kiểm tra lỗi kiểu dữ liệu (Typecheck)
Trước khi đóng gói, có thể chạy lệnh kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript:
```bash
npm run typecheck
```

### 10.3. Đóng gói cho môi trường Production (Build)
Để tạo bản build tối ưu hóa cho môi trường triển khai thực tế:
```bash
npm run build
```
Mã nguồn sau khi build sẽ nằm trong thư mục `dist/`. Bạn có thể chạy thử bản build bằng lệnh:
```bash
npm run preview
```

---

### 10.4. Hướng dẫn sử dụng chi tiết theo từng quy trình nghiệp vụ

#### Quy trình 1: Khách đăng ký và Độc giả sử dụng thư viện
1. Truy cập vào trang chủ `LandingPage`. Độc giả có thể duyệt xem các cuốn sách tiêu biểu và dùng thử AI Demo.
2. Bấm nút **"Đăng ký độc giả"** trên thanh tiêu đề hoặc ở modal xác thực.
3. Nhập Họ và tên, Email, Mật khẩu và chọn Phân loại độc giả (*Học sinh, Giáo viên, Nhân viên, Khách*).
4. Sau khi đăng ký thành công, đăng nhập vào hệ thống để truy cập Dashboard cá nhân.
5. Vào trang **Quản lý sách** để xem chi tiết tài liệu hoặc bấm **AI Tóm tắt** để nắm nhanh nội dung tác phẩm.
6. Nếu cuốn sách bạn muốn đọc đã hết bản khả dụng (`Còn: 0`), chuyển sang trang **Đặt trước sách** để đăng ký xếp hàng nhận sách.
7. Vào trang **AI Tra cứu sách** để trò chuyện trực tiếp với trợ lý thư viện ảo.

#### Quy trình 2: Thủ thư lập phiếu mượn và bảo vệ hàng đợi đặt trước (FIFO)
1. Đăng nhập bằng tài khoản có vai trò `librarian` hoặc `admin`.
2. Truy cập trang **Mượn / Trả sách** (`loans`), chọn nút **"Tạo phiếu mượn"**.
3. Chọn độc giả và chọn cuốn sách cần mượn.
4. **Cơ chế kiểm soát an toàn:**
   - Nếu sách đã hết (`available = 0`), hệ thống sẽ từ chối tạo phiếu.
   - Nếu sách đang có người xếp hàng đặt trước trong bảng `reservations`, hệ thống sẽ từ chối cho người khác mượn trước, ngoại trừ chính độc giả đang đứng đầu hàng đợi đó.
5. Bấm xác nhận, hệ thống tự tính hạn trả theo tham số cài đặt và trừ số lượng sách khả dụng trong kho.

#### Quy trình 3: Xác nhận trả sách, gia hạn và xử lý nợ quá hạn
1. Khi độc giả mang sách đến trả, Thủ thư tìm phiếu mượn tương ứng trên trang **Mượn / Trả sách** và bấm **"Trả sách"**.
2. Hệ thống hoàn lại số lượng khả dụng vào kho.
3. Nếu trả sách trễ hơn ngày hạn trả (`due_date`), hệ thống tự động tính số ngày quá hạn và tạo một khoản nợ phạt trong mục **Tiền phạt**.
4. Thủ thư nhận tiền phạt từ độc giả và bấm **"Xác nhận thanh toán"** để hoàn tất phiếu.
5. Nếu độc giả có nhu cầu đọc thêm khi chưa quá hạn, Thủ thư bấm **"Gia hạn"**. Hệ thống kiểm tra số lần gia hạn hợp lệ và tự động cộng thêm số ngày theo quy định.

#### Quy trình 4: Quản trị viên thay đổi quy định vận hành thư viện
1. Đăng nhập bằng tài khoản có vai trò `admin`.
2. Chọn mục **Cài đặt** (`settings`) trên thanh menu bên trái.
3. Thay đổi các tham số nghiệp vụ:
   - Tên thư viện.
   - Số ngày mượn mặc định (Ví dụ: 14 ngày).
   - Số ngày gia hạn mỗi lần (Ví dụ: 7 ngày).
   - Số lần gia hạn tối đa (Ví dụ: 2 lần).
   - Tiền phạt mỗi ngày quá hạn (Ví dụ: 5.000 VNĐ/ngày).
4. Bấm **"Lưu cài đặt"**. Các quy định mới sẽ lập tức được áp dụng cho toàn bộ các giao dịch mượn - trả phát sinh từ thời điểm đó.

---

## 11. TÌNH TRẠNG THỰC TẾ VÀ LƯU Ý KIỂM CHỨNG

Toàn bộ nội dung trong tài liệu này phản ánh chính xác tình trạng thực tế của mã nguồn hiện tại:

1. **Mã nguồn ứng dụng & Tính toàn vẹn:**
   - Hệ thống đã hoàn tất và vượt qua toàn bộ 12 batch kiểm thử bảo mật, RLS, tính toàn vẹn giao dịch và tích hợp AI RAG theo tài liệu kỹ thuật trong thư mục `docs/`.
   - Lệnh kiểm tra kiểu dữ liệu `npm run typecheck` đạt kết quả tuyệt đối (0 lỗi).
2. **Trạng thái cấu hình AI:**
   - Mã nguồn Edge Function `ai-library` đã tích hợp đầy đủ pipeline RAG với hai mô hình chính thức của Google: `gemini-3.5-flash` và `gemini-embedding-001`.
   - **Lưu ý xác thực:** Để tính năng AI trực tuyến hoạt động đầy đủ, Edge Function cần được cấu hình khóa bí mật `GEMINI_API_KEY` hợp lệ. Nếu khóa này chưa được nạp trên máy chủ Supabase, hệ thống sẽ tự động kích hoạt thông điệp dự phòng thân thiện (fallback) để hướng dẫn người dùng.
3. **Cơ chế Khôi phục mật khẩu:**
   - Chức năng quên mật khẩu đã được tích hợp qua hàm `supabase.auth.resetPasswordForEmail()` và trang xử lý mật khẩu mới tại `ResetPasswordPage.tsx`. Chức năng gửi email thực tế phụ thuộc vào việc cấu hình dịch vụ gửi thư SMTP (Custom SMTP) trong trang quản trị Supabase.
4. **Không phát sinh quyền can thiệp trái phép:**
   - Toàn bộ cơ chế đăng ký công khai chỉ cho phép tạo tài khoản vai trò `reader`.
   - Tài khoản `librarian` và `admin` không thể tự cấp phát thông qua giao diện đăng ký công khai mà phải được khởi tạo bảo mật từ máy chủ hoặc bởi Quản trị viên.

---

*Tài liệu này được biên soạn độc quyền cho Dự án Quản lý Thư viện Tích hợp AI (SmartLib AI).*

