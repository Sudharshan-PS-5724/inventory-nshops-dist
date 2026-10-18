# Continuation TODOs and Setup Guide

## Purpose

This is the handover document for the current milestone. It records what is safe to use now, what is preview-only, and the order for continuing development.

Do not connect a real weighing machine to stock deduction until live response captures have been reviewed and the ingestion work below is complete.

## Current state

### Shop integration increment (2026-10-18)

Admin-only machine registration, shop-scoped listing, CSV preview/import and standalone PLU mapping are implemented in the API and connected to the live mobile workspace. See [shop-machine-integration.md](shop-machine-integration.md) and [consistency-fixes.md](consistency-fixes.md). Collector authentication, verified hardware parsing and automatic sale deductions remain pending. Existing migrations are sufficient; real database integration testing is still required.

| Area | Current state | Safe use now |
| --- | --- | --- |
| API | NestJS modules and domain tests are implemented for core stock operations | Development and code review only until a database is provisioned and migrations are applied |
| Database | Drizzle PostgreSQL schema and three SQL migrations exist | Apply to a fresh staging database first |
| Mobile app | Demo screens plus separate authenticated live operational workspace | Demo review; live acceptance requires staging setup |
| Supabase | Client configuration exists but no project credentials are configured | Configure authentication and PostgreSQL before live mobile testing |
| Dahua script | Read-only statement retrieval utility exists | Small diagnostic reads from the actual scale only |
| Collector | SQLite outbox foundation exists | Do not use for production sale ingestion yet |

## Important boundaries

- The demo uses dummy data and never changes live inventory. Configured installations use a separate authenticated live workspace. See consistency-fixes.md for exact live-screen coverage.
- The role switch in the mobile prototype is for screen review. The API must remain the authority for all roles and shop access.
- Opening-stock corrections, inventory adjustments, reports, notifications, device registration, PLU mapping, and machine ingestion are not production-ready backend workflows yet.
- The Dahua script never writes to the machine. Do not replace it with undocumented commands.
- Never store production passwords, service role keys, collector tokens, database backups, or scale credentials in this repository.

## First-time local setup

Requirements:

- Node.js 22 or later
- npm 11 or later
- Python 3.11 or later
- A PostgreSQL database for API integration testing, or a Supabase staging project

From the repository root:

```powershell
npm install
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\mobile\.env.example apps\mobile\.env
```

Set the variables in `apps/api/.env` and `apps/mobile/.env` as described below. The `.env` files are local only and must not be committed.

Useful checks:

```powershell
npm run api:check
npm run api:test
npm run api:build
npm run mobile:typecheck
```

Start the API after the database configuration is ready:

```powershell
npm run api:start:dev
```

The API exposes health checks at `http://localhost:3000/api/v1/health/ready` and OpenAPI at `http://localhost:3000/api/docs`.

Start Expo from another terminal:

```powershell
npm run mobile:start
```

For a physical device, `EXPO_PUBLIC_API_BASE_URL` must contain the LAN-reachable address of the API, not `localhost`.

## Supabase configuration

Use a staging project before creating a production project.

1. Create a Supabase project in the intended region.
2. Enable email and password authentication in Supabase Auth.
3. Create a test administrator account in Supabase Auth.
4. Copy the PostgreSQL connection string into `DATABASE_URL` in `apps/api/.env`.
5. Copy the project Auth issuer and JWKS URL into `SUPABASE_JWT_ISSUER` and `SUPABASE_JWKS_URL`.
6. Set `SUPABASE_JWT_AUDIENCE=authenticated` unless the Auth configuration intentionally uses another audience.
7. Set `CORS_ORIGIN` to the actual Expo or web development origin for local development. Do not use a broad production wildcard.
8. Put only the public project URL and public anonymous key in `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

9. Apply `apps/api/drizzle/0000_strange_captain_midlands.sql`, `0001_perpetual_timeslip.sql`, and `0002_chubby_chameleon.sql` to the empty staging database in order. Review each migration and take a backup first. There is no approved automatic production migration command yet.
10. Bootstrap the first owner directly in the staging database: insert the existing Supabase Auth user's UUID, display name and ADMIN role into the application users table. The administration API cannot bootstrap its own first Admin because it requires an existing authorized identity. Then use that owner's JWT for shop and shop-user setup. Do not create a second Admin.
11. Sign in from the mobile app and confirm that the API validates the Supabase access token and resolves the server-side role.

Never put a Supabase service-role key in the mobile app. The public anonymous key is acceptable in the app. The database URL, service-role key, collector token, and signing secrets belong only in server or secret-manager configuration.

## Dahua TM-A diagnostic script

The standalone retriever is at `apps/collector/dahua_statement_retriever.py`.

It sends only the documented statement request:

```text
!0J####A + CR LF + ETX
```

The documented default TCP port is `4001`.

### Network requirement

The scale and the computer that runs the script must have IP connectivity. They can be connected by Ethernet or Wi-Fi if they are on the same LAN or are correctly routed between networks. The mobile app does not need a direct connection to the scale in the intended production architecture. A shop-local collector computer reads the scale and sends accepted records to the backend through outbound HTTPS.

### Safe first command

Replace the sample address with the scale's private LAN address. This command does not contact the scale because `--show-command` exits after printing the bytes.

```powershell
py apps\collector\dahua_statement_retriever.py --host 192.168.1.65 --start 1 --show-command
```

Expected statement command for sequence 1:

```text
ASCII: !0J0001A\r\n\x03
HEX:   21 30 4a 30 30 30 31 41 0d 0a 03
```

### Small live capture

Only after confirming the exact installed scale model, firmware, IP address, and port:

```powershell
py apps\collector\dahua_statement_retriever.py --host 192.168.1.65 --start 1 --end 3 --raw
```

The command prints one JSON object per requested sequence. Preserve the complete output as evidence. Begin with a very small range while the scale is idle.

Required captures before implementing a parser or sale ingestion:

1. An empty sequence response.
2. A known weighing sale with the printed bill retained.
3. A piece-count sale, if the shop uses that mode.
4. A discounted sale, if supported.
5. Several consecutive records from one printed bill.
6. A capture after scale restart or power recovery.

Known limitation: the supplied protocol document has a contradiction in its sample weight field. The script therefore preserves raw fixed-width values and does not convert weight or money into inventory values. This is deliberate.

Run collector tests:

```powershell
Set-Location apps\collector
py -m unittest discover -s tests -v
```

## Backend continuation TODOs

### Required before live use

1. Provision staging Supabase PostgreSQL and apply migrations.
2. Add database integration tests for every stock-changing operation.
3. Implement opening-stock corrections with original value, corrected value, reason, actor, and timestamp.
4. Implement authorised stock adjustments with audit logging.
5. Add list, detail, history, filter, and pagination endpoints needed by the mobile screens.
6. Device registration and application PLU mapping exist. Implement secure pairing, audited reassignment, credential revocation and actual connection status.
7. Build collector-authenticated ingestion only after real Dahua captures validate the response parser and deduplication policy.
8. Add quarantine and review handling for unknown PLUs, repeated records, malformed records, and price mismatches.
9. Add normal machine sale creation and sale detail/history endpoints.
10. Add low-stock evaluation and a fixed-recipient notification service.
11. Add report generation, PDF export, audit/history endpoints, backup checks, observability, and deployment configuration.

### Backend decisions still required

- Exact scale model and firmware
- Scale transaction identity and duplicate-event rules
- Receipt grouping semantics
- Machine price mismatch policy: reject, flag, or accept with review
- Opening-stock reconciliation policy
- Notification delivery provider and configured phone number
- Final report date filters and PDF layouts

## Frontend continuation TODOs

### Screens already available as preview

- Today dashboard and activity feed
- Inventory and product details
- Opening stock
- Purchases and suppliers
- Transfers
- Wastage
- Recovery sales
- Expenses
- Machine sales and receipt detail
- Alerts and reports
- Products, price history, shops, users, devices, adjustments, audit history, and account screens

### Required before live use

1. Staging-test the implemented Supabase sign-in, sign-out and session refresh. Add password reset and session-expiry user acceptance tests.
2. Extend the live workspace to remaining purchase/admin/history screens. Do not query or write inventory tables directly from the mobile app.
3. Retain fallback data only for unavailable development environments. Disable business-changing actions when the backend is unavailable because full mobile offline operation is out of scope.
4. Build proper create and edit pages for products, suppliers, shops, users, and devices.
5. Add field selectors, multi-line purchase editor, product search, date pickers, confirmation dialogs, and input validation.
6. Build dedicated opening-stock correction, adjustment detail, device sync-error, quarantine review, PLU editor, and report export flows.
7. Add loading, empty, error, retry, pull-to-refresh, pagination, and permission-denied states.
8. Add accessibility labels, screen-reader checks, keyboard-safe forms, device-size checks, and user-acceptance testing.
9. Connect push or in-app notification views after the backend notification service exists.

## Suggested continuation order

1. Configure staging Supabase and run database-backed API tests.
2. Capture and validate real Dahua records without writing to the scale.
3. Complete the collector parser, ingestion, PLU mapping, quarantine, and sale history backend.
4. Add the API read endpoints required by the mobile app.
5. Wire authentication and read-only live data into the mobile app.
6. Wire one mutation at a time with validation and idempotency, beginning with opening stock, purchases, and transfers.
7. Complete notifications, reports, PDF export, audit views, deployment, backups, and a single-shop hardware pilot.

## Definition of the next safe milestone

The next milestone is complete when a staging environment can authenticate a real user, show live shop-scoped inventory, submit one protected opening-stock record, and display it again after refresh. Dahua transactions remain diagnostic-only until their raw captures and parser tests are approved.
