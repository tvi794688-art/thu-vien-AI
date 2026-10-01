# Batch 1 Verification - Security and Identity Boundary

## Thông tin

- Reviewer: Sinh viên
- Review Date: 01/10/2026
- Batch: 1 - Security and Identity Boundary
- Status: IMPLEMENTED - PENDING DATABASE DEPLOYMENT VERIFICATION

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

Migration:

`20261001090000_batch1_profile_security.sql`

chưa được áp dụng lên Supabase database thật.

Do đó chưa có runtime database verification cho:

- Reader privilege escalation attempt;
- Librarian unauthorized role change;
- Admin/Librarian profile management sau migration;
- RLS behavior sau deployment.

## DB-001 Status

DB-001 vẫn giữ trạng thái:

OPEN

Batch 1 đã implement code fix nhưng DB-001 chỉ được xem xét chuyển sang Resolved sau khi:

1. migration được deploy;
2. database security tests được chạy;
3. Human Verification xác nhận runtime behavior.

## Human Verification Decision

Status: APPROVED FOR COMMIT

Batch 1 implementation được chấp nhận để lưu vào Git.

Việc APPROVED FOR COMMIT không đồng nghĩa DB-001 đã Resolved.

Bước tiếp theo là commit Batch 1, sau đó thực hiện deployment/runtime verification theo quy trình phù hợp.