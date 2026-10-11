# Architecture

## Context

Three shops require shared authoritative inventory while Dahua scales sit on private shop networks. A mobile app is not a reliable always-on machine connector.

## Chosen architecture

```text
React Native mobile apps ── HTTPS ──> NestJS modular-monolith API ──> PostgreSQL
                                            ▲
                                            │ HTTPS, idempotent events
                              shop gateway ─┘
                              └─ Dahua scale over local TCP :4001
```

### Components

| Component | Responsibility | Not responsible for |
|---|---|---|
| Mobile app | authenticated workflows and presentation | stock mutation rules, direct database writes |
| NestJS API | authorization, transactions, accounting, audit, OpenAPI | persistent machine connectivity |
| PostgreSQL | source-of-truth data and integrity constraints | client authorization policy |
| Shop gateway | read scale events, durable SQLite outbox, retries, health | deciding business validity or stock mutations |

## Backend modules

- Identity and access
- Shops and locations
- Products and pricing
- Opening stock and reconciliation
- Purchases and suppliers
- Transfers
- Inventory ledger and availability
- Sales and machine ingestion
- Recovery sales and wastage
- Expenses
- Notifications
- Reports
- Audit and operations

Modules own their use cases. Controllers are request mappers only. Cross-module side effects occur through transactionally persisted domain records, not direct controller calls.

## Data flows

### Scale sale

1. Gateway reads a Dahua statement record.
2. Gateway persists the raw event to local SQLite before attempting upload.
3. Gateway calls the machine-ingestion API with an idempotency key.
4. API authenticates the gateway, validates device/shop/PLU/machine totals, and either accepts, quarantines, or rejects the event.
5. An accepted event creates sale data and one negative inventory movement in one transaction.
6. Gateway marks the SQLite event acknowledged only after a successful authoritative API response.

### Transfer

1. Authorized user submits source, destination, product lines, and idempotency key.
2. API locks/rechecks source availability for the current business date.
3. API creates transfer header/items plus paired source-out/destination-in movements in one transaction.
4. API emits an audit record and optional owner notification after commit.

## Explicit non-goals

- No direct mobile-to-Supabase table writes.
- No publicly exposed scale port or router port forwarding.
- No microservices, broker, Redis, or shared local state in Version 1.
