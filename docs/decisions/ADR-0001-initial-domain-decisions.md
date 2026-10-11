# ADR-0001: Initial domain decisions

## Status

Accepted for implementation, subject to documented hardware validation.

## Context

The SRS requires a centralized, multi-shop inventory system with fresh daily physical opening counts and machine-originated sales. Earlier conversation notes contained a possible central-location ambiguity; the engineering directive explicitly requires central inventory and centralized purchasing.

## Decisions

1. Use PostgreSQL as the relational system of record, hosted on Supabase Pro initially.
2. Use integer grams and paise at persistence/API boundaries. Mobile UI accepts kilograms and rupees only through explicit conversions.
3. Use an append-only `inventory_movements` ledger. Current availability is calculated from the daily opening baseline plus movements for that business date.
4. Use `LOW_STOCK_AT_OR_BELOW` semantics: alert when available stock is less than or equal to 5 kg.
5. A new physical opening count records the previous calculated balance and its variance for review, but does not retroactively mutate prior-day history.
6. Machine price/amount mismatches are quarantined for administrator review; they do not deduct stock until accepted.
7. Treat documented Dahua statement records as scale-sale lines until a live device proves an authenticated bill/receipt grouping field.
8. Use server-side at-least-once event ingestion. Stable uniqueness is `(device_id, machine_record_epoch, machine_record_sequence)`; rollover semantics require live-device confirmation.
9. Use a single fixed owner account/device for push notifications. Push is advisory; the database record is authoritative.

## Consequences

- Backend endpoints are responsible for authorization, idempotency, and transactions.
- The collector must keep a SQLite outbox and may replay requests without creating duplicate sales.
- The production adapter remains blocked until the actual Dahua hardware is tested. A simulator can be built earlier.
