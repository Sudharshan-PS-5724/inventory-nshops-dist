# Requirements Baseline

## Confirmed scope

- The business supports a variable number of shops and one central inventory location.
- Products are fruit and vegetables, measured and stored in kilograms.
- Purchases are received centrally. Purchase rates are shared business-wide at a point in time; each purchase retains its actual line rate.
- Each shop records a fresh physical opening count per product and business date. It is not a carried-forward closing balance.
- Sales primarily arrive from weighing-machine integration. Historical machine quantity, price, amount, timestamp, PLU, and reference are preserved.
- A Dahua TM-A-compatible protocol is the current integration candidate. It exposes a statement-record request over TCP but its exact deployed model and firmware remain to be verified.
- Recovery sales, wastage, immediate transfers, expenses, price history, audit history, PDF reports, roles, and low-stock alerts are Version 1 scope.
- Shop users are restricted to assigned shops. Administrators control prices, adjustments, and cross-shop activity.
- Version 1 has exactly one administrator. The database enforces that singular role; this user has global business access.
- Only one fixed owner device receives operational push alerts in Version 1.

## Explicitly out of scope

- Customer CRM, returns, supplier payments, FIFO/aging, full app offline mode, a deterioration workflow, and advanced analytics.
- SMS/WhatsApp notification delivery.

## Business invariants

1. Quantities are represented exactly in grams in application and database boundaries; display converts to kilograms.
2. Money is represented in integer paise; no binary floating-point amounts are accepted.
3. Inventory is derived from immutable movements for a business date and location, never by independently mutating a current-stock column.
4. A fresh opening count is a physical baseline for its date. It does not add to the prior day's calculated closing stock.
5. Confirmed transfers write matching source-out and destination-in movements atomically.
6. A machine sale may affect inventory only once, regardless of collector retries.
7. A scale-originated price or amount is never silently replaced by the current product price.
8. Submitted opening stock cannot be edited; corrections are additive audited revisions authorized by an administrator.

## Open decisions

See [ADR-0001](decisions/ADR-0001-initial-domain-decisions.md) for decisions and pending hardware validation.
