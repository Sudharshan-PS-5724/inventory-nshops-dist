# API Guidelines

## API shape

- Versioned JSON REST API under `/api/v1`.
- Swagger publishes route documentation. Runtime inputs are validated with Zod; complete generated request/response schemas remain pending.
- Current errors use Nest JSON responses. Access denial returns HTTP 403 with `ACCESS_DENIED`. A uniform RFC 9457 response contract remains pending.
- History pagination remains pending. Current catalog endpoints return active catalog records.

## Authentication and authorization

- Mobile users authenticate with Supabase Auth JWTs.
- NestJS verifies JWTs and resolves user/role/shop assignments server-side.
- Gateway credentials and ingestion are planned, not implemented. User credentials must not be reused for collectors.
- The client never supplies an authoritative role or unrestricted shop scope.

## Idempotency

All create/confirm operations require `Idempotency-Key`. The API stores the operation/key/actor and canonical response. Repeated matching requests return the original result; a reused key with materially different payload returns HTTP 409. Successful operations write an audit record in the same transaction. Preview requests do not mutate and need no key. Expired-key cleanup is not implemented; do not assume keys become reusable after 24 hours.

## Implemented resources

```text
GET/POST     /shops
GET          /identity
GET/POST     /products
GET/POST     /suppliers
POST         /shop-users
POST         /shop-users/{userId}/assignments
POST         /products/{id}/prices
POST         /opening-stock/submissions
POST         /purchases
POST         /transfers
POST         /wastage
POST         /recovery-sales
GET          /inventory/availability
GET/POST     /machines
POST         /machine-plu-mappings
POST         /master-imports/preview
POST         /master-imports
GET          /health/live
GET          /health/ready
```

## Planned machine ingestion contract (not an available endpoint)

`POST /machine-events/dahua` is reserved for a future verified collector integration. Its implementation must revalidate raw statement fields and never trust the collector's product mapping, shop or status decision. Sales history, notifications and report endpoints are also pending. Do not call these paths as implemented APIs.

Machine and import payloads are documented in [shop-machine-integration.md](shop-machine-integration.md). Quantities and amounts should be decimal integer strings in grams and paise. Boolean, null, fractional, unsafe numeric and out-of-PostgreSQL-bigint values are rejected. Timestamped wastage/recovery events must match their business date in the shop timezone; central inventory currently uses Asia/Kolkata.
