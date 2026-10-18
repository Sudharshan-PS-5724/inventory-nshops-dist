# Consistency fixes and verification

Updated: 2026-10-18. This is the current status reference; architecture diagrams describe the target system, not a completed hardware deployment.

## Fixed in this increment

| Audit finding | Correction |
| --- | --- |
| Development injection failure | TypeScript compilation followed by a supervised compiler/runtime watch; no tsx application execution |
| Missing products after receipt/transfer | Availability includes the union of opening and movement product IDs; absent opening rows mean zero baseline |
| Blank optional Sentry DSN blocks startup | Empty string is normalized to an absent value |
| Access errors return HTTP 500 | Registered domain-error filter returns 403 ACCESS_DENIED |
| Invalid product code escapes safeParse | Zod-native normalization and regex validation |
| Boolean/unsafe/fractional quantity coercion | Shared exact-integer boundary with PostgreSQL bigint bounds |
| Inconsistent event/business dates | Wastage and recovery-sale event dates checked in shop timezone; central defaults to Asia/Kolkata |
| PLU mapping depends on new opening stock | Standalone owner-only, idempotent, audited mapping endpoint |
| Raw bytes lost on parsing error | --raw prints a parse-error evidence record before exiting unsuccessfully |
| Different payload silently treated as duplicate | SQLite outbox compares payload under an immediate transaction and raises on collision |
| Configured frontend still always dummy | Separate live sign-in and protected operational workspace |
| Missing catalog/readiness endpoints | Identity, shops, products, suppliers and database readiness implemented |
| Inconsistent mutation audit coverage | Every successful idempotent operation adds an audit record in its transaction |
| Stale status and API docs | Updated current route list, live/demo boundaries and remaining requirements |

## Mobile coverage

Configured installations use Supabase sign-in, native secure token storage, in-memory browser storage, session refresh, server-derived roles, and API-based shop/catalog data. The selected shop controls inventory and machine reads. Owner-only actions are hidden for shop users and separately enforced on the API.

Live forms: opening stock, Dahua registration, CSV-content preview/import, standalone PLU mapping, price changes, shop-to-shop transfers, wastage, recovery sales and expenses. The forms use kg/rupee entry and send exact gram/paise strings. An unchanged uncertain request retains its exact body and idempotency key in memory for retry.

No usable Supabase configuration opens the labeled demo. Service/network read errors can offer an explicit demo fallback. A failed write is never shown as saved and access denials do not become demo successes. Demo records never reach the API.

Remaining mobile work: native file selection instead of pasted CSV, product/supplier/shop/user administration forms, purchase editor, sales/history/report/notification/adjustment views, persistent uncertain-write reconciliation, password reset, accessibility and device acceptance. The original design prototype remains available separately, not mixed with live records. Do not restart an app with an uncertain write and blindly repeat the operation; reconcile server state first.

## Verification commands

Local results: API type-check/build passed; 61 API unit tests, 5 compiled HTTP runtime tests, 3 mobile value/date tests and 7 Python tests passed. API formatting and mobile type-check passed. Real database, hosted CI, phone UI and physical hardware acceptance have not been run.

Android production JavaScript/Hermes export also passed (669 modules). The output is in apps/mobile/.expo/verification and is ignored by Git. This verifies bundling, not an installed Android application or live device behavior. The final export required permission outside the filesystem sandbox for Hermes temporary bytecode output. Schema comparison against the latest migration snapshot reported no drift.

From the repository root:

```powershell
npm.cmd run api:check
npm.cmd run api:test
npm.cmd run test:runtime --workspace=@inventory/api
npm.cmd run format:check --workspace=@inventory/api
npm.cmd run mobile:typecheck
npm.cmd run test --workspace=@inventory/mobile
```

From apps/collector:

```powershell
python -B -m unittest discover -s tests -v
```

The compiled runtime tests use the actual Nest module graph and Fastify request injection with stubbed database and identity providers. They verify injection, health/readiness, 401, 403 and malformed-product 400 behavior without listening on a socket. They do not validate real JWT signatures or database transactions.

A CI workflow runs these local code checks on pushes and pull requests when the repository is hosted on GitHub. Adding the workflow does not mean a hosted run has been observed.

## Not claimed complete

- Real PostgreSQL migrations, constraints, rollback, idempotency replay and concurrent deductions need staging integration tests.
- Supabase login and live mobile operations need configured staging credentials and device testing.
- RLS and database grants need explicit staging review; the migrations do not install RLS policies.
- Machine pairing, collector credentials, uploader, verified parser, receipt grouping, reset epochs and automatic sale deductions remain disabled/unimplemented.
- Physical PLU/price writes are not implemented. Application mappings do not program the scale.
- Notifications, reports, adjustments, full historical read APIs, observability, backup restore and deployment acceptance remain pending.
- Catalog reads currently return the complete active catalog; pagination and scaling work remain pending.
- Dedicated rate limiting and a current dependency security audit remain pending.

No real scale commands, database writes or production deployment were performed during this correction pass. The existing database schema supports these changes without a new schema migration.
