# Database Review

## Review Scope

This is a review of the existing Supabase database implementation against the approved requirements and architecture. Inputs reviewed: `docs/requirements.md`, `docs/user-stories.md`, `docs/acceptance-criteria.md`, `docs/requirements-approval.md`, `docs/architecture.md`, `docs/architecture-decisions.md`, `docs/architecture-approval.md`, and the only migration present, `supabase/migrations/20260802035946_library_schema.sql`.

The migration is the only database implementation artifact found under `supabase/migrations/`. This review does not inspect a live Supabase instance, so it reports what the checked-in migration defines and does not claim to verify deployed schema drift or grants configured outside the migration.

## Database Overview

The migration defines six application tables: `profiles`, `books`, `loans`, `reservations`, `fines`, and `settings`. RLS is enabled on all six. It defines `is_staff()` and `is_admin()` helper functions, a signup trigger/function that creates profiles, and two security-definer RPC functions: `borrow_book()` and `return_book()`.

The approved architecture treats PostgreSQL as the source of truth, calls for RLS and trusted authorization, and recommends database constraints and transactional RPCs for invariants and coordinated writes (AD-003; architecture sections 48–50, 74, 83–85). The current migration has useful building blocks, but several approved rules are not enforced by its schema/functions.

## Tables and Responsibilities

| Table | Defined purpose and notable columns |
|---|---|
| `profiles` | Auth user profile and reader record; `id`, name/contact, `role`, `reader_type`, `card_status`. |
| `books` | Catalog title and aggregate inventory; unique `book_code`, `quantity`, `available`, bibliographic fields. |
| `loans` | One book/reader circulation record; borrow/due/return dates, `status`, `renewed_count`. |
| `reservations` | Book/reader reservation; `reserved_date`, `status`, note. |
| `fines` | Loan and reader fine with amount, overdue days, paid flag. |
| `settings` | Library name, loan period, renewal limit/days, fine rate; integer primary key defaulting to 1. |

## Relationships

- `profiles.id` references `auth.users(id)` with `ON DELETE CASCADE`.
- `loans.book_id` references `books.id` and `loans.reader_id` references `profiles.id`, both `ON DELETE RESTRICT`.
- `reservations.book_id` references `books.id` and `reservations.reader_id` references `profiles.id`, both `ON DELETE RESTRICT`.
- `fines.loan_id` references `loans.id` and `fines.reader_id` references `profiles.id`, both `ON DELETE RESTRICT`.
- The migration does not declare a constraint ensuring `fines.reader_id` matches the reader on the referenced loan.

These foreign keys prevent orphaned circulation/fine rows. They also prevent deleting a book that has any reservation, even a cancelled/fulfilled one; the approved rule specifically calls out pending reservations and active loans (DB-009).

## Constraints and Integrity Rules

Declared constraints include primary keys, `books.book_code UNIQUE NOT NULL`, required columns, and the foreign keys above. Indexes cover book title/author/category; loan book/reader/status; reservation book/reader; fine reader/loan. There are no declared CHECK constraints for inventory bounds, enum-like values, nonnegative settings/counts/fines, or date/status consistency. `settings.id` is not constrained to a single row or specifically to id 1; the seed inserts id 1 only if absent.

The unique `book_code` requirement is enforced. The approved `0 <= available <= quantity` rule is not enforced against direct table writes. Other rules such as allowed roles and reader types, valid states, and settings input ranges lack database constraints (DB-004, DB-008).

## RLS Review

RLS is enabled on every application table in the migration. Policies target `authenticated` for reads/writes, except helper/trigger functions which use security-definer behavior.

- `profiles`: a user can select their own row; staff can select all. The update policy permits own-row updates without column restrictions. This includes `role` and `card_status`, so a reader can promote their own profile or change card status. Staff access also does not distinguish Admin from Librarian for profile changes. See DB-001.
- `books`: all authenticated users can read catalog rows; staff can insert/update/delete. This aligns with catalog visibility and staff management at the broad role level.
- `loans` and `fines`: readers can select rows whose `reader_id = auth.uid()`; staff can select all and perform mutations. Reader ownership filters align with the approved own-data restriction, but direct business mutations rely on policy/function access rather than full rule enforcement.
- `reservations`: readers can select their own and insert rows where their reader id matches their identity; staff can also insert/update/delete. The insert policy does not validate availability, pending uniqueness, or initial status. Readers have no update policy to cancel their own reservation, despite the approved cancellation rule; staff can update any reservation (DB-006 and role capability gap).
- `settings`: every authenticated user can select. The insert/update policies use `is_staff()`, which allows both Admin and Librarian to change settings, contrary to Admin-only FR-013/AC-017 (DB-002).

The `is_admin()` helper exists but is not used by the settings policies. There is no policy-level distinction between Admin and Librarian for other staff operations that the approved matrix differentiates, including Librarian’s inability to manage Librarian accounts. The database profile update rule also makes role self-service possible, which undermines all `is_staff()` decisions (DB-001).

## RPC / Function Review

`is_staff()` and `is_admin()` are SQL, `SECURITY DEFINER`, `STABLE` helpers with `search_path = public`; they derive role from `profiles` using `auth.uid()`.

`handle_new_user()` is a `SECURITY DEFINER` trigger function with `search_path = public`, invoked after `auth.users` insertion. It hardcodes `role='reader'` and `card_status='active'`, which supports the public-registration role rule. It copies `reader_type` from user metadata with a default of `student` but does not validate it. Full name also falls back to a default string. Email uniqueness is delegated to Supabase Auth; `profiles.email` itself is nullable and not unique. No password column is stored in `profiles`.

`borrow_book(p_book_id, p_reader_id, p_due_date, p_note)` checks `is_staff()`, locks the target book row `FOR UPDATE`, rejects absent books or `available < 1`, decrements availability, inserts a loan, and returns its id. Its concurrency behavior is described below. It accepts the reader and due date from arguments and does not check reader card status or calculate due date from settings (DB-003).

`return_book(p_loan_id)` checks `is_staff()`, locks the loan row `FOR UPDATE`, rejects a missing/already returned loan, updates the loan to returned with `CURRENT_DATE`, increments the related book’s availability, and for late returns computes days as `CURRENT_DATE - due_date` and inserts an unpaid fine using `settings.id = 1`. If that settings lookup returns NULL, the exact function behavior sets `v_fine_per_day := 5000` before calculating the fine (DB-007). The migration seeds settings id 1 with `fine_per_day=5000`; therefore divergence occurs only if id 1 is absent or its `fine_per_day` is NULL, which the current table definition permits. This review does not assert divergence for the seeded, valid settings row.

There is no renewal RPC/function in the migration. No DB function defines reservation fulfillment, FIFO queue allocation, cancellation by owner, or statistics. Architecture allows some computations in another layer; these absences are noted as database/application boundary observations where no exclusive database implementation is mandated (DB-010), while missing enforcement of explicit invariants is reported separately.

## Loan and Return Review

The migration supports atomic loan creation and return/fine updates within each PostgreSQL function call: statements in a function execute in the surrounding transaction, and exceptions abort the transaction. `borrow_book` locks the book row before reading availability and updating it. For two borrowers competing for the last copy, the second transaction waits for the first row lock, then reads the updated committed row under PostgreSQL’s normal READ COMMITTED behavior and rejects `available < 1`. Thus this specific implementation does not allow both RPC calls to consume the same final copy, assuming calls execute against this function and the transaction uses the default isolation level. Its decrement is not an atomic conditional `UPDATE ... WHERE available > 0`, but row locking plus validation and decrement is sufficient for this RPC path.

`return_book` locks the loan row, so concurrent attempts to return the same loan serialize; after the first commits the second sees `status='returned'` and raises before inventory/fine changes. The status update, availability increment, and late fine insert occur within the same function transaction, so an error rolls the coordinated changes back. Distinct loan returns increment availability separately and atomically at row-update level. However, since the schema has no upper-bound check on availability and direct staff writes are allowed by RLS, malformed data or non-RPC writes can still violate inventory bounds (DB-004).

The RPCs do not enforce active reader status, configured loan-period-derived due dates, or idempotency beyond return status. Return fine logic uses the current date and correct one-day-after calculation. Direct staff inserts/updates allowed by RLS can bypass the RPC coordination unless application code consistently routes those operations through RPCs; the migration does not revoke or otherwise prevent such direct writes (DB-003/DB-007 and DB-004).

## Reservation Review

The table records status/date and has reader/book foreign keys and lookup indexes. It has no unique partial index for one pending reservation per reader/book, no database condition requiring `available=0`, and no status check. The RLS insert rule allows a reader to submit their own row with any status and any book. The migration has no reservation RPC to atomically create/fulfill a reservation alongside loan creation or to select the oldest pending reservation. FIFO requires ordering by `reserved_date`; the column exists, but no tie-breaker or operation is defined. These missing enforcement and operation gaps are DB-006. Whether application code supplies queue processing is not verifiable from the migration.

## Fine Review

Fines reference a loan and reader and store `amount numeric`, `days_overdue int`, and `paid boolean DEFAULT false`. `return_book` creates a fine for late returns, using calendar-date subtraction and `days_overdue * fine_per_day`, with paid false. The table does not constrain amount/days to nonnegative values, guarantee reader matches loan, or limit a loan to a single fine. Staff can insert/update/delete fines directly under RLS; readers can select only their own fine rows. The fallback behavior and its precise condition are documented under RPC review and DB-007.

## Settings Review

The settings table includes the approved fields and defaults. It lacks checks for nonempty library name, positive loan/renewal days, nonnegative max renewals, and integer nonnegative fine rate (the column is `numeric`, so non-integer amounts are representable). RLS permits all authenticated users to read and all staff roles to insert/update; Admin-only modification is not enforced (DB-002, DB-004). Functions assume the singleton row is id 1; the schema allows other ids and does not require id 1 to exist.

## Role and Ownership Review

The schema uses text roles with default `reader`; accepted names are not constrained. The signup trigger always assigns reader, but profile self-update permits changing role. `is_staff()` recognizes admin/librarian, while `is_admin()` recognizes admin, but settings policy uses `is_staff()`. Reader ownership of loan/fine/reservation SELECT is based on `auth.uid()` and profile id, which is consistent with the chosen shared profile identity. Reader profile fields are scoped to self on SELECT but mutable self fields include security-sensitive role/card state. Reader types `student`, `teacher`, `staff`, `guest` are represented by a text column with default `student`, but values are not checked. See DB-001, DB-002, DB-004, DB-008.

## Transaction Safety Review

- **Create loan:** `borrow_book` performs the role check, locks a book row, validates stock, decrements stock, and inserts the loan in one function transaction. Row locking serializes concurrent borrowers; the last available copy cannot be consumed twice through this RPC. The function does not validate active card status or derive due date from settings. Direct inserts and book updates remain available to staff under RLS.
- **Return loan:** `return_book` locks the loan, rejects already returned loans, and transactionally updates status/date, increments inventory, and optionally inserts the fine. Concurrent duplicate returns serialize and only one succeeds. No database check constrains the resulting inventory upper bound.
- **Fine creation:** fine insertion shares the return transaction, so the return and fine are atomic. The function’s configured-rate lookup/fallback condition is documented under DB-007.
- **Reservation to loan coordination:** no function coordinates pending reservation fulfillment with loan creation; FIFO and atomic state transition are not implemented in this migration.

## Requirement-to-Database Traceability

| Approved requirement(s) | Database evidence / assessment |
|---|---|
| FR-001, BR-001; AC-001.2–001.5 | Auth trigger hardcodes Reader and active status; reader type is copied but not constrained. Auth owns email uniqueness; no application password column. DB-008. |
| FR-002, FR-004; AC-003.x–005.x | `is_staff`/`is_admin` and RLS exist. Own-profile update permits privilege fields; settings does not distinguish Admin; Librarian/Admin account management boundary is not modeled. DB-001, DB-002. |
| FR-003, BR-002; AC-006.2, AC-006.4 | `book_code` unique. No quantity/availability CHECK. FK restricts deletion for any loan/reservation; no explicit pending-state rule. DB-004, DB-009. |
| FR-005–FR-006; AC-008.1–008.5 | Staff-only RPC, stock row lock and decrement exist. Reader active status and settings-derived due date are not enforced. DB-003. Concurrent last-copy borrowing is serialized safely by row lock and post-lock validation. |
| FR-007, NFR-004; AC-009.x–010.2 | Return RPC locks loan, updates return date/status and inventory; dynamic overdue calculation follows calendar-day rule. No schema upper bound on inventory. DB-004. |
| FR-008, BR-005; AC-011.x | Renewal columns/settings exist, but no renewal function or database enforcement for eligibility, count, due-date update, or pending reservations. DB-005. |
| FR-009, BR-006; AC-012.x–013.x | Reservation records exist; availability gate, pending uniqueness, owner cancellation, FIFO operation, and fulfillment transition are not enforced in migration. DB-006. |
| FR-010, BR-007; AC-010.3–010.5, AC-014.x | Return function calculates and creates unpaid late fine transactionally. Fine constraints/one-per-loan/reader-loan consistency absent; configured-rate fallback condition recorded in DB-007. |
| FR-011; AC-015.1 | No statistics view/RPC in migration. Approved architecture permits database and application queries; implementation layer for complete rankings is not established by migration (DB-010 observation). |
| FR-013; AC-017.x | Fields/defaults exist, but validation checks absent and `is_staff` grants Librarian settings write. DB-002, DB-004. |
| FR-017; AC-005.2, AC-022.x | RLS enabled for all six tables. Reader SELECT scoping exists for business rows, but profile privilege escalation and policy role gaps undermine boundaries. DB-001, DB-002. |
| NFR-004; AD-003 | RPC transaction and row-lock handling protect the RPC borrow/return paths; CHECK constraints/direct-write restrictions do not protect all paths. DB-004. |

## Summary of Findings

The highest-risk issue is that a reader can update their own `role` in `profiles`, which can make the session satisfy `is_staff()` and bypass staff-only policy/function checks (DB-001). Settings writes likewise use the broad staff helper instead of Admin-only checks (DB-002). The circulation RPCs provide meaningful transaction and concurrency protection for inventory/returns, but do not enforce all eligibility/configuration rules and schema constraints do not protect direct writes. Reservations and renewals lack required database operations/enforcement. Findings and classifications are enumerated in `docs/database-issues.md`.

## Database Risks / Open Questions

- The review is migration-based; deployed objects, grants, later manual SQL, and production data were not inspected.
- The approved architecture allows some behavior in trusted application code. The migration alone cannot establish whether application routes compensate for missing database operations; findings distinguish that boundary from proven policy/schema behavior.
- The schema has no explicit database CHECK constraints for settings and inventory invariants, so safety depends on trusted write paths outside the RPCs.
- Role provisioning for legitimate Admin/Librarian users is intentionally unspecified in approved architecture; this review flags privilege self-editing, not the absence of a provisioning workflow.
- Reservation cancellation and fulfillment permissions/state transitions need a clarified implementation boundary if they are not to be enforced in PostgreSQL; no new business rules are assumed here.
