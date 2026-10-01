# Batch 1 Verification - Security and Identity Boundary

## Thông tin

- Reviewer: Sinh viên
- Review Date: 01/10/2026
- Batch: 1 - Security and Identity Boundary
- Status: VERIFIED - DEPLOYED AND RUNTIME TESTED

## Scope

Batch 1 tập trung xử lý:

- DB-001 privilege escalation;
- trusted authentication and identity boundary;
- removal of client-authoritative role and readerId.

Không triển khai Batch 2+ hoặc Gemini/RAG migration trong batch này.

## Files Reviewed

- supabase/migrations/20261001090000_batch1_profile_security.sql
- supabase/functions/ai-library/index.ts
- src/lib/ai.ts
- src/context/AuthContext.tsx
- src/pages/LoginPage.tsx
- src/pages/ReadersPage.tsx
- src/pages/AIRecommendPage.tsx
- .agents/skills/security-identity-implementation/SKILL.md

## Human Code Review

### Reader self-update

Đã xác nhận Reader chỉ được self-update:

- full_name
- phone
- address

Reader không được self-update:

- role
- card_status
- reader_type
- email
- id
- created_at

### Librarian permissions

Đã xác nhận:

- Librarian chỉ được quản lý Reader.
- Librarian không được quản lý Librarian khác.
- Librarian không được thay đổi role.
- Librarian không được nâng Reader thành Librarian hoặc Admin.
- Librarian có thể quản lý card_status của Reader theo yêu cầu đã phê duyệt.

### Admin permissions

Đã xác nhận:

- Admin có thể quản lý Reader và Librarian.
- Role-changing path, nếu được sử dụng, chỉ dành cho Admin.
- Không cho phép tạo thêm Admin thông qua profile update thông thường.

## Authentication and AI Identity Boundary

Đã xác nhận Edge Function:

- yêu cầu Authorization Bearer token;
- xác minh token bằng Supabase Auth;
- lấy authenticated user ID từ verified session;
- đọc role từ trusted profiles data;
- không sử dụng client-supplied role làm authority;
- không sử dụng client-supplied readerId cho Reader recommendation history;
- sử dụng user-scoped Supabase client để RLS tiếp tục được áp dụng.

Đã xác nhận frontend:

- public signup không còn gửi role;
- AI client gửi authenticated access token;
- AI recommendation không còn gửi readerId.

## Automated Verification

Kết quả được ghi nhận:

- Production build: PASS
- TypeScript scoped check: PASS
- Changed-code lint: 0 errors
- git diff --check: PASS

Có một Fast Refresh warning hiện hữu trong AuthContext nhưng không phải lỗi Batch 1.

Full-project lint vẫn có baseline errors ngoài phạm vi Batch 1.

## Known Limitations

Batch 1 đã được deploy và runtime verified trên Supabase thật.

Đã xác nhận:

- migration `20261001090000_batch1_profile_security.sql` đã được áp dụng thành công;
- Reader privilege escalation attempt bị chặn;
- Librarian unauthorized role change bị chặn;
- Admin/Librarian profile management hoạt động đúng theo quyền đã phê duyệt;
- RLS và trigger protection hoạt động sau deployment;
- Edge Function `ai-library` đã được deploy và ở trạng thái ACTIVE;
- unauthenticated request bị chặn với HTTP 401;
- authenticated Reader request gọi Edge Function thành công.

Giới hạn còn lại:

- AI provider chưa được cấu hình API key nên hiện đang dùng fallback response;
- Gemini/RAG chưa được triển khai trong Batch 1 và sẽ được xử lý ở Batch 11.

## DB-001 Status

DB-001 hiện có trạng thái:

RESOLVED

DB-001 được đánh dấu Resolved vì:

1. migration đã được deploy thành công;
2. database security tests đã được chạy và PASS;
3. Human Verification đã xác nhận runtime behavior;
4. Reader không thể tự thay đổi role hoặc card_status;
5. Librarian không thể nâng quyền Reader;
6. authenticated identity được lấy từ verified Supabase session thay vì dữ liệu do client tự gửi.

## Human Verification Decision


Status: VERIFIED AND COMPLETED

Batch 1 đã hoàn tất sau khi:

- code implementation được review;
- migration được deploy lên Supabase thật;
- database security tests PASS;
- Edge Function được deploy thành công;
- unauthenticated request bị chặn với HTTP 401;
- authenticated Reader request gọi Edge Function thành công;
- DB-001 được xác nhận RESOLVED.

Batch 1 đủ điều kiện chuyển sang Batch 2.
