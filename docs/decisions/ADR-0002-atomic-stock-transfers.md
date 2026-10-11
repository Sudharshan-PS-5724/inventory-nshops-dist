# ADR-0002: Atomic stock transfers with source availability locks

## Status

Accepted.

## Context

A transfer must decrease source stock and increase destination stock immediately, without creating inventory or permitting concurrent overselling. A single mutable stock field is not a sufficient source of truth because availability is derived from a fresh daily physical opening baseline plus immutable movements.

## Decision

1. Version 1 transfer initiation is administrator-only.
2. A transfer command includes source/destination locations and unique product quantities; source and destination must differ.
3. The API sorts `(source location, product, business date)` lock keys and obtains PostgreSQL transaction-scoped advisory locks in that order. Sorting prevents opposite-direction transfers from deadlocking each other.
4. Under those locks, the API reads the source opening baseline and accepted source movements, calculates availability, and rejects insufficient stock.
5. In one transaction, the API creates transfer header/items and one negative source plus one positive destination inventory movement per item.
6. The existing unique movement-source/location/product constraint makes a replay unable to duplicate either movement.
7. The endpoint also uses an idempotency key at its HTTP boundary; the database uniqueness constraint remains the final integrity backstop.

## Consequences

- The API must never trust a mobile-supplied available balance.
- Missing opening stock for the source business date prevents transfer confirmation.
- PostgreSQL integration tests must exercise concurrent transfer attempts before production.
