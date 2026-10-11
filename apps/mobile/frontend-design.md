# Mobile Frontend Design Direction

The mobile interface uses an editorial retail layout rather than a dense enterprise dashboard. It takes inspiration from the supplied Snitch reference in its restrained navigation, ample whitespace, product-first cards, strong type contrast, and uncluttered surfaces, without reproducing branding, content, or assets.

## Visual system

- Canvas: warm off-white `#F8F7F2`.
- Surfaces: white cards with quiet charcoal borders; no gradients or neon accents.
- Accent: muted leafy green for the primary action and active state only.
- Type: large, compact section titles; muted labels; tabular figures for weights and amounts.
- Motion: native press feedback only in the first increment.

## First navigation

Dashboard, Inventory, Activity, and Account are persistent bottom destinations. The administrator dashboard prioritizes today’s sales, low stock, machine connection state, and the next operational action. The screen currently uses mock data until Supabase authentication and API configuration are provisioned.

## Development data modes

Without both Supabase public environment values, the application opens a clearly marked local demo session. Opening stock, purchases, transfers, wastage, expenses, and recovery sales provide confirmation-only local workflows in that mode. They must not be interpreted as server writes. Once authenticated API access is configured, the same form boundaries will submit idempotent calls to the matching NestJS endpoints.
