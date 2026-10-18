# Database Design

## PostgreSQL conventions

- Application-generated UUID primary keys.
- `timestamptz` for system/event timestamps; `business_date date` for daily accounting.
- `bigint` for grams and paise; never `float`/`double precision` for quantities or money.
- All timestamps are UTC. Timestamped wastage/recovery events validate the supplied business date in the shop's timezone. Central inventory currently uses Asia/Kolkata. Other date-only commands accept an explicit business date.
- `created_at`, `updated_at`, and actor IDs where required; confirmed ledger/sale evidence is append-only.

## Critical constraints

| Concern | Constraint/design |
|---|---|
| Opening baseline | unique `(location_id, business_date)` submission; unique product line per submission |
| PLU mapping | unique active `(device_id, plu_code)` |
| Machine duplicate | unique `(device_id, record_epoch, record_sequence)` |
| Transfer correctness | check source and destination differ; paired movements in one DB transaction |
| Exact values | `quantity_grams > 0` in commercial lines; signed quantity only in ledger |
| Stock deductions | transactionally lock/validate the daily availability projection before writing movement |
| Idempotent client retries | unique `(actor_id, operation, idempotency_key)` |
| Price history | immutable effective timestamp and paise-per-kg snapshot on every sale line |

## Indexes driven by Version 1 queries

- `inventory_movements(location_id, product_id, business_date, occurred_at)`
- `sales(location_id, sold_at)`
- `machine_sale_events(device_id, status, received_at)`
- `opening_stock_submissions(location_id, business_date)`
- `product_prices(product_id, effective_from desc)`
- `notifications(user_id, read_at, created_at desc)`
- `audit_logs(entity_type, entity_id, occurred_at desc)`

## Concurrency model

Stock-changing commands run in a PostgreSQL transaction. The service obtains a transaction-scoped advisory lock keyed by `(location, product, business_date)`, calculates available grams from the locked baseline/movements, checks sufficiency, and writes source records plus movements. This serializes competing deductions for a product/location/day without a mutable stock row becoming a second source of truth.

## Deletion and retention

- Master records use `active`/archival status, not hard deletion once referenced.
- Financial and inventory evidence is never hard deleted by application endpoints.
- Device raw machine frames are retained subject to documented operational retention policy.
- Audit records are append-only.
