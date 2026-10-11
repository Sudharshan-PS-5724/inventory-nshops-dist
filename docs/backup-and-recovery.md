# Backup and Recovery

## Objectives

- Prevent silent loss of inventory/accounting evidence.
- Recover the database after accidental deletion, faulty deployment, or provider incident.
- Recover unsent scale events after internet, process, or shop-PC restart.

## Controls

- Supabase Pro daily database backups.
- Scheduled encrypted logical export to a separately controlled cloud storage bucket.
- Retention: daily exports for 14 days, weekly exports for 12 weeks, monthly exports for 12 months; review costs/retention before production.
- Collector SQLite outbox included in shop-PC backup policy; never treat it as the central source of truth.

## Recovery targets

Initial target: RPO no worse than the last successful external export for central data, with scale events recoverable from machine/collector where supported. Target RTO is four hours for a pilot deployment. These targets must be measured during a restore exercise before production acceptance.

## Restore exercise

1. Restore an export into an isolated non-production PostgreSQL instance.
2. Validate migration version, row counts, foreign-key integrity, and sample inventory calculations.
3. Verify credentials and access controls do not carry into the test environment.
4. Record elapsed recovery time, defects, and corrective actions.

Never test restore by overwriting production.
