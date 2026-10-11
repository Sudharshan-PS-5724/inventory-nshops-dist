# Testing Strategy

## Test layers

1. Unit tests for price/recovery calculations, date/baseline logic, event parsing, and authorization rules.
2. PostgreSQL integration tests for constraints, idempotency, locks, and transaction rollback.
3. API contract tests against OpenAPI schemas.
4. Authorization tests including cross-shop ID manipulation.
5. Collector tests using a Dahua protocol simulator and temporary SQLite outbox.
6. React Native component/flow tests for opening stock, transfer, and notifications.
7. End-to-end pilot tests using an actual scale before production enablement.

## Required failure cases

- Duplicate scale delivery and lost acknowledgement.
- Backend unavailable then gateway restart/retry.
- Corrupt/malformed Dahua payload.
- Concurrent sales/transfers with insufficient stock.
- Double opening-stock submission and unauthorized correction.
- Machine price/amount mismatch quarantine.
- Expired/revoked gateway credential.
- Migration rollback/backup restoration exercise.

## Acceptance gates

- Lint, formatting, type checking, and relevant tests pass for every increment.
- Hardware adapter is not production-enabled until live protocol samples and recovery/replay behaviour are tested.
- No feature is marked complete solely because it compiles.
