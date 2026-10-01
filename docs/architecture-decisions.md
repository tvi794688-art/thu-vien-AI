# Architecture Decisions

These decisions describe the target architecture derived from the approved requirements and existing project boundaries. They do not authorize source-code, schema, migration, or requirements changes.

## AD-001 — Use a Supabase-centered client-server architecture

**Decision ID:** AD-001  
**Title:** Use a Supabase-centered client-server architecture

**Context**  
The existing project is a React + TypeScript application using Supabase, and the approved requirements specify Supabase Auth, PostgreSQL, and RLS. The system is a student library-management web project.

**Decision**  
Keep the browser application and Supabase services as the principal architecture. Use Supabase Auth, PostgreSQL/RLS, RPC where a transactional boundary is appropriate, and Supabase Edge Functions for server-side AI integration. Do not add independently deployed services or infrastructure without a requirement.

**Rationale**  
This fits the existing stack, satisfies the specified platform, and keeps deployment and operational complexity proportionate to the project.

**Alternatives Considered**  
- A separate custom application server: duplicates backend capabilities already provided by Supabase and is not required.
- Microservices for library domains: adds deployment and communication complexity without requirement support.

**Consequences**  
The frontend can use Supabase directly for RLS-protected operations. Trusted authorization remains essential at RLS, database, and Edge Function boundaries. Coordinated business writes need transactional handling.

**Related Requirements**  
FR-001, FR-002, FR-017; NFR-006, NFR-009; US-001–US-005, US-022; AC-002.x, AC-005.x, AC-022.x.

## AD-002 — Enforce authorization at trusted boundaries

**Decision ID:** AD-002  
**Title:** Enforce authorization at trusted boundaries

**Context**  
The system has Admin, Librarian, and Reader permissions. Readers may see only their own personal records. The requirements explicitly state that the backend must not trust client-provided role or reader ID when identity can be derived from the session.

**Decision**  
Use Supabase Auth to establish identity, PostgreSQL RLS and trusted operation checks to enforce data and role access, and Edge Function session verification for AI requests. Derive actor identity and role from verified session and trusted profile state. Treat frontend guards as navigation aids only. Ignore or reject client identity/role claims where derivable from the session.

**Rationale**  
Client code is modifiable by users and cannot safely enforce access boundaries. RLS and session verification align enforcement with the approved trust model.

**Alternatives Considered**  
- Rely only on hidden pages/buttons: does not protect direct API calls.
- Trust request-supplied role/reader ID: permits impersonation or unauthorized access.

**Consequences**  
RLS policies and Edge Function authorization must be reviewed alongside features. Service-role database access, if used at all, requires explicit session-derived checks and narrowly scoped queries. Staff-role provisioning remains unspecified by the approved requirements.

**Related Requirements**  
FR-002, FR-004, FR-017; BR-009; US-002–US-005, US-020, US-022; AC-002.3, AC-005.2, AC-020.5, AC-022.1–AC-022.2.

## AD-003 — Keep PostgreSQL as the source of truth and protect business invariants transactionally

**Decision ID:** AD-003  
**Title:** Keep PostgreSQL as the source of truth and protect business invariants transactionally

**Context**  
Loan, return, availability, fine, renewal, reservation, and settings behavior includes validation and related updates that must remain consistent. In particular, available inventory may not become negative.

**Decision**  
Treat Supabase PostgreSQL as the authoritative application data store. Use constraints and transactional database operations, exposed through RPC where appropriate, for coordinated changes such as loan creation and return/fine creation. Ordinary reads and operations may use the Supabase client subject to RLS. This decision does not specify or change the schema.

**Rationale**  
Database transactions keep related changes atomic and reduce race conditions around inventory and circulation state. PostgreSQL is already part of the approved technology stack.

**Alternatives Considered**  
- Independent frontend writes for each related update: can leave partial state and violate inventory invariants.
- A separate service/database: unnecessary for the project and introduces consistency overhead.

**Consequences**  
Implementation must decide which operations need RPC and ensure role checks, validation, and transaction semantics. Existing migration contents are not changed by this decision.

**Related Requirements**  
FR-003, FR-005–FR-011, FR-013; BR-002–BR-008; NFR-004; US-006–US-017; AC-006.x–AC-017.x.

## AD-004 — Keep the RAG pipeline as logical modules inside one Edge Function architecture

**Decision ID:** AD-004  
**Title:** Keep the RAG pipeline as logical modules inside one Edge Function architecture

**Context**  
Approved AI requirements prescribe Question Analyzer, Structured Intent, Book Retriever, Context Builder, Prompt Builder, and Gemini Service stages. The project already has a Supabase Edge Function boundary, and no requirement calls for independently deployed AI services.

**Decision**  
Implement each named responsibility as a logical module/function within the Supabase Edge Function architecture. The request flow is Question → Question Analyzer → Structured Intent → Book Retriever → Context Builder → Prompt Builder → Gemini Service → Answer. Keep the modules separately understandable and testable, but deploy them together within the Edge Function boundary.

**Rationale**  
This preserves required separation of concerns without introducing unnecessary services, networking, deployment, or operational infrastructure.

**Alternatives Considered**  
- Separate deployed service per RAG stage: unnecessary complexity for a student project and not required by the approved design.
- One unstructured handler: weakens the explicit modularity requirement and makes responsibilities harder to maintain.

**Consequences**  
The Edge Function remains a single server-side deployment unit while keeping analyzer, intent, retrieval, context, prompt, and model-call responsibilities distinct. Internal interfaces and module organization are implementation details.

**Related Requirements**  
FR-014–FR-016; NFR-007; US-018–US-020, US-022; AC-018.2, AC-019.4, AC-020.5, AC-022.4.

## AD-005 — Ground AI output in bounded, authorized database context

**Decision ID:** AD-005  
**Title:** Ground AI output in bounded, authorized database context

**Context**  
Search, summaries, and recommendations must use real library data, avoid invented books/content, avoid sending the full database, and protect Reader borrowing history.

**Decision**  
Retrieve relevant book records from PostgreSQL before calling Gemini. Send only bounded, task-specific context: ranked search matches; the selected book's approved fields for summary; or a limited set of candidates and permitted preference signals for recommendation. Derive the current Reader from the verified session for history access. Limit recommendations to five database-backed books. Treat Gemini output as explanatory text rather than catalog authority.

**Rationale**  
Database retrieval provides grounding and enforces the requirement that all referenced books exist. Bounded context reduces unnecessary data exposure and supports relevance.

**Alternatives Considered**  
- Send the whole catalog to Gemini: explicitly disallowed by the requirements and unnecessarily exposes data.
- Accept model-generated book identifiers/titles without retrieval validation: can produce nonexistent catalog items.
- Accept a client-supplied reader ID as the history selector: violates session-derived identity and privacy requirements.

**Consequences**  
Retrieval and ranking logic must implement the approved field priority and popularity tie-breaker. No-match and insufficient-data cases must be explicit. Reader history use must be scoped to that Reader; staff requests cannot use another Reader's private history.

**Related Requirements**  
FR-014–FR-016; BR-008–BR-009; US-018–US-020; AC-018.3–AC-018.5, AC-019.2–AC-019.4, AC-020.1–AC-020.5.

## AD-006 — Keep Gemini credentials and provider calls server-side

**Decision ID:** AD-006  
**Title:** Keep Gemini credentials and provider calls server-side

**Context**  
The approved architecture requires Gemini and states that the AI API key must not appear in frontend code or logs. Supabase Edge Functions provide a server-side integration boundary.

**Decision**  
The Edge Function calls Gemini and reads its credential from a Supabase secret or server-side environment variable. The frontend calls only the Edge Function with the user's authenticated session. Responses and logs must not expose the key or detailed provider internals.

**Rationale**  
Keeping the provider credential on the server prevents disclosure through downloadable frontend assets and centralizes provider error handling.

**Alternatives Considered**  
- Call Gemini directly from the browser: exposes the API key.
- Store the key in frontend environment variables: build-time frontend variables are client-visible and are not a secret boundary.

**Consequences**  
AI availability depends on Edge Function secret configuration and Gemini service behavior. Model/version and provider timeout policy remain implementation choices because the requirements do not specify them. The currently inspected Edge Function uses an OpenAI-compatible endpoint/key and must be aligned with Gemini in a later implementation task.

**Related Requirements**  
FR-014–FR-017; NFR-010; US-018–US-020, US-022; AC-018.x–AC-020.x, AC-022.3.

## AD-007 — Generate role-scoped CSV reports from authorized filtered data

**Decision ID:** AD-007  
**Title:** Generate role-scoped CSV reports from authorized filtered data

**Context**  
The approved requirements specify CSV roles, datasets, columns, formatting, and application of current filters. Readers have no CSV export function.

**Decision**  
The report flow obtains data under the caller's authorized scope, applies the active filters, and serializes the approved columns as UTF-8 with a header, DD/MM/YYYY dates, and VNĐ monetary values. Admin exports within their view permissions; Librarian exports the five specified datasets within permitted business scope; Reader has no export action.

**Rationale**  
Applying authorization and filters before serialization keeps export behavior consistent with visible/reportable data and the approved acceptance criteria.

**Alternatives Considered**  
- Export all records and filter only in the browser: exposes data outside the user's allowed scope.
- Offer CSV to every role: conflicts with the explicit Reader restriction.

**Consequences**  
Export query scopes and column mappings must match the role and dataset requirements. Large datasets should not be silently truncated where the requirements require complete results.

**Related Requirements**  
FR-012; US-016, US-023; AC-016.1, AC-023.1–AC-023.8.

## AD-008 — Use safe, user-oriented error handling and loading states

**Decision ID:** AD-008  
**Title:** Use safe, user-oriented error handling and loading states

**Context**  
The requirements call for understandable errors, no detailed stack traces to clients, AI loading states, and no API key in logs.

**Decision**  
Validate inputs at client and trusted backend/database boundaries. Map authentication, authorization, validation, missing-data, business conflict, database, and Gemini failures to suitable user-facing messages. Log only operational details needed for support, excluding secrets and unnecessary personal data. Show loading states during AI requests.

**Rationale**  
Users receive actionable feedback while internal details and credentials remain protected.

**Alternatives Considered**  
- Return raw database/provider errors: may expose implementation details or sensitive values.
- Silently fail AI requests: does not meet usability and loading/error requirements.

**Consequences**  
Frontend and Edge Function need a stable error contract. Expected AI outcomes such as no matches or insufficient summary data should be represented explicitly rather than treated as fabricated success.

**Related Requirements**  
FR-014–FR-017; NFR-002, NFR-005, NFR-010; US-018–US-022; AC-018.4, AC-019.3–AC-019.4, AC-020.4–AC-020.5, AC-021.3, AC-022.3.
