# Deployment Runbook

## Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | developer tests | disposable local PostgreSQL/SQLite |
| Staging | integration, migration, and hardware simulator checks | synthetic only |
| Production | live operations | Supabase Pro PostgreSQL |

## Production components

- NestJS API container deployed to Google Cloud Run.
- Supabase PostgreSQL in a geographically appropriate region.
- Cloud Run Job for scheduled encrypted external database export.
- One local Python collector per shop, installed as a managed service on an existing shop PC or dedicated mini-PC.
- Firebase Cloud Messaging for the fixed owner device.

## Release procedure

1. Run lint, tests, type check, dependency audit, and OpenAPI contract validation in CI.
2. Apply and test the migration in staging.
3. Take/verify backup and review migration rollback plan.
4. Deploy a new Cloud Run revision without immediately routing all traffic.
5. Check `/api/v1/health/ready`, error metrics, and a smoke-test API workflow.
6. Route traffic gradually or fully after acceptance.
7. Run post-deploy migration/version and collector compatibility checks.

## Rollback

- Roll back API to the previous Cloud Run revision when application behaviour regresses.
- Do not roll back a destructive migration by deleting data. Every migration requires an explicit forward-repair or documented reversal path.
- Pause gateway uploads if an ingestion defect threatens integrity; SQLite retains pending events.

## Secrets

Use Cloud Run secret configuration for Supabase database URL, Supabase JWT verification config, gateway signing keys, FCM credentials, and Sentry DSN. Never bundle secrets into the mobile app.
