# Domain Model

## Organisation and access

- `users`: identity profile linked to authentication subject.
- `roles`: exactly one `ADMIN` and one or more `SHOP_USER` accounts.
- `user_shop_assignments`: explicit shop scope for every shop user. The administrator is intentionally not limited by these assignments.
- `shops`: business shops.
- `inventory_locations`: typed locations (`CENTRAL`, `SHOP`); every shop owns one shop location.
- `devices`: registered scales/gateways, assigned to a shop location.

## Products and pricing

- `products`: product master, active state, recovery percentage in basis points.
- `product_prices`: effective-dated normal selling prices in paise per kg. A current-price uniqueness rule prevents two active normal prices for a product at the same instant.
- `machine_plu_mappings`: unique active device/PLU-to-product map.

## Physical stock and ledger

- `opening_stock_submissions`: one locked submission per business date/location.
- `opening_stock_lines`: physical grams counted per product, original values retained.
- `opening_stock_corrections`: admin-authorized replacement details and reason; does not erase original count.
- `inventory_movements`: immutable signed grams, type, source reference, location, product, effective business date, and idempotency key.

Availability for a product/location/date is:

```text
effective opening grams + sum(accepted inventory movements for same date/location/product)
```

The prior day's closing figure is informational and reconciled against the new physical count; it is never carried forward automatically.

## Commercial operations

- `suppliers`, `purchases`, `purchase_items`
- `transfers`, `transfer_items`
- `sales`, `sale_items`, `machine_sale_events`
- `recovery_sales`, `recovery_sale_items`
- `wastage_records`
- `expenses`

Each stock-affecting record references its resulting ledger movement(s). Source entities remain immutable after confirmation except for explicit correction/reversal workflows.

## Operational records

- `idempotency_keys`: completed response fingerprint per actor/key/operation.
- `notifications`, `push_devices`, `notification_settings`
- `audit_logs`
- `sync_ingestion_attempts`

## State conventions

Business records use explicit states where asynchronous validation matters: `DRAFT`, `CONFIRMED`, `QUARANTINED`, `REJECTED`, `CANCELLED`. Only a state transition to `CONFIRMED` may create stock movements.
