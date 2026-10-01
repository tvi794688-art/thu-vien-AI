# Database Review - Human Gate 3

## Thông tin kiểm duyệt

- Reviewer: Sinh viên
- Review Date: 01/10/2026
- Status: APPROVED

## Tài liệu đã kiểm tra

- docs/database-review.md
- docs/database-issues.md
- docs/requirements.md
- docs/requirements-approval.md
- docs/architecture.md
- docs/architecture-approval.md
- supabase/migrations/20260802035946_library_schema.sql

## Phạm vi Human Review

Đã kiểm tra:

- [x] Database tables
- [x] Relationships and foreign keys
- [x] Constraints and data integrity
- [x] Row Level Security
- [x] Role-based permissions
- [x] Database functions and RPC
- [x] Loan and return logic
- [x] Renewal requirements
- [x] Reservation requirements
- [x] Fine calculation
- [x] Settings permissions
- [x] Transaction safety
- [x] Concurrency behavior
- [x] Requirements traceability
- [x] Database findings

## Findings được Human Review xác nhận

Database Review hiện ghi nhận:

- DB-001 - Critical - Reader có khả năng tự thay đổi role/card_status do RLS profile update quá rộng.
- DB-002 - High - Librarian hiện có quyền ghi Settings mặc dù yêu cầu chỉ Admin được sửa.
- DB-003 - High - borrow_book tin reader ID và due date do caller truyền vào, đồng thời chưa kiểm tra active card và chưa tự tính due date từ Settings.
- DB-004 - High - thiếu database constraints cho nhiều invariant và enum-like values quan trọng.
- DB-005 - High - chưa có protected renewal operation/database enforcement đầy đủ.
- DB-006 - High - reservation chưa được database enforce đầy đủ về availability, duplicate pending, status và FIFO/fulfillment.
- DB-007 - Medium - return/fine có fallback hard-coded khi thiếu Settings id=1 và Fine còn thiếu một số integrity constraints.
- DB-008 - Medium - reader_type từ signup metadata chưa được database validate.
- DB-009 - Medium - book deletion hiện bị chặn bởi mọi historical loan/reservation thay vì chỉ các trạng thái bị cấm theo requirement.
- DB-010 - Low - overdue/statistics/reservation ordering chưa thể xác minh đầy đủ chỉ từ migration và được xem là application/database-boundary observation.

Tất cả findings hiện có trạng thái Open.

Open ở đây nghĩa là finding đã được xác nhận nhưng chưa được sửa.

## Concurrency Review

Đã xác nhận:

### borrow_book

`borrow_book` khóa book row trước khi kiểm tra và cập nhật availability.

Các request mượn đồng thời thông qua RPC này sẽ được serialize trên cùng book row.

Do đó hai RPC concurrent không thể cùng tiêu thụ bản sao cuối cùng.

### return_book

`return_book` khóa loan row trước khi xử lý return.

Hai lần return đồng thời cho cùng loan không thể cùng tăng availability hoặc cùng tạo Fine thông qua RPC.

### Giới hạn của kết luận

Concurrency safety trên chỉ áp dụng cho các write path đi qua các RPC tương ứng.

Direct table writes hoặc write path khác vẫn phải được bảo vệ bằng RLS, constraints và trusted operations.

## Human Review Decision

Database Review được APPROVED.

Việc APPROVED Database Review không có nghĩa database hiện tại không có lỗi.

Nó có nghĩa:

- các vấn đề DB-001 đến DB-010 đã được con người xem xét;
- danh sách finding được chấp nhận làm đầu vào cho giai đoạn Implementation/Fix;
- chưa áp dụng database migration fix trong giai đoạn Review;
- các finding Critical và High phải được ưu tiên khi bước sang Implementation.

## Verification

Đã xác nhận:

- Không sửa migration hiện tại trong Database Review.
- Không sửa source code.
- Không sửa Requirements đã APPROVED.
- Không sửa Architecture đã APPROVED.
- Không đánh dấu finding nào là Resolved khi chưa có implementation và verification.
- Database fixes sẽ được thực hiện ở giai đoạn Implementation bằng migration/change phù hợp và được kiểm thử sau đó.

## Approval

Status: APPROVED

Database Review được phê duyệt để chuyển sang giai đoạn Implementation Planning / Implementation.

Các finding DB-001 đến DB-010 vẫn giữ trạng thái Open cho đến khi có bằng chứng implementation và verification tương ứng.