# Architecture

## Context

The platform is designed for ten shops, with shared authoritative inventory and a central hub, while Dahua scales sit on private shop networks. A mobile app is not a reliable always-on machine connector.

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
- Stock requirements and hub allocation
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

### Target transfer lifecycle

1. A shop submits a requirement; this does not change stock.
2. The hub reviews it, records approved quantities or a rejection reason, then creates a dispatch.
3. The source quantity leaves stock only when dispatched; the destination receives stock only after a verified receipt.
4. A discrepancy remains reviewable with immutable dispatched and received quantities.

The current legacy `POST /transfers` command remains an immediate administrator-confirmed transfer for existing callers. New dispatch, receipt, and discrepancy-approval commands implement the staged lifecycle; the mobile workflows will be moved to them in a later phase.

## Explicit non-goals

- No direct mobile-to-Supabase table writes.
- No publicly exposed scale port or router port forwarding.
- No microservices, broker, Redis, or shared local state in Version 1.
