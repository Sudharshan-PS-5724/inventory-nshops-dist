# Backend Progress and Remaining Work

## Backend status for this milestone

The backend is frozen at a safe pre-production milestone. It contains the business operations that do not depend on unknown scale response fields: authentication and role resolution, shop scoping, shop and shop-user administration, products and price history, opening stock, availability, suppliers, purchases, transfers, wastage, expenses, and recovery sales. Inventory-changing operations use PostgreSQL transactions and idempotency keys.

The machine path is intentionally not connected to inventory yet. The supplied TM-A protocol documents statement retrieval but does not provide a confirmed deployed-model response capture, receipt grouping semantics, or a reliable production event identity beyond record sequence. Connecting it prematurely could create duplicate or misclassified sales.

The literal statement sample also conflicts with its explanatory field grouping: the documented response text yields a five-character weight field of `00078`, while the prose calls it `00780`. The retriever preserves literal fixed-width fields and does not convert them to kilograms or money until real-machine captures settle that discrepancy.

## Included and verified locally

- NestJS API type check and production build.
- Domain and input tests for access, quantities, money, transfers, purchase totals, opening stock, recovery pricing, and collector command construction.
- Python read-only Dahua statement retriever tests.
- Shop-local SQLite raw-event outbox foundation.
- Expo/React Native mobile UI milestone with navigable administrator and shop-user preview flows. It includes dashboard, inventory, activity, opening stock, purchases, suppliers, transfers, wastage, recovery sales, expenses, machine-sale preview, alerts, reports, product and price views, shops, users, devices, adjustments, audit history, and account screens. It is intentionally dummy-data driven until authentication and deployed API repositories are configured.

## Remaining before production

1. Capture and retain raw statement replies from the actual scale, including an empty sequence, a weighing sale, a piece-count sale, a discounted sale, a reset/restart boundary, and consecutive lines from one printed bill.
2. Confirm the installed machine model, firmware, LAN address, and whether `!0J####A` returns historical completed sales on that firmware.
3. Implement and test a response parser against those captures; confirm weight and monetary units for the actual regional firmware.
4. Add the collector-authenticated ingestion endpoint, device registration, PLU mapping, quarantine policy, sales creation, and duplicate-event handling based on the confirmed identity rules.
5. Add opening-stock corrections and audited inventory adjustments.
6. Add notification delivery, report/history endpoints, PDF generation, and live mobile API repositories.
7. Provision Supabase, apply migrations to a non-production database first, add integration tests, configure deployment secrets, and perform backup/restore and hardware pilot tests.

## Important operational rule

The retriever script is diagnostic only. It does not upload or deduct inventory. Preserve every raw reply first, then use those samples to finalize the parser and ingestion policy.
