---
name: security-identity-implementation
description: Implement the approved security and identity boundary fixes for Batch 1 while preserving approved requirements and architecture.
---

# Security and Identity Implementation Skill

## Objective

Implement Batch 1 of the approved implementation plan:

Security and Identity Boundary.

Primary goals:

- fix DB-001;
- prevent privilege escalation through profile self-update;
- establish trusted authenticated identity;
- ensure backend logic does not trust client-supplied role or readerId when identity can be derived from the authenticated Supabase session.

## Inputs

Read:

- docs/requirements.md
- docs/acceptance-criteria.md
- docs/architecture.md
- docs/architecture-decisions.md
- docs/database-review.md
- docs/database-issues.md
- docs/implementation-plan.md
- docs/implementation-checklist.md
- docs/implementation-approval.md

Inspect relevant implementation files, including:

- supabase/migrations/
- supabase/functions/ai-library/index.ts
- src/lib/ai.ts
- src/context/AuthContext.tsx
- relevant account/profile pages

## Process

1. Inspect current profile RLS behavior.
2. Confirm the DB-001 privilege-escalation path.
3. Design the smallest safe migration fix.
4. Separate safe self-profile updates from privileged role/card-status changes.
5. Preserve Admin/Librarian management capabilities required by approved requirements.
6. Establish trusted session-derived identity rules for backend operations.
7. Ensure client-supplied role is never authoritative.
8. Ensure client-supplied readerId is never authoritative when the authenticated user identity is sufficient.
9. Update source code only where required by Batch 1.
10. Add verification steps.
11. Do not address unrelated batches.

## Rules

- Do not modify approved requirements.
- Do not modify approved architecture.
- Do not rewrite the historical committed migration.
- Use a new migration for database security changes.
- Do not weaken RLS.
- Do not introduce destructive schema changes.
- Do not mark DB-001 Resolved before verification.
- Do not implement unrelated Batch 2+ changes.
- Keep changes small and reviewable.
- Preserve existing working functionality unless it conflicts with approved security requirements.

## Outputs

Implementation may modify only files required for Batch 1, including:

- a new Supabase migration;
- relevant authentication/profile source files;
- relevant AI backend/client files only where needed for the trusted identity boundary;
- docs/implementation-checklist.md only after implementation verification if Human Review approves status updates.

## Verification

Before completing Batch 1 verify:

- Reader cannot self-promote to admin or librarian.
- Reader cannot self-change protected authorization fields.
- Admin/Librarian management paths remain valid according to approved requirements.
- Supabase authenticated session is verified in backend security-sensitive operations.
- role is derived from trusted data.
- reader identity is derived from authenticated session where applicable.
- client-supplied role/readerId cannot override trusted identity.
- project builds successfully.
- no unrelated batch was implemented.