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
POST         /products/families
GET/POST     /suppliers
POST         /shop-users
POST         /shop-users/{userId}/assignments
POST         /products/{id}/prices
POST         /opening-stock/submissions
POST         /purchases
POST         /transfers
POST         /transfers/dispatch
POST         /transfers/{id}/receipt
POST         /transfers/{id}/approve-discrepancy
GET/POST     /stock-requirements
POST         /stock-requirements/{id}/review
POST         /stock-classifications
POST         /wastage
POST         /recovery-sales
GET          /inventory/availability
GET/POST     /machines
POST         /machine-plu-mappings
POST         /machine-events/dahua
POST         /master-imports/preview
POST         /master-imports
GET          /health/live
GET          /health/ready
```

## Fresh and discounted product families

Use POST /products/families for every new SRS product. It creates both stock
SKUs in one database transaction:

- a fresh SKU using a code from 01 through 200
- a linked discounted SKU using the derived code 201 through 400

For example, fresh code 01 creates discounted code 201; fresh code 200 creates
discounted code 400. The request supplies distinct initial selling prices because
the discounted SKU is independently saleable stock.

~~~json
{
  "freshName": "Tomato",
  "freshProductCode": "01",
  "discountedName": "Tomato (Discounted)",
  "freshInitialPricePaisePerKg": "6000",
  "discountedInitialPricePaisePerKg": "3500"
}
~~~

Include an Idempotency-Key header. Existing POST /products remains for legacy
catalog data; it does not create a discounted counterpart. Do not use it for a
new SRS product family.

## Machine ingestion contract

`POST /machine-events/dahua` is a collector-only endpoint. It uses the
`X-Collector-Token` secret and must never receive a mobile-user JWT. Its
idempotency identity is `deviceId + recordEpoch + recordSequence`, not a
client-generated identifier. The API records raw payload evidence first, derives
the shop business date from the registered device location, validates the active
PLU mapping and available stock, and then either:

- accepts the event, creating the normal sale, item snapshot, and one negative
  inventory movement atomically; or
- quarantines it with a reason and makes no inventory change.

The collector parser remains deliberately disabled until a real Dahua response
fixture verifies the vendor field layout. Do not manufacture decoded event data
or enable automatic uploading before that fixture and parser review are complete.

Machine and import payloads are documented in [shop-machine-integration.md](shop-machine-integration.md). Quantities and amounts should be decimal integer strings in grams and paise. Boolean, null, fractional, unsafe numeric and out-of-PostgreSQL-bigint values are rejected. Timestamped wastage/recovery events must match their business date in the shop timezone; central inventory currently uses Asia/Kolkata.
