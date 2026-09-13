# Security baseline

- Deny-by-default authorization.
- Tenant context is mandatory for regulated operations.
- Secrets are environment variables only; never commit credentials or tokens.
- Server-side access to PostgreSQL only.
- Electronic signatures require verified identity and a specific signature meaning.
- Audit events are append-only by design and hash chained for tamper evidence.
- Production must use TLS, managed PostgreSQL, encrypted object storage and backups.
- UAT and Production data must remain isolated.
- Never use production patient or safety data in development.
