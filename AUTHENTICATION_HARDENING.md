# COMMAND 02 authentication and rollout

## Server configuration

| Variable | Requirement |
| --- | --- |
| `ADMIN_USERNAME` | Required for Admin authentication. A single identifier, compared case-insensitively after trimming. |
| `ADMIN_PASSWORD_HASH` | Required for Admin authentication. A bcrypt hash of a strong, unique password, with cost 12–15. Store the complete hash as a server-side secret. Bcrypt accepts up to 72 password bytes. |
| `JWT_SECRET` | Required for all session issuance and verification. Provision an independently generated secret with at least 32 random bytes encoded as base64url or hex. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Optional. Defaults are `https://bjs.kodl.uk` and `bjs-academy`. Use separate settings and keys for production and staging. |
| `JWT_LEGACY_ACCEPT_UNTIL` | Optional. UTC timestamp in `YYYY-MM-DDTHH:mm:ssZ` format. Use only for Student and Mentor continuity with a verified strong, uncompromised, unchanged key. Maximum seven days. |

Provision variables in the server runtime before an approved deployment. Admin password changes use the server environment. Website presentation settings and the student password recovery flow have no authority over the Admin credential. Legacy fields in existing settings records require a separately reviewed cleanup.

## Session compatibility and rotation

1. Test staging with synthetic accounts and a separate datastore. Confirm Admin, Student, Mentor, Google login, and API clients that send a bearer token. Exercise course and video management, payment receipts, and both dashboards.
2. Provision a new JWT secret if the active key is weak, exposed, derived from the historical fallback, or of uncertain provenance. At cutover, tokens issued with the prior key will require sign-in. Coordinate the cutover across all serving instances and advise users before it happens.
3. If the active key meets the new validation and its confidentiality is verified, an approved rollout can temporarily accept legacy Student and Mentor tokens signed by that same key through the explicit UTC deadline. Remove the variable after the transition. Admins must sign in again for an issuer- and audience-bound token.
4. Replace any reused Admin password. Review prior settings responses, cache retention, and Git history when assessing exposure. Purge cached pre-fix settings responses at rollout and avoid restoring the historical authentication fallbacks during rollback.
5. Verify the deployed version through the health endpoint and authorized test-account sign-ins. Check missing, expired and non-Admin access on protected APIs. Verify using the deployed client bundle and runtime configuration.

Role, ID and role-specific JWT claims are retained, with issuer and audience added. Admin sessions remain valid for 24 hours and Student and Mentor sessions for seven days. Session checks read the account from MongoDB, including legacy Student accounts represented by a registration record. A database outage gives a controlled service error for durable account checks. Production deployment and live account verification require explicit approval.

## Administrative routes to review in COMMAND 04

The references below are to route declarations in `server/server.js` at the COMMAND 02 revision. They lack the shared Admin guard. Review inline checks, public aliases and service or scheduled invocations before applying authorization.

| Area | Route declaration lines | Review |
| --- | --- | --- |
| Student and registration administration | 6373, 6802, 8364, 8985, 9222, 9554, 9616 | Restrict roster, registration and operational data. Require staff authorization for approvals, access changes and private notes. |
| Payments and receipts | 6894, 9665, 9800, 9826, 9852 | Require staff authorization for administration and explicit Student ownership for self-service APIs. Review issue, download, edit and deletion flows. |
| Courses, lessons, transcripts and videos | 3967, 4063, 4494, 4519, 4646, 4969, 5053, 5188, 5380, 5418, 5430, 5441, 6040, 8335 | Keep public catalog and enrolled Student access working. Separate staff writes, transcript maintenance and scheduled jobs from shared reads. |
| Mentor administration | 6058, 6110, 6180, 6225, 6248, 6279 | Preserve the public Mentor directory. Separate staff management and instructor-scoped operations. |
| Exams and assignments | 3318, 3358, 3444, 3581, 3634, 6922, 7013, 7060, 7246, 7292, 7409 | Review public and enrolled-student reads, result ownership, answer visibility, exam writes, uploads and PDF generation. |
| Notes, certificates and notifications | 7711, 7744, 7762, 7831, 7891, 7906, 7995, 8116 | Preserve published notes and certificate verification. Protect private records, draft content, issuance, deletion and notification operations. |
| Site settings public read | 6962 | Intentional public read for three presentation strings. The write uses the shared Admin guard. |

The Admin bootstrap, Site Settings write, mail settings and diagnostics, existing protected AI actions, and already guarded Student administration routes use the central verifier.

## Remaining authentication risks

- COMMAND 03 must verify Firebase identity server-side before issuing application tokens. The current Google identity matching remains in use.
- Student and Mentor password recovery and legacy per-account plaintext credentials need a dedicated review. Review OTP verification, password storage, default or temporary credentials and account-session revocation.
- Review login rate limiting and bearer storage. Existing sessions can remain usable after an Admin password-only change until expiry. Rotate the JWT signing key in an approved incident response when immediate invalidation is required.
- Review ownership for Student actions that still accept request identifiers, webhook signature verification and privileged operations used by integrations. The new verifier does not grant access checks to callers that omit it.
