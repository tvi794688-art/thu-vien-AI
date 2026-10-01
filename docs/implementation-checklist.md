# Implementation Checklist

Each batch is planned as a small implementation unit and a separate Git commit. Status values describe planning only; all items begin as Planned. Database changes, where identified, use new migrations and do not modify the historical migration.

## Batch 1 — Trusted identity and privilege boundary

- **Batch ID:** IMP-01
- **Objective:** Prevent profile self-promotion and establish verified Supabase session identity/role derivation for trusted backend actions. Later AI work must reuse this boundary.
- **Priority:** Critical
- **Related DB issue(s):** DB-001
- **Related application issue(s):** AI backend currently does not visibly verify Supabase session; client supplied role/readerId must not be authoritative; protect profile role/card status.
- **Related FR/NFR/AC:** FR-002, FR-004, FR-017; AC-002.2–002.3, AC-003.x–005.x, AC-022.1–022.2; US-002–US-005, US-022; AD-002.
- **Expected files/components affected:** New migration for profile policies/trusted checks; `src/context/AuthContext.tsx`; `src/pages/ReadersPage.tsx`; shared authenticated request/backend boundary; potentially AI function only to establish/reuse this common boundary.
- **Planned database migration if needed:** Yes. Add a new migration that separates safe self-profile changes from privileged role/card changes and protects trusted role checks. Do not modify the historical migration.
- **Planned source changes:** Use verified session and trusted profile for actor identity and role; reject or ignore caller role/readerId authority; preserve legitimate account management through authorized trusted paths. Do not invent an unapproved staff provisioning workflow.
- **Verification steps:** As Reader, attempt role/card_status self-update and confirm rejection; test allowed profile edits; attempt protected actions with absent/invalid session and forged role/readerId; verify Admin/Librarian permissions still work.
- **Expected Git commit scope:** `security: protect profile privileges and establish trusted session identity`
- **Status:** Planned

## Batch 2 — Admin-only settings

- **Batch ID:** IMP-02
- **Objective:** Enforce Admin-only Settings changes in the trusted data boundary and align UI behavior/validation.
- **Priority:** High
- **Related DB issue(s):** DB-002
- **Related application issue(s):** Settings permissions must match Admin-only requirement; current UI role guard is not trusted enforcement.
- **Related FR/NFR/AC:** FR-002, FR-013; AC-017.1–017.3; US-017; AD-002.
- **Expected files/components affected:** New migration for settings policies; `src/pages/SettingsPage.tsx`; `src/App.tsx`; `src/components/Layout.tsx`.
- **Planned database migration if needed:** Yes, Admin-only settings insert/update policy changes in a new migration.
- **Planned source changes:** Align page/action visibility and field validation; show useful result/error feedback.
- **Verification steps:** Direct Librarian settings insert/update is denied; Admin valid update succeeds; invalid settings rejected by trusted boundary; settings remain readable according to approved rules.
- **Expected Git commit scope:** `security: restrict settings writes to admins`
- **Status:** Completed — Database/RLS enforcement deployed and runtime verified; Admin-only UI access, validation, success/error feedback, and unauthorized navigation behavior verified.

## Batch 3 — Borrow eligibility and configured due date

- **Batch ID:** IMP-03
- **Objective:** Validate Reader eligibility and compute due date from approved settings in the trusted borrow operation.
- **Priority:** High
- **Related DB issue(s):** DB-003
- **Related application issue(s):** Borrow form currently sends reader and due date from client state; enforce active Reader and configured loan period server side.
- **Related FR/NFR/AC:** FR-005–FR-006; BR-003; AC-008.1–008.5; US-008; NFR-004; AD-003.
- **Expected files/components affected:** New migration/RPC; `src/pages/LoansPage.tsx`; shared validation/types if needed.
- **Planned database migration if needed:** Yes, protected borrow operation update in a new migration.
- **Planned source changes:** Call trusted contract and present business-rule errors without treating client due date as authoritative.
- **Verification steps:** Test active/inactive and non-Reader targets, stock zero/one, forged due date, configured period, and simultaneous last-copy attempts; verify stock never becomes negative.
- **Expected Git commit scope:** `fix: validate borrower and derive loan due date in database`
- **Status:** Completed — Trusted borrow eligibility, configured due date, Vietnam-local borrow date, frontend integration, stock zero/one behavior, and transactional inventory protection verified. Concurrency safety is supported by the `FOR UPDATE` locking design and reviewed at the database boundary.

## Batch 4 — Database domain constraints

- **Batch ID:** IMP-04
- **Objective:** Enforce approved inventory bounds, allowed enumerations, nonnegative values, and settings constraints at the database boundary.
- **Priority:** High
- **Related DB issue(s):** DB-004
- **Related application issue(s):** Ensure all write paths validate against the same approved bounds and can handle constraint errors safely.
- **Related FR/NFR/AC:** FR-001, FR-003, FR-007–FR-010, FR-013; BR-001–BR-007; AC-006.2, AC-009.4, AC-017.3; NFR-004; AD-003.
- **Expected files/components affected:** New migration with constraints; signup, book, loan, reservation, fine, settings write paths.
- **Planned database migration if needed:** Yes. Inspect existing data first; add only constraints for explicitly approved values/bounds.
- **Planned source changes:** Align validation and map constraint errors to useful messages.
- **Verification steps:** Check existing records before migration; prove invalid bounds/enums/values are rejected and valid workflows persist; confirm no unreviewed row mutation is needed.
- **Expected Git commit scope:** `db: enforce approved domain constraints`
- **Status:** Planned

## Batch 5 — Protected renewal operation

- **Batch ID:** IMP-05
- **Objective:** Route loan renewals through one trusted operation enforcing all approved eligibility checks and atomic due-date/count updates.
- **Priority:** High
- **Related DB issue(s):** DB-005
- **Related application issue(s):** Current renewal logic writes loan changes directly from the frontend.
- **Related FR/NFR/AC:** FR-008; BR-005; AC-011.1–011.3; US-011; AD-003.
- **Expected files/components affected:** New migration/RPC; `src/pages/LoansPage.tsx`.
- **Planned database migration if needed:** Yes, add a renewal operation and restrict bypass writes as appropriate.
- **Planned source changes:** Replace direct update with RPC; refresh data and show success/error state.
- **Verification steps:** Eligible loan increments due date/count; reject returned, overdue, maxed-out, reservation-conflict, and unauthorized requests; attempt direct bypass.
- **Expected Git commit scope:** `fix: enforce loan renewal rules transactionally`
- **Status:** Planned

## Batch 6 — Reservation lifecycle

- **Batch ID:** IMP-06
- **Objective:** Enforce availability, duplicate-pending, authorization, FIFO, cancellation, and fulfillment rules at a trusted boundary.
- **Priority:** High
- **Related DB issue(s):** DB-006
- **Related application issue(s):** Reservation creation/status updates currently write directly from frontend; integrate fulfillment with loan creation.
- **Related FR/NFR/AC:** FR-002, FR-009; BR-006; AC-012.1–012.3, AC-013.1–013.4; US-012–US-013; AD-003.
- **Expected files/components affected:** New migration/index/RPC where required; `src/pages/ReservationsPage.tsx`; `src/pages/LoansPage.tsx`.
- **Planned database migration if needed:** Yes, add concurrency-safe uniqueness and trusted operations/policies as required.
- **Planned source changes:** Use trusted create/cancel/state-transition calls and display appropriate feedback.
- **Verification steps:** Test available/unavailable books, concurrent duplicate requests, initial status enforcement, owner/staff cancellation permissions, FIFO order, loan fulfillment transition, and no automatic expiry.
- **Expected Git commit scope:** `fix: enforce reservation lifecycle and queue rules`
- **Status:** Planned

## Batch 7 — Fine consistency and payment

- **Batch ID:** IMP-07
- **Objective:** Use the configured fine rate consistently, protect fine integrity, and complete payment marking and own-fine viewing.
- **Priority:** Medium
- **Related DB issue(s):** DB-007
- **Related application issue(s):** Fine display/reporting fallback inconsistency; fine payment flow incomplete.
- **Related FR/NFR/AC:** FR-007, FR-010, FR-013; BR-007; AC-010.1–010.5, AC-014.1–014.2, AC-017.2–017.4; US-010, US-014, US-017; AD-003, AD-008.
- **Expected files/components affected:** New migration; return/fine RPC; `src/pages/LoansPage.tsx`; `src/pages/StatisticsPage.tsx`; `src/pages/ReportsPage.tsx`; fine components/types.
- **Planned database migration if needed:** Yes, guarantee/configure required settings behavior and add approved fine integrity constraints/payment path protections.
- **Planned source changes:** Add authorized paid-state action, Reader own-fine presentation, use `settings.fine_per_day` for estimates and summaries, and surface safe outcomes.
- **Verification steps:** Late and on-time return calculations; missing settings fails clearly; duplicate/inconsistent fine rejection; Reader ownership; staff payment permission; compare loan display and report estimate against configured rate.
- **Expected Git commit scope:** `fix: use configured fine rate and complete fine payments`
- **Status:** Planned

## Batch 8 — Reader type validation and creation

- **Batch ID:** IMP-08
- **Objective:** Validate approved reader types and finish public signup/staff Reader creation without exposing staff roles publicly.
- **Priority:** Medium
- **Related DB issue(s):** DB-008
- **Related application issue(s):** Reader creation flow incomplete; signup metadata needs trusted validation.
- **Related FR/NFR/AC:** FR-001, FR-004; BR-001; AC-001.1–001.5, AC-003.1–003.2, AC-004.1; US-001, US-003–US-004.
- **Expected files/components affected:** New migration/signup trigger; `src/context/AuthContext.tsx`; `src/pages/LoginPage.tsx`; `src/pages/ReadersPage.tsx`; account forms.
- **Planned database migration if needed:** Yes, validate reader_type in signup/profile persistence.
- **Planned source changes:** Complete required creation form/actions and validate fields; public signup always requests Reader role and active status through trusted path.
- **Verification steps:** Test four valid reader types and invalid metadata; public signup cannot create Admin/Librarian; confirm active Reader profile and staff-specific Reader creation permissions.
- **Expected Git commit scope:** `feat: complete reader creation and validate reader type`
- **Status:** Planned

## Batch 9 — Controlled book deletion with history retention

- **Batch ID:** IMP-09
- **Objective:** Align book deletion blockers with approved active states while retaining historical loans/reservations and referential integrity.
- **Priority:** Medium
- **Related DB issue(s):** DB-009
- **Related application issue(s):** Book deletion must give a clear blocked/archive result and preserve history.
- **Related FR/NFR/AC:** FR-003; BR-002; AC-006.1, AC-006.4; US-006; AD-003.
- **Expected files/components affected:** New migration or controlled database operation if required; `src/pages/BooksPage.tsx`; deletion confirmation/feedback UI.
- **Planned database migration if needed:** Conditional. Prefer a controlled deletion that blocks borrowing loans and pending reservations and preserves historical rows. Do not cascade delete history or remove referential protection. Use an archive/inactive state only if consistent with approved requirements. If safe physical deletion is incompatible with preserving history, document the tradeoff and obtain a separate human decision before implementation.
- **Planned source changes:** Invoke the controlled path and explain blockers or archived state; do not imply physical deletion if archived.
- **Verification steps:** Active loan and pending reservation block removal; historical returned/cancelled/fulfilled data remains queryable; allowed removal/archive preserves history; confirm no cascading transaction loss.
- **Expected Git commit scope:** `fix: preserve circulation history in book removal`
- **Status:** Planned

## Batch 10 — Complete overdue/statistics/reporting and FIFO verification

- **Batch ID:** IMP-10
- **Objective:** Calculate overdue and all required statistics over complete authorized datasets and verify reservation ordering/reporting.
- **Priority:** Low DB finding; required application behavior
- **Related DB issue(s):** DB-010
- **Related application issue(s):** Dashboard overdue count uses recent five loans; loans overdue filter omits due-date condition; popular/statistical queries use limits; statistics and reports need complete aggregation.
- **Related FR/NFR/AC:** FR-007, FR-009, FR-011, FR-012; AC-010.1–010.2, AC-013.3, AC-015.1–015.4, AC-016.x, AC-023.x; US-010, US-013, US-015, US-016, US-023.
- **Expected files/components affected:** `src/pages/Dashboard.tsx`; `src/pages/LoansPage.tsx`; `src/pages/StatisticsPage.tsx`; `src/pages/ReportsPage.tsx`; `src/pages/ReservationsPage.tsx`; query helpers; optional new migration.
- **Planned database migration if needed:** Conditional only if complete authorized aggregation/order cannot be safely supported by application queries; then add narrowly scoped view/RPC in a new migration.
- **Planned source changes:** Use `status=borrowing` and `due_date < current_date`; compute full counts/rankings/totals; preserve role/filter scope; order reservation work by reserved_date.
- **Verification steps:** Compare dashboard with all loans when recent-five differs; test due date today versus yesterday; test more than 100 records and complete rankings/totals/exports; verify FIFO and role-filtered result scope.
- **Expected Git commit scope:** `fix: aggregate overdue statistics and reports completely`
- **Status:** Planned

## Batch 11 — Gemini RAG migration

- **Batch ID:** IMP-11
- **Objective:** Migrate current AI behavior to the approved Gemini and modular RAG design, reusing Batch 1 session identity and authorization.
- **Priority:** High security/architecture alignment; dependent on IMP-01
- **Related DB issue(s):** None assigned. DB-010 is not an AI finding.
- **Related application issue(s):** Replace OpenAI-compatible implementation; server-only Gemini key; verified Supabase session; no client-authoritative role/readerId; authenticated Reader history; no hallucinated books/authors; relevant-record retrieval; do not exclude matching books solely when available=0; retain search, summary, recommendation; explicit no-result, insufficient-data, out-of-scope handling.
- **Related FR/NFR/AC:** FR-014–FR-017; NFR-002, NFR-007, NFR-010; AC-018.1–018.6, AC-019.1–019.4, AC-020.1–020.5, AC-022.2–022.4; US-018–US-020, US-022; AD-004–AD-006; approved architecture's current AI implementation alignment risk.
- **Expected files/components affected:** `supabase/functions/ai-library/index.ts` and logical modules within the Edge Function; `src/lib/ai.ts`; `src/pages/AIChatPage.tsx`; `src/pages/AISummaryPage.tsx`; `src/pages/AIRecommendPage.tsx`; server secret configuration.
- **Planned database migration if needed:** No expected migration. Retrieval may use approved existing catalog/loan data under an appropriately scoped session context; add DB objects only if independently justified by requirements and architecture.
- **Planned source changes:** Implement Question Analyzer → Structured Intent → Book Retriever → Context Builder → Prompt Builder → Gemini Service → Answer as logical modules inside the single function. Reuse IMP-01 verified identity; bounded relevant context; retrieve catalog books irrespective of availability for matching; derive Reader history from authenticated Reader; Gemini key and call remain server side; map expected no-result/insufficient/out-of-scope and provider errors; send user's authenticated session from frontend.
- **Verification steps:** Test session absence/invalidity and forged identities; confirm shared IMP-01 boundary is reused; test all three actions and role availability; matching available=0 book; no matches, out-of-scope, insufficient summary, recommendation with/without Reader history and staff privacy; verify no invented book/authors, max five results, bounded context, loading/safe errors, and key absent from browser/logs.
- **Expected Git commit scope:** `feat: migrate library AI to authenticated Gemini RAG`
- **Status:** Planned

## Batch 12 — Validation, feedback, pagination, and recovery

- **Batch ID:** IMP-12
- **Objective:** Finish cross-cutting input validation, loading/error/success feedback, needed pagination, and account recovery.
- **Priority:** Normal, after core security/business paths
- **Related DB issue(s):** None additional; verify interaction with DB-004 and DB-008.
- **Related application issue(s):** UX improvements include validation, loading/error feedback, pagination where needed, and incomplete account recovery flow.
- **Related FR/NFR/AC:** FR-001, FR-017; NFR-001–NFR-008; AC-001.x, AC-021.1–021.4, AC-022.2–022.4; US-001, US-021–US-022; AD-008.
- **Expected files/components affected:** `src/pages/LoginPage.tsx`; `src/context/AuthContext.tsx`; shared UI/components; forms and list pages; query helpers.
- **Planned database migration if needed:** No new migration expected; trusted validation changes belong with relevant earlier database batches.
- **Planned source changes:** Add field-level validation, consistent pending/success/error presentation, paginated large lists, and Supabase Auth recovery interaction. Keep statistics/exports complete despite paginated UI.
- **Verification steps:** Exercise valid/invalid forms, loading and failure states, account recovery, pagination across pages, responsive screen sizes, and confirm aggregate/report outputs are not truncated by UI pagination.
- **Expected Git commit scope:** `feat: improve validation feedback pagination and recovery`
- **Status:** Planned
