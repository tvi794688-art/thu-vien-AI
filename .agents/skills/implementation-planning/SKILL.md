---
name: implementation-planning
description: Create an implementation plan from approved requirements, architecture, and review findings without changing source code.
---

# Implementation Planning Skill

## Objective

Create a safe and traceable implementation plan for fixing the approved project issues.

## Inputs

Read:

- docs/requirements.md
- docs/user-stories.md
- docs/acceptance-criteria.md
- docs/requirements-approval.md
- docs/architecture.md
- docs/architecture-decisions.md
- docs/architecture-approval.md
- docs/database-review.md
- docs/database-issues.md
- docs/database-approval.md

Inspect existing source code and database files only to understand where fixes must be applied.

## Process

1. Collect all approved unresolved findings.
2. Identify affected files/components.
3. Group related fixes.
4. Order fixes by severity and dependency.
5. Prioritize Critical and High severity issues.
6. Identify database changes that require new migrations.
7. Identify frontend changes.
8. Identify Supabase Auth/RLS changes.
9. Identify RPC/function changes.
10. Identify AI/RAG changes.
11. Identify testing required for each implementation step.
12. Identify rollback/risk considerations.
13. Preserve requirement and issue traceability.
14. Produce small implementation batches suitable for Git commits.

## Rules

- Do not modify source code.
- Do not modify migration files.
- Do not apply database changes.
- Do not modify approved requirements.
- Do not modify approved architecture.
- Do not mark any issue as resolved.
- Do not skip Critical or High findings.
- Do not invent new requirements.
- Every planned fix must reference the related issue or approved requirement.
- Prefer small, reviewable implementation batches.

## Outputs

Create or update:

- docs/implementation-plan.md
- docs/implementation-checklist.md

## Verification

Before completing the plan verify:

- all DB-001 to DB-010 findings are covered;
- previously identified application issues are included;
- AI implementation alignment issues are included;
- security-sensitive fixes are prioritized;
- no code or database file was changed;
- every implementation batch has verification steps;
- every implementation batch is suitable for a separate Git commit.