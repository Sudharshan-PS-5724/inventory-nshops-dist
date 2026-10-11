# Security

## Threat model highlights

| Threat | Control |
|---|---|
| User accesses another shop | server-side role and assignment checks; authorization tests |
| Forged scale event | per-gateway credential, device binding, allowlisted device state, audit trail |
| Duplicate/replayed scale event | server idempotency and machine uniqueness constraints |
| Mobile client manipulates price/stock | server derives permissions and calculates/validates authoritative values |
| Credential leak | secrets only in managed configuration; `.env` ignored; no values in logs |
| Public scale exposure | local gateway uses outbound HTTPS; no inbound port forwarding |
| SQL/injection/mass assignment | DTO allow-lists, parameterized persistence, strict validation |
| Sensitive operational data in pushes | push contains only notification identifier/type; app fetches details after authentication |

## Baseline controls

- HTTPS-only production endpoints; restrictive CORS.
- Helmet/security headers, request size limits, rate limits on authentication-adjacent and ingestion endpoints.
- Audit all privileged mutations and authentication-sensitive actions.
- Sentry scrubber removes authorization headers, tokens, database URLs, and raw personal data.
- Dependency audits run in CI.
- Supabase Row Level Security is enabled for client-exposed tables; inventory write tables are not exposed directly to mobile clients.
