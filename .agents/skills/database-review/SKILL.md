---
name: database-review
description: Review the existing database design against approved requirements and architecture without changing the database during the review phase.
---

# Database Review Skill

## Objective

Review the existing database schema, database rules, access control, and database-side business logic against the approved requirements and architecture.

## Inputs

Read:

- docs/requirements.md
- docs/user-stories.md
- docs/acceptance-criteria.md
- docs/requirements-approval.md
- docs/architecture.md
- docs/architecture-decisions.md
- docs/architecture-approval.md
- supabase/migrations/

Inspect the existing database implementation but do not modify it during this phase.

## Process

1. Identify all database tables.
2. Identify important columns and constraints.
3. Identify relationships and foreign keys.
4. Review enum-like values and status values.
5. Review database functions and RPC operations.
6. Review Row Level Security policies.
7. Compare the schema with approved business rules.
8. Check role and ownership boundaries.
9. Check data integrity rules.
10. Check transaction-sensitive operations.
11. Check fine, loan, reservation, and settings logic.
12. Identify mismatches between requirements, architecture, and the current schema.
13. Classify findings by severity and implementation priority.
14. Preserve requirement traceability.

## Rules

- Do not modify migration files.
- Do not modify the database.
- Do not modify approved requirements.
- Do not modify approved architecture.
- Do not write implementation code.
- Do not silently invent missing business rules.
- If a requirement cannot be verified from the schema, record it as a finding.
- Distinguish schema defects from application-layer defects.
- Clearly identify security or RLS risks.
- Recommend changes only as review findings; do not apply them yet.

## Outputs

Create or update:

- docs/database-review.md
- docs/database-issues.md

## Verification

Before completing the review verify:

- all current tables were inspected;
- key relationships were reviewed;
- RLS was reviewed;
- RPC/database functions were reviewed;
- approved loan rules were checked;
- approved return rules were checked;
- approved reservation rules were checked;
- approved fine rules were checked;
- approved settings rules were checked;
- role-based data access was checked;
- every identified issue has severity and rationale;
- no database or source file was modified.