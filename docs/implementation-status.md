# Implementation Status

## Current increment: consistency fixes and live operational workspace

See [consistency-fixes.md](consistency-fixes.md) for the current verification and remaining limits. Historical setup notes below describe the foundation, not production acceptance.

### Acceptance criteria

- Requirements, architecture, domain model, database approach, API rules, security, testing, deployment, recovery, and observability are documented.
- No unreviewed business behaviour is hidden in product code.
- Critical machine and operational dependencies are recorded.

### Completed

- Replaced the development transpiler with a TypeScript build/watch supervisor so Nest constructor injection works.
- Fixed availability for products received after opening stock, strict integer validation, product-code errors, blank optional DSN handling, timezone validation and business-date consistency for timestamped deductions.
- Added HTTP 403 mapping for access denials, database readiness, authenticated identity/catalog reads, standalone machine PLU mapping, and operation audit records for successful idempotent mutations.
- Added a live mobile sign-in and operational workspace. The demo is separate and never submits live writes.
- Added collector raw-error evidence output and detection of conflicting payloads with the same record identity.
- Added compiled HTTP runtime tests with stubbed infrastructure, without requiring network listeners.

- Inspected the new project folder: it was empty and not a Git repository.
- Read the supplied SRS and Dahua/Longfly integration evidence.
- Selected the fixed high-level stack: React Native, NestJS, PostgreSQL/Supabase, and a local Python collector.
- Created the authoritative architecture, requirements, domain, database, API, security, test, deployment, recovery, and observability documentation.
- Initialized a Git repository on the `main` branch.
- Created the NestJS/Fastify API foundation with strict TypeScript, environment validation, secure CORS configuration, OpenAPI publication, liveness endpoint, Dockerfile, and a passing health unit test.
- Created the initial Drizzle PostgreSQL schema and generated the first versioned SQL migration. It is intentionally not applied because no non-production database connection has been supplied.
- Expanded the schema to 25 Version 1 tables and generated the commercial-operations migration.
- Added tested inventory accounting, recovery-price, access-policy, and product-validation domain modules.
- Added the bounded PostgreSQL/Drizzle NestJS persistence boundary with graceful shutdown.
- Enforced one administrator at database level, added explicit user-to-shop assignments, and added tested shop-scope authorization.
- Added repository-wide engineering principles and a protected, atomic product-creation module.
- Implemented verified Supabase-JWT authentication, server-side identity/role resolution, administrator enforcement, and assigned-shop scoping.
- Implemented authenticated product creation, append-only selling-price history, opening-stock submission/locking, and daily inventory availability endpoints.
- Implemented a database-backed idempotency boundary for all currently exposed mutation endpoints. It fingerprints normalized request values and replays the original response for an equivalent retry.
- Implemented atomic, administrator-confirmed stock transfers with deterministic PostgreSQL advisory locks, sufficient-source-stock validation, and paired ledger movements.
- Implemented active supplier creation and centralized purchase receipts. Purchases calculate integer-paise line totals server-side and add one immutable receipt movement per line.
- Implemented shop-scoped wastage records with sufficient-stock validation and one immutable deduction movement per record.
- Implemented shop, central-location, and business-wide expense recording. Expenses intentionally do not alter inventory.
- Implemented administrator-only shop creation (with an atomic shop location), shop-user registration for pre-created Supabase identities, shop assignment, and audit-log writes for those actions.
- Added a tested, shop-local Python collector foundation: documented read-only Dahua request creation, durable SQLite raw-statement outbox, and an explicit parser safety gate pending a captured production response fixture.
- Corrected guarded module dependencies so authentication is available in each feature module at runtime rather than only compiling by coincidence.

### In progress

- PostgreSQL integration tests against a disposable non-production database.
- Opening-stock correction/adjustment workflow with audit log records.

### Not started

- Normal machine-sale ingestion, collector pairing/upload, notifications and reports/PDF generation.
- Remaining live mobile screens, including purchase editing, user/shop administration, histories, reports and adjustments. These still have demo designs only.

### Blocking external dependencies

- Exact production Dahua model, firmware, IP configuration, and protocol test scale.
- A captured TM-A statement reply and evidence of the record sequence/reset and receipt-grouping behaviour.
- Supabase project and non-production credentials.
- Chosen hosting project/account and production domain.

### Verification performed

- `npm run api:check` - passed.
- `npm.cmd run api:test` - regression suite expanded; current results are recorded in consistency-fixes.md.
- `npm run api:build` - passed.
- `npm run format:check --workspace=@inventory/api` - passed.
- `npm.cmd run test:runtime --workspace=@inventory/api` exercises compiled dependency injection and HTTP status handling using Fastify injection, not a public socket. Database and authentication providers are stubbed in these tests.
- `npm audit --omit=dev --audit-level=moderate` - not verified: the npm advisory endpoint was unreachable due DNS resolution failure. Earlier installation reported four moderate vulnerabilities across the full dependency graph; no forced upgrade was applied.
- Collector tests include malformed-response evidence preservation and SQLite identity collisions.
