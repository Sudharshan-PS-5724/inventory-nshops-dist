# API Guidelines

## API shape

- Versioned JSON REST API under `/api/v1`.
- OpenAPI 3.1 is the contract; application endpoints require schema validation.
- RFC 9457-style problem responses with stable machine-readable codes.
- Cursor pagination for event/history resources; bounded filters and page sizes.

## Authentication and authorization

- Mobile users authenticate with Supabase Auth JWTs.
- NestJS verifies JWTs and resolves user/role/shop assignments server-side.
- Gateway requests use a separate scoped credential, rotated independently from user credentials.
- The client never supplies an authoritative role or unrestricted shop scope.

## Idempotency

All create/confirm operations accept `Idempotency-Key`. The API stores the operation/key/actor and canonical response. Repeated matching requests return the original result; a reused key with materially different payload returns `409 IDEMPOTENCY_KEY_REUSED`.

## Initial resources

```text
GET/POST     /shops
GET/POST     /products
POST         /products/{id}/prices
POST         /opening-stock/submissions
POST         /purchases
POST         /transfers
POST         /wastage
POST         /recovery-sales
POST         /machine-events/dahua
GET          /inventory/availability
GET          /sales
GET          /notifications
POST         /notifications/{id}/read
GET/POST     /devices
GET          /health/live
GET          /health/ready
```

## Machine ingestion contract

`POST /machine-events/dahua` accepts one raw statement record plus parsed fields, device identity, and collector idempotency key. The server revalidates parsing-relevant fields and never trusts the collector's product mapping, shop, price, amount, or status decision.
