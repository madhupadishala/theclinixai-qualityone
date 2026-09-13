# Authentication and session boundary

Sprint 0 establishes a provider-independent session contract. Login UI/provider choice can change later without changing tenant authorization semantics.

The server accepts only a signed `q1_session` cookie. The token contains user, tenant and membership identifiers; every regulated request re-resolves the membership server-side and requires `ACTIVE` status. Permissions are deny-by-default and evaluated through RBAC relations.

Cookie controls: HttpOnly, SameSite=Lax, Secure in production, 8-hour maximum age. `AUTH_SECRET` is environment-only and must be at least 32 characters.

No regulated authorization decision is made from client-side state alone.
