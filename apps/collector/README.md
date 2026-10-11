# Shop-local Dahua collector

This collector is a deliberately small Python standard-library process for a shop PC or mini-PC. It is not a mobile-app component and does not expose a local HTTP server.

## Safety state

The supplied protocol evidence documents a TCP statement request on port `4001` using `!0J####A\r\n\x03`. The exact response schema, record cursor behaviour, receipt grouping, model, and firmware still require a live-machine capture. Therefore:

- `protocol.py` can issue only the documented read request.
- Raw replies are persisted before upload.
- No product, quantity, price, or sale is inferred from unverified bytes.
- `parse_statement_reply` raises until a verified response fixture and parser are approved.

This is intentional: uploading made-up sales is worse than delaying ingestion.

## Required environment

`DAHUA_HOST`, `DAHUA_PORT` (default `4001`), `COLLECTOR_DEVICE_ID`, `COLLECTOR_OUTBOX_PATH`, `API_BASE_URL`, and `COLLECTOR_INGEST_TOKEN`.

The gateway must use outbound HTTPS only. Never port-forward the scale.
