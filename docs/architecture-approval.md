# Architecture Review - Human Gate 2

## Thông tin kiểm duyệt

- Reviewer: Sinh viên
- Review Date: 01/10/2026
- Status: APPROVED

## Tài liệu đã kiểm tra

- docs/architecture.md
- docs/architecture-decisions.md
- docs/requirements.md
- docs/requirements-approval.md

## Nội dung đã kiểm tra

- [x] Architecture Overview
- [x] Architectural Style
- [x] System Components
- [x] Component Responsibilities
- [x] Frontend Architecture
- [x] Authentication and Authorization
- [x] Database/Data Access Architecture
- [x] Library Business Flow
- [x] AI/RAG Architecture
- [x] Security Boundaries
- [x] External Dependencies
- [x] Data Flow
- [x] Error Handling
- [x] Non-functional Requirement Support
- [x] Requirement-to-Architecture Traceability
- [x] Architecture Decisions

## Human Review Decisions

Kiến trúc đã được xem xét dựa trên Requirements đã được phê duyệt tại Human Gate 1.

Kiến trúc giữ nguyên công nghệ chính của project:

- React
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase RPC
- Supabase Edge Functions
- Gemini cho AI

Các thành phần RAG:

- Question Analyzer
- Structured Intent
- Book Retriever
- Context Builder
- Prompt Builder
- Gemini Service

được xem là các logical modules trong Supabase Edge Function, không yêu cầu triển khai thành các service độc lập.

## Verification

Đã xác nhận:

- Không thay đổi Requirements đã được APPROVED.
- Không thay đổi source code.
- Không thay đổi database schema.
- AI API key được giữ ở server-side.
- Backend phải xác minh Supabase session.
- Backend không tin role hoặc readerId do client tự cung cấp nếu có thể xác định từ session.
- RAG chỉ sử dụng dữ liệu sách được truy xuất từ database.
- Kiến trúc phù hợp với quy mô project sinh viên.
- Không bổ sung infrastructure không cần thiết.

## Known Alignment Risk

Implementation AI hiện tại chưa hoàn toàn khớp với kiến trúc mục tiêu.

Kiến trúc mục tiêu yêu cầu Gemini và session-verified identity.

Việc sửa implementation sẽ được thực hiện ở giai đoạn Implementation, không thực hiện trong Architecture Design.

## Approval

Status: APPROVED

Architecture được phê duyệt để chuyển sang giai đoạn Database Design / Database Review.

Mọi thay đổi kiến trúc quan trọng sau thời điểm này phải được Human Review trước khi áp dụng.