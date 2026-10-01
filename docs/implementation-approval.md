# Implementation Planning Review - Human Gate 4

## Thông tin kiểm duyệt

- Reviewer: Sinh viên
- Review Date: 01/10/2026
- Status: APPROVED

## Tài liệu đã kiểm tra

- docs/implementation-plan.md
- docs/implementation-checklist.md
- docs/database-review.md
- docs/database-issues.md
- docs/database-approval.md
- docs/architecture.md
- docs/architecture-approval.md
- docs/requirements.md
- docs/requirements-approval.md

## Phạm vi Human Review

Đã kiểm tra:

- [x] Tất cả DB-001 đến DB-010 đều có kế hoạch xử lý.
- [x] Critical issue được ưu tiên trước.
- [x] High severity issues được xử lý trước Medium và Low.
- [x] Các application issue đã biết được đưa vào kế hoạch.
- [x] Dashboard overdue issue được đưa vào kế hoạch.
- [x] Loans overdue filter issue được đưa vào kế hoạch.
- [x] Reader creation flow được đưa vào kế hoạch.
- [x] Settings permission issue được đưa vào kế hoạch.
- [x] Fine calculation và payment flow được đưa vào kế hoạch.
- [x] Statistics/reporting issue được đưa vào kế hoạch.
- [x] AI implementation alignment issue được đưa vào kế hoạch.
- [x] UX, validation, feedback, pagination và account recovery được đưa vào kế hoạch.
- [x] Mỗi batch có phạm vi nhỏ và có thể review độc lập.
- [x] Mỗi batch có verification steps.
- [x] Database fix sử dụng migration mới thay vì sửa migration lịch sử đã commit.
- [x] Không issue nào bị đánh dấu Resolved trước khi implementation và verification hoàn tất.

## Implementation Order được phê duyệt

Thứ tự triển khai được chấp nhận theo nguyên tắc:

1. Security and identity boundary
2. Admin-only settings access
3. Borrow eligibility and configured due dates
4. Database invariant constraints
5. Protected loan renewal
6. Reservation lifecycle and queue
7. Fine integrity and payment flow
8. Signup reader type and account creation
9. State-based book deletion / historical data preservation
10. Complete statistics, overdue, and reporting
11. AI/RAG migration to Gemini
12. Validation, feedback, pagination, and account recovery

## Security Decision

Batch đầu tiên phải thiết lập trusted identity boundary.

Backend phải:

- xác minh Supabase session;
- xác định user identity từ authenticated session;
- xác định role từ trusted server/database data;
- không sử dụng client-supplied role làm authority;
- không sử dụng client-supplied readerId làm authority khi identity có thể lấy từ session.

AI implementation ở batch sau phải tái sử dụng security boundary này.

## Database Decision

Database fixes phải được thực hiện bằng migration mới.

Không sửa trực tiếp historical migration đã được commit nếu chưa có Human Review riêng.

Các fix phải ưu tiên:

- RLS;
- constraints;
- trusted RPC/functions;
- transaction safety;
- business-rule enforcement.

## Book History Decision

Việc sửa DB-009 không được làm mất lịch sử giao dịch.

Không sử dụng destructive cascade để xóa historical loans hoặc reservations.

Nếu physical deletion không thể bảo toàn lịch sử an toàn, implementation phải sử dụng controlled deletion hoặc soft-delete/archive phù hợp.

## AI Decision

AI target architecture được xác nhận là:

User Question
→ Question Analyzer
→ Structured Intent
→ Book Retriever
→ Context Builder
→ Prompt Builder
→ Gemini Service
→ Answer

Các thành phần trên là logical modules trong Supabase Edge Function.

AI phải:

- sử dụng Gemini;
- giữ API key ở server-side;
- xác minh Supabase session;
- chỉ dùng dữ liệu sách lấy từ database;
- không bịa tên sách hoặc tác giả;
- chỉ truy xuất context cần thiết;
- hỗ trợ Search, Summary và Recommendation;
- xử lý no-result, insufficient-data và out-of-scope rõ ràng.

## Human Review Decision

Implementation Plan được APPROVED.

Việc APPROVED kế hoạch không có nghĩa các issue đã được sửa.

Tất cả DB-001 đến DB-010 vẫn giữ trạng thái Open cho tới khi:

1. implementation tương ứng được hoàn thành;
2. verification/test tương ứng được thực hiện;
3. Human Review xác nhận kết quả;
4. issue được cập nhật trạng thái theo bằng chứng.

## Verification

Đã xác nhận:

- Chưa sửa source code trong Implementation Planning.
- Chưa sửa database migration trong Implementation Planning.
- Chưa thay đổi Requirements đã APPROVED.
- Chưa thay đổi Architecture đã APPROVED.
- Chưa thay đổi Database Review findings.
- Implementation Plan có thứ tự dependency hợp lý.
- Mỗi batch phù hợp để tạo Git commit riêng.
- Security-sensitive fixes được ưu tiên.

## Approval

Status: APPROVED

Implementation Planning được phê duyệt để chuyển sang giai đoạn Implementation.

Việc triển khai phải thực hiện từng batch nhỏ, có kiểm tra sau mỗi batch và không tự động đánh dấu issue là Resolved nếu chưa có verification.