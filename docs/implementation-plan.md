# Implementation Plan

## Planning Scope

This plan translates the approved requirements, architecture, architecture decisions, and database review into reviewable implementation batches. It covers every approved open database finding DB-001 through DB-010 and the known application-level gaps recorded for planning. It is a plan only: no finding is marked resolved and this document does not change requirements, architecture, schema, migrations, or source code.

All database changes are planned as new migrations. The committed migration `supabase/migrations/20260802035946_library_schema.sql` is historical and must not be rewritten without a strong reason and human approval. Batch 9 preserves historical transaction data and must not solve book deletion by cascading or weakening referential integrity.

## Current Baseline

The project is a React + TypeScript client using Supabase Auth, PostgreSQL/RLS, RPCs, and a Supabase Edge Function. The existing migration defines six application tables, RLS, profile role helpers, signup handling, and borrow/return RPCs. The database review and approval identify DB-001 through DB-010 as Open.

Source inspection found the dashboard computes its overdue count from only five recent loans and popular books from a 50-loan subset. LoansPage's overdue filter selects only `status=borrowing` without a due-date predicate. StatisticsPage caps loans at 100; reports and client-side lists need verification for Supabase result truncation and full-dataset behavior. Loan fine display uses a fallback rate. Renewal and reservation changes currently use direct frontend writes; fine payment completion was not found. Reader administration does not yet provide the complete approved creation flow, and LoginPage/AuthContext do not expose account recovery.

The AI Edge Function currently uses an OpenAI-compatible endpoint and `OPENAI_API_KEY`, creates a service-role client, does not visibly verify the caller's Supabase session, accepts a client readerId for recommendation history, fetches limited catalog subsets, filters search to available books, and falls back to arbitrary catalog rows when no match exists. The frontend supplies the anon key as Authorization rather than the user's access token. These are baseline observations for planning, not implementation conclusions.

## Priority Strategy

1. Address Critical security issue DB-001 first and establish the trusted identity boundary used by subsequent protected operations.
2. Address High database findings DB-002 through DB-006 in order, separating settings authorization, borrowing, constraints, renewal, and reservation lifecycle work.
3. Address Medium findings DB-007 through DB-009, preserving fine consistency and historical records.
4. Address Low DB-010 as a database/application-boundary verification and reporting/order batch.
5. Migrate the AI implementation using the approved AI requirements and architecture traceability. It depends on Batch 1's trusted session/identity boundary and must reuse it, not implement a competing identity scheme.
6. Complete cross-cutting validation, feedback, pagination, and account recovery improvements in a focused UX batch.

Within each batch, a new migration is planned only where a database invariant or trusted operation requires one. An application guard is never treated as authorization enforcement where RLS, RPC, or a verified backend check is required.

## Dependency Order

```text
Batch 1 trusted identity/security
  ├─ Batch 2 Admin-only settings
  ├─ Batches 3–9 trusted database/business operations
  └─ Batch 11 AI/RAG (reuses Batch 1 identity and authorization)

Batches 3–6 business operations and constraints
  └─ Batch 7 fine correctness/payment

Batches 3–9
  └─ Batch 10 complete overdue/statistics/reporting/reservation ordering

All applicable feature batches
  └─ Batch 12 cross-cutting UX and recovery
```

The exact implementation boundary for DB-010 statistics and reservation ordering may be application queries or narrowly scoped database operations, consistent with the approved architecture. Batch 10 must verify complete results and authorization either way.

## Implementation Batches

### Batch 1 — Trusted identity and privilege boundary

**Priority:** Critical. **DB:** DB-001. Establish protections preventing readers from changing role/card authorization fields through self-service updates, with role changes restricted to a trusted provisioning path. Apply the same trusted foundation to authenticated backend operations: verify Supabase sessions, derive actor identity and role from verified session plus trusted profile state, and treat client-supplied role/readerId as non-authoritative. AI will consume this boundary in Batch 11 rather than duplicating its implementation.

**Likely areas:** New migration for profile policies/functions; `src/context/AuthContext.tsx`; `src/pages/ReadersPage.tsx`; `supabase/functions/ai-library/index.ts` only for shared authentication boundary establishment if appropriate. Do not invent staff provisioning requirements; document any provisioning dependency as an implementation detail requiring an approved operational path.

### Batch 2 — Admin-only settings enforcement

**Priority:** High. **DB:** DB-002. Restrict settings writes to Admin at the trusted database boundary, preserve approved read behavior, and align frontend access and validation. A hidden page/button is not sufficient enforcement.

**Likely areas:** New migration for settings policies; `src/pages/SettingsPage.tsx`; `src/App.tsx`; `src/components/Layout.tsx`.

### Batch 3 — Loan eligibility and configured due date

**Priority:** High. **DB:** DB-003. Make the trusted borrow operation validate an active Reader and available stock, derive/validate due dates using the current `settings.loan_period_days`, and retain atomic availability decrement. Caller-supplied reader and due-date fields are untrusted inputs.

**Likely areas:** New migration/RPC; `src/pages/LoansPage.tsx`; relevant types or validation helpers.

### Batch 4 — Database domain constraints

**Priority:** High. **DB:** DB-004. Add database constraints for explicitly approved inventory bounds, enumerated values, nonnegative counts/money, and settings ranges. Plan rollout to inspect/resolve any existing invalid data before adding constraints; do not silently mutate business records. Make ordinary write paths compatible with the constraints.

**Likely areas:** New migration with constraints; signup and book/loan/reservation/fine/settings write paths as affected.

### Batch 5 — Protected renewal operation

**Priority:** High. **DB:** DB-005. Add a trusted renewal operation that checks staff authority, borrowing status, not overdue, max renewals, absence of a conflicting pending reservation, and configured renewal days, then updates due date/count together.

**Likely areas:** New migration/RPC; `src/pages/LoansPage.tsx`.

### Batch 6 — Reservation lifecycle and ordering enforcement

**Priority:** High. **DB:** DB-006. Enforce reservations only when unavailable, one pending reservation per Reader/book, initial pending status, owner/staff cancellation authorization, FIFO selection by reserved date, and fulfillment coordination with loan creation as required by approved rules. Use concurrency-safe uniqueness and transaction handling where needed.

**Likely areas:** New migration/index/RPC as needed; `src/pages/ReservationsPage.tsx`; loan creation integration in `src/pages/LoansPage.tsx`.

### Batch 7 — Fine consistency and payment

**Priority:** Medium. **DB:** DB-007. Remove the hard-coded fine-rate fallback in favor of the configured settings rate and a clear failure when required configuration is missing. Add approved fine integrity constraints (nonnegative values, loan/reader consistency, one fine per loan where consistent with rules). Complete payment marking for Admin/Librarian and own-fine viewing for Readers. Ensure creation, estimated/displayed fines, and reports consistently use `settings.fine_per_day` and do not substitute a different default.

**Likely areas:** New migration; return/fine RPC; `src/pages/LoansPage.tsx`; `src/pages/StatisticsPage.tsx`; `src/pages/ReportsPage.tsx`; fine components/views.

### Batch 8 — Signup type validation and Reader creation

**Priority:** Medium. **DB:** DB-008. Validate reader_type against the approved four values at signup/database boundaries. Complete staff Reader creation and public Reader signup behavior without allowing public role assignment to Admin/Librarian.

**Likely areas:** New migration/signup trigger; `src/context/AuthContext.tsx`; `src/pages/LoginPage.tsx`; `src/pages/ReadersPage.tsx`; account form components.

### Batch 9 — Safe state-based book deletion with history retention

**Priority:** Medium. **DB:** DB-009. Align the deletion behavior with the approved blocker states while preserving historical loans and reservations. Prefer a controlled deletion operation that blocks physical deletion for borrowing loans and pending reservations, retains all historical transactions, and uses archive/inactive state if needed and compatible with approved requirements. Do not cascade-delete or remove referential protection for historical transactions. If physical deletion cannot safely coexist with retained history and approved behavior, document that tradeoff for a human decision rather than planning destructive deletion.

**Likely areas:** New migration for controlled delete/archive strategy if required; `src/pages/BooksPage.tsx`; book deletion trusted operation. Any archive state requiring requirement/architecture changes must be surfaced for a separate human review, not presumed approved here.

### Batch 10 — Full-dataset overdue, statistics, and reservation ordering/reporting

**Priority:** Low finding, required behavior. **DB:** DB-010. Verify and implement overdue as `status=borrowing AND due_date < current_date`; compute dashboard counts over the full relevant dataset, not recent loans. Statistics/rankings and report totals must use complete authorized datasets without 50/100-row caps. Verify reservation FIFO ordering/reporting by `reserved_date`. Use application queries or targeted DB views/RPCs only where the chosen boundary needs them; DB-010 is not an AI issue.

**Likely areas:** `src/pages/Dashboard.tsx`; `src/pages/LoansPage.tsx`; `src/pages/StatisticsPage.tsx`; `src/pages/ReportsPage.tsx`; reservation ordering in `src/pages/ReservationsPage.tsx`; query helpers and optional new migration.

### Batch 11 — AI/RAG migration to Gemini

**Priority:** High security and architecture alignment; depends on Batch 1. **DB:** None assigned by default; do not associate DB-010 with this batch absent a direct finding. Trace to FR-014–FR-017, NFR-002/NFR-007/NFR-010, AC-018.x–AC-020.x and AC-022.2–022.4, US-018–US-020/US-022, AD-004–AD-006, and the current AI implementation alignment risk in the approved architecture. Reuse Batch 1 session verification/identity derivation. Migrate the flow to `Question → Question Analyzer → Structured Intent → Book Retriever → Context Builder → Prompt Builder → Gemini Service → Answer`, with RAG stages as logical modules in the one Supabase Edge Function.

Use Gemini with its key only server side; retain only search, summary, and recommendation. Retrieve relevant database records and pass bounded task-specific context, never the full catalog. Search must not exclude a matching catalog book solely because `available=0`; ranking follows title, author, category, description keywords, with popularity tie-break. Do not hallucinate books/authors. Reader recommendation history comes only from the authenticated Reader; staff requests cannot use another Reader's history. Define clear no-result, insufficient-data, and out-of-scope outcomes. Frontend requests must send the user's authenticated session and present loading/safe errors.

**Likely areas:** `supabase/functions/ai-library/index.ts` and logical modules within the function; `src/lib/ai.ts`; `src/pages/AIChatPage.tsx`; `src/pages/AISummaryPage.tsx`; `src/pages/AIRecommendPage.tsx`; Supabase secret configuration. This batch does not reimplement Batch 1's trusted identity boundary.

### Batch 12 — Cross-cutting validation, feedback, pagination, account recovery

**Priority:** Normal, after core security/business paths. **DB:** no separate finding; verify compatibility with DB-004 and DB-008. Improve input validation at UI and trusted boundaries, loading/error/success feedback, pagination for datasets that need it, and the incomplete account recovery flow. Pagination must not truncate statistics or reports whose requirements demand complete aggregates/exports.

**Likely areas:** `src/pages/LoginPage.tsx`; `src/context/AuthContext.tsx`; shared UI/components; forms and data-list pages; query helpers.

## Files Likely Affected

- Database: new files under `supabase/migrations/` for DB-001–DB-009 and only if selected for DB-010. Never rewrite the existing historical migration.
- Backend: `supabase/functions/ai-library/` for the Gemini/RAG implementation; trusted database RPCs/policies as required.
- Frontend: `src/pages/Dashboard.tsx`, `BooksPage.tsx`, `LoansPage.tsx`, `ReadersPage.tsx`, `ReservationsPage.tsx`, `StatisticsPage.tsx`, `ReportsPage.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`, AI pages; `src/lib/ai.ts`; `src/context/AuthContext.tsx`; shared components and types as needed.
- Configuration: server-side Supabase Edge Function secret configuration for Gemini; no browser-exposed Gemini key.

These are likely locations based on source inspection, not a mandate to change every listed file.

## Database Migration Strategy

Implement schema, policy, constraint, and RPC changes through additive new migrations. Keep each migration scoped to its batch and safe to review. Before adding constraints, inspect existing rows for violations and define a non-destructive remediation or stop for human review. Preserve transaction history, foreign key integrity, and current approved rules. Avoid destructive cascade behavior. For DB-009, retain restrictive historical references and choose a controlled operation or archive/inactive approach only if it is consistent with approved requirements; otherwise document the physical-delete tradeoff and request a requirements decision before implementation. Do not update live database objects as part of planning.

## RLS/Security Fix Strategy

Treat the browser and all request fields as untrusted. DB-001 establishes protected profile privilege fields and the authenticated identity/role boundary. Derive identity from verified Supabase session and trusted profile data. Enforce role and ownership in RLS/RPC/Edge Function as applicable. Settings writes require Admin (DB-002). Reader data remains self-scoped. AI must reuse the session verification and identity/role derivation established in Batch 1; the AI handler must not maintain a separate or conflicting authorization implementation. Route privileged operations through trusted checks; UI role guards improve navigation but never count as enforcement.

## RPC/Business Logic Fix Strategy

Use narrowly scoped transactional RPCs for coordinated circulation changes: borrow with active-card and settings checks (DB-003), renewal (DB-005), reservation state/queue and fulfillment coordination (DB-006), and return/fine with configured fine rate and integrity protections (DB-007). Constraints in DB-004 provide defense across write paths. Preserve atomic stock changes and prevent available inventory from becoming negative. Add clear, stable business errors for invalid state/configuration. For DB-009, controlled deletion must retain historical records.

## Frontend Fix Strategy

Align user interfaces with server truth: correct overdue filters; complete Reader creation and fine payment controls; restrict settings UI to Admin while relying on DB enforcement; use configured fine rates consistently; display loading, validation, errors, and success feedback; paginate large operational lists where useful. Query complete sets for aggregate calculations or move aggregation to a supported authorized query/RPC. Do not let pagination limits affect required full-dataset statistics, report exports, or ranking outcomes.

## AI/RAG Migration Strategy

Replace the current OpenAI-compatible provider integration with Gemini in the Edge Function. First depend on Batch 1's verified session boundary and use its authenticated actor/role; ignore/reject request-supplied role and reader identity. Keep Question Analyzer, Structured Intent, Book Retriever, Context Builder, Prompt Builder, and Gemini Service as logical modules within the same Edge Function. Validate action/input, retrieve only matching/current database records with approved ordering, build bounded context, and treat model output as untrusted explanatory text. For search, include relevant books regardless of availability and return explicit no-match/out-of-scope results. For summaries, retrieve only the selected book and reject/describe insufficient data. For recommendations, obtain Reader history only when the authenticated actor is that Reader, use popular books for a Reader without history, and cap at five database-backed candidates. Never rely on the model to invent catalog facts. Store Gemini credentials in Supabase secrets/environment configuration, keep them out of frontend bundles and logs, and map provider failures to safe errors.

## Statistics and Reporting Strategy

Define overdue consistently as borrowing status plus `due_date < current_date`. Dashboard overdue counts must cover all relevant loans, independent of the recent-loans widget. Aggregate loan rankings and popular books across the complete authorized dataset; apply no arbitrary 50/100 row cap. Verify total counts, unpaid fine sums, category distributions, and report exports against complete filtered data. Keep role scope and current filters in place for exports. Reservation ordering uses `reserved_date` ascending. DB-010 remains an application/database boundary observation; add a view/RPC only if needed by the selected implementation boundary.

## UX/Validation Strategy

Validate user inputs in the UI for immediate feedback and again at trusted backend/database boundaries. Show actionable loading, success, empty, and error states; map internal/provider/database failures to safe user messages without stack traces. Complete account recovery through Supabase Auth. Add pagination to large interactive lists where needed, while ensuring aggregate and export queries still cover all authorized matching records. Keep responsive behavior and existing component/page/lib/context separation.

## Testing Required Per Batch

Verification below is planned for the implementation phase; no tests are run or added by this planning task.

| Batch | Required verification |
|---|---|
| 1 | Attempt profile self-update of role/card_status as Reader and confirm rejection; verify safe profile edits still work; call protected operation with missing/invalid session and forged role/readerId and confirm denial or session-derived behavior; verify Admin/Librarian flows remain authorized. |
| 2 | As Librarian, attempt direct settings insert/update and confirm denial; as Admin, verify valid update succeeds and invalid values fail at trusted boundary. |
| 3 | Test active and inactive Reader, non-Reader target, zero/one available copies, forged due date, configured period, and concurrent last-copy borrow through the RPC. |
| 4 | Apply migration against representative valid data; verify invalid inventory, enum, count, fine, and settings values are rejected; verify valid existing workflows continue. Check preexisting data before constraint application. |
| 5 | Verify eligible renewal changes due date/count together; reject returned, overdue, maxed-out, and reservation-conflict cases; reject direct bypass paths. |
| 6 | Verify unavailable-only creation, duplicate pending rejection under concurrent requests, caller cannot select initial state, Reader can cancel own reservation only, staff transitions are authorized, FIFO by reserved_date, and fulfillment coordination is consistent. |
| 7 | Return late with configured fine rate and verify exact days × rate; missing settings fails safely; on-time return creates no fine; duplicate/inconsistent fines rejected; Reader sees own fine only; Admin/Librarian can mark paid; display and report estimates agree with settings. |
| 8 | Test each allowed reader_type and invalid metadata; public signup always creates active Reader; test complete staff Reader creation and role restrictions. |
| 9 | Confirm deletion blocked for borrowing loan/pending reservation; historical returned/cancelled/fulfilled rows remain queryable after allowed archive/delete behavior; no cascade removes transaction history. Escalate if approved requirements cannot be met safely. |
| 10 | Fixture more than 100 loans and more than 5 recent loans; compare overdue counts and rankings to full-dataset expected values; test due date equality and overdue boundary; verify reports and reservation FIFO ordering with large result sets and role scope. |
| 11 | Verify authenticated and unauthenticated requests, forged role/readerId, Gemini secret absence from browser/logs, all three actions, matching unavailable books, no results, out-of-scope requests, insufficient summary data, recommendation privacy and five-result maximum, catalog-grounded outputs, safe provider errors, and loading state. Confirm Batch 1 identity logic is reused. |
| 12 | Exercise invalid and valid form inputs, loading/error/success states, account recovery, pagination navigation, responsive layouts, and ensure pagination does not truncate aggregate/export results. |

## Rollback/Risk Notes

- Each batch should be a separate commit and migration where applicable, enabling targeted review and rollback planning.
- Policy/RPC replacements can deny legitimate workflows if role or ownership assumptions differ from deployed data; verify against intended Admin/Librarian/Reader paths.
- Constraints may fail on existing invalid rows; inspect before deployment and avoid unreviewed data loss or coercion.
- Transactional RPC signature changes require coordinated frontend updates and backward-compatibility review for deployed callers.
- DB-009 has a genuine tension between state-based physical deletion and retaining historical foreign-key references. Do not cascade or remove integrity protection. If archive/inactive state changes approved behavior or physical deletion cannot preserve history, record the tradeoff and seek human review before implementation.
- Statistics and exports may expose authorization or truncation defects if moved across boundaries; verify RLS/role scope and complete-result behavior.
- Gemini availability, quota, and model behavior can vary; keep outcomes bounded, errors safe, and secrets server-side. Model/version and timeout choices are implementation details, not new requirements.
- No additional independently deployed services, vector database, queue, or orchestration platform is planned.

## Requirement/Issue Traceability

| Batch | DB findings | Requirements / acceptance criteria / architecture traceability |
|---|---|---|
| 1 | DB-001 | FR-002, FR-004, FR-017; AC-002.2–002.3, AC-003.x–005.x, AC-022.1–022.2; US-002–US-005, US-022; AD-002 |
| 2 | DB-002 | FR-002, FR-013; AC-017.1–017.3; US-017; AD-002 |
| 3 | DB-003 | FR-005–FR-006, BR-003; AC-008.1–008.5; US-008; AD-003 |
| 4 | DB-004 | FR-001, FR-003, FR-007–FR-010, FR-013; BR-001–BR-007; AC-006.2, AC-009.4, AC-017.3; NFR-004; AD-003 |
| 5 | DB-005 | FR-008, BR-005; AC-011.1–011.3; US-011; AD-003 |
| 6 | DB-006 | FR-002, FR-009; BR-006; AC-012.1–012.3, AC-013.1–013.4; US-012–US-013; AD-003 |
| 7 | DB-007 | FR-007, FR-010, FR-013; BR-007; AC-010.1–010.5, AC-014.1–014.2, AC-017.2–017.4; US-010, US-014, US-017; AD-003, AD-008 |
| 8 | DB-008 | FR-001; BR-001; AC-001.1–001.5; US-001; AD-001 |
| 9 | DB-009 | FR-003; BR-002; AC-006.1, AC-006.4; US-006; AD-003 |
| 10 | DB-010 | FR-007, FR-009, FR-011, FR-012; AC-010.1–010.2, AC-013.3, AC-015.1–015.4, AC-016.x, AC-023.x; US-010, US-013, US-015, US-016, US-023; architecture database/data access and reporting sections |
| 11 | None assigned | FR-014–FR-017; NFR-002, NFR-007, NFR-010; AC-018.x–AC-020.x, AC-022.2–022.4; US-018–US-020, US-022; AD-004–AD-006; approved architecture current AI implementation alignment risk |
| 12 | Cross-cutting, including DB-004/DB-008 verification | FR-001, FR-017; NFR-001–NFR-008; AC-001.x, AC-021.x–AC-022.x; US-001, US-021–US-022; AD-008 |

All DB-001 through DB-010 findings remain Open until implemented and verified under the project's issue process.

## Definition of Done

- Every DB-001 through DB-010 finding has an implementation batch, concrete verification, and traceability above.
- All listed application-level gaps are assigned to batches.
- Critical/high security and database findings precede lower severity work.
- Every database change uses a new migration; historical migration files are not rewritten without human approval.
- Trusted authorization is enforced at RLS, RPC, or verified backend boundaries; frontend guards alone are insufficient.
- AI uses the approved Gemini architecture and reuses Batch 1's authenticated identity foundation.
- Statistics and reporting operate on complete authorized datasets; overdue semantics are consistent.
- DB-009 handling preserves historical transaction records and does not plan destructive cascades.
- Each batch has specific verification and a small, separate Git commit scope in the checklist.
- No finding is marked Resolved in planning.
- Implementation verification for the applicable batch is complete before that batch's issue status is changed.

