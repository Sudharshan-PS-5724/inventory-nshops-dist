# Engineering Principles

These rules apply to every module, migration, endpoint, and collector change.

## Correctness first

1. Inventory is an append-only movement ledger; no feature writes an untracked current-stock value.
2. Quantities use integer grams and money uses integer paise. Binary floating point is prohibited for business values.
3. A command either completes all dependent writes in one PostgreSQL transaction or leaves no partial state.
4. Idempotency is mandatory for externally retried writes, especially scale ingestion and mobile creates.

## Authorization and shop boundaries

1. Default deny: every non-health endpoint is authenticated explicitly.
2. The database is authoritative for roles and shop assignments; JWT claims do not grant business roles.
3. The single administrator has global access. Shop users must pass server-side assignment checks for the resolved record's shop.
4. Controllers never trust a client-provided role, stock balance, price, or unrestricted shop identifier.

## Modular design

1. Controllers map HTTP only; application services own use cases and transaction boundaries.
2. Domain modules contain deterministic business calculations and authorization rules, with unit tests.
3. Persistence is accessed through the database boundary, not assembled ad hoc in controllers.
4. Cross-module shortcuts, hidden global state, and duplicated business rules are prohibited.

## Reliability and operations

1. Machine collectors deliver at least once; the API deduplicates safely.
2. Errors are explicit, structured, and safe to log. Secrets/tokens/raw credentials never enter logs or responses.
3. Every schema change is a reviewed, version-controlled migration.
4. A feature is not complete without focused tests, type checking, formatting, and documentation updates.
