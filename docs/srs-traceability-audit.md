# SRS Traceability Audit

Audit date: 2026-11-21  
Source: Centralized Fruit & Vegetable Shop Management System SRS, version 1.0

This is a source-code audit, not a claim that the system has been deployed,
connected to Supabase, or verified against a physical weighing machine.

| SRS area | Status | Evidence and remaining work |
| --- | --- | --- |
| Central backend and database model | Partial | NestJS and PostgreSQL/Drizzle schema exist. Five migrations are generated but not applied to a staging database. |
| Ten shops plus central hub | Implemented in model | Shops and central inventory locations are data-driven, so the schema is not limited to ten. Staging configuration has not been completed. |
| Retail Android application | Partial | A React Native application and live workspace exist, but several operational screens remain mock or incomplete. |
| Separate Hub Android application | Partial | The role-aware mobile foundation can support hub users, but no separately packaged hub workflow is complete. |
| Hub Web dashboard | Not implemented | There is no web application package. |
| Hub purchases and supplier receiving | Implemented in API | Hub Manager and Hub Employee permissions, supplier/purchase records, and central ledger receipt movements are implemented. Live database testing remains required. |
| Shop stock requirements | Implemented in API | Request, review, approval, rejection, dispatch linkage, and scoped listing exist. Mobile screens still need complete live wiring. |
| Hub-to-shop, shop-to-shop, and shop-to-hub transfers | Implemented in API | Dispatch, receipt, and discrepancy states support all location combinations. Return/resolution after a rejected receipt is still missing. |
| Storekeeper accept, reject, and edited quantities | Partial | Immutable dispatched quantity, received quantity, reason, storekeeper identity, timestamp, discrepancy state, and manager approval exist. A dedicated return or write-off resolution flow is missing. |
| Fresh and discounted stock | Implemented in API | Linked fresh and discounted SKU families, independent prices, and atomic reclassification movements exist. |
| Waste reason and deduction | Partial | Waste reason, permissions, ledger deduction, and history metadata exist. Mandatory photo upload, private storage, approval state, and management review are missing. |
| Product codes 01-200 / 201-400 | Implemented for new families | Product-family endpoint enforces the mapping. The legacy generic product and CSV import flows are not family-aware and must not be used for new SRS catalog setup. |
| Weighing-machine integration | Partial | Registered devices, PLU mappings, collector-token ingestion API, raw evidence, duplicate detection, and quarantine exist. A verified Dahua parser and automatic collector upload runner require real scale captures. |
| Separate fresh/discounted sales reporting | Partial | Sales retain product identity and product stock class. Report endpoints and dashboard views are not implemented. |
| Per-location inventory and history | Implemented in API | Shop stock uses daily physical opening baseline; hub stock is cumulative through the requested date. Immutable ledger movements record stock changes. |
| Roles and shop isolation | Implemented in API | Administrator, Hub Manager, Hub Employee, Shop Manager, Storekeeper, and legacy Shop User are enforced by server-side capability and shop-scope checks. |
| Authentication, audit, backup, and recovery | Partial | Supabase JWT verification, idempotent mutation audit records, health checks, and schema constraints exist. Backup automation, monitoring, and incident recovery are not implemented. |
| Reporting and owner dashboard | Not implemented | No report API, PDF export, web dashboard, or consolidated management views exist. |
| Notifications and offline synchronization | Not implemented | Tables exist for notifications. Delivery, low-stock evaluation, and offline sync are not implemented. |

## Required completion sequence

1. Provision staging PostgreSQL/Supabase and apply all five migrations.
2. Add database-backed integration tests for purchases, transfers, receipt discrepancies, reclassification, wastage, and machine ingestion.
3. Build mandatory waste-photo upload and review using private object storage.
4. Build transfer rejection resolution and in-transit stock visibility.
5. Make master CSV import create validated product families and PLU mappings.
6. Complete live Retail and Hub mobile workflows, then build the Hub web dashboard.
7. Implement reports, alerts, monitoring, backup verification, and deployment.
8. Capture real Dahua replies, approve a parser, and perform a single-shop hardware pilot before enabling automatic sale deduction.
