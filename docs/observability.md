# Observability

## Logs

API and collector use JSON structured logs with timestamp, severity, component, request/correlation ID, actor/device identifier, operation, result, and safe error code. Raw credentials, access tokens, and database URLs are redacted.

## Metrics

- API request rate, 4xx/5xx rate, latency, and readiness.
- Database connection count/pool waits and failed transaction count.
- Machine event accepted/quarantined/rejected/duplicate counts.
- Collector outbox pending count, oldest pending age, retry count, and last successful sync per shop.
- Low-stock notification creation/delivery failure count.
- Report generation duration/failures.

## Alerts

The fixed owner device receives alerts for a gateway not syncing beyond an agreed threshold, repeated ingestion failures, backup-export failure, and sustained API readiness failure. Alerts are persisted in the notification table before FCM delivery.

## Error reporting

Sentry is enabled in the API, mobile app, and collector after environment-specific DSNs are configured. Events include release version and safe correlation IDs, never raw secrets or full machine payloads by default.
