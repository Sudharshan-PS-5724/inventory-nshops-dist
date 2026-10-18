# Mobile Frontend Design Direction

The mobile interface uses an editorial retail layout rather than a dense enterprise dashboard. It takes inspiration from the supplied Snitch reference in its restrained navigation, ample whitespace, product-first cards, strong type contrast, and uncluttered surfaces, without reproducing branding, content, or assets.

## Visual system

- Colors: the requested dark-spruce through chartreuse palette, defined centrally in src/theme.ts, with separate light and dark roles.
- Surfaces: clear card boundaries, restrained layouts and no gradients.
- Accent: palette greens for actions and selected states.
- Type: large, compact section titles; muted labels; tabular figures for weights and amounts.
- Motion: native press feedback only in the first increment.

## First navigation

The demo retains Today, Inventory, Activity and More navigation. The separate live workspace prioritizes authenticated shop selection, inventory, machines and operational forms. Live sales dashboards and histories remain pending; demo sales/statuses must not be interpreted as actual machine connectivity.

## Development data modes

Without usable Supabase values the app opens the demo. With configuration it opens the live sign-in flow. The server resolves roles and shop assignments; there is no role switch in live mode. Network/service read failures offer an explicit demo option. Denied access and failed writes never become simulated successes. Native CSV picking, purchase/admin/history forms and persistent uncertain-write reconciliation remain pending. The existing demo's role switch is for visual review only.
