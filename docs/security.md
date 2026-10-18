# Security

## Threat model highlights

This is a control plan, not a production security attestation. Hardware ingestion, push delivery and production infrastructure are not enabled. Their controls below are requirements for implementation.

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
- Helmet and Fastify's request-size limit are configured. Dedicated rate limiting remains pending.
- Successful idempotent business mutations write operation audit records transactionally. Authentication audit integration remains pending.
- Sentry integration and its sensitive-data scrubber remain pending. An optional DSN alone does not enable monitoring.
- Local dependency advisory scanning and production CI security acceptance still require verification.
- Supabase RLS and table grants must be reviewed in staging before enabling client access. Current migrations do not install RLS policies. Do not expose application inventory tables through Supabase's client data API. Mobile business operations must use NestJS; the public anonymous key is for authentication, not direct inventory access.
