# COMMAND 03 Google sign-in and account linking

## Audited sign-in flow

- The Google popup in [client/src/pages/Login.jsx](client/src/pages/Login.jsx) obtains a Firebase user through [client/src/services/firebase.js](client/src/services/firebase.js). The previous [AuthContext](client/src/context/AuthContext.jsx) posted a browser-supplied email, Firebase UID, name and photo. All three Google login aliases in [server/server.js](server/server.js) used that email to select Mentor or Student records and could issue an application JWT without verifying Firebase identity. The previous signup flow could derive the stored password from the supplied UID.
- The public Google aliases are `/api/auth/google`, `/api/auth/google-login`, and `/auth/google-login`. They share one handler and accept a Firebase ID token plus the university, requested course and optional contact number during signup. The handler derives identity from verified Firebase claims. Role and academy ID come from an authorized academy record.
- The Student and Mentor password login and registration routes use academy data. Admin login uses the COMMAND 02 environment-backed credential. Those flows have no authority to create a Google identity binding. The new Admin approval action uses the shared Admin guard.
- The Admin SDK verifies the signature, expiry, project and issuer and checks revocation and disabled users on each exchange. The exchange also requires a project-bound UID, Google provider subject and verified email. [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens) · [Firebase session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions)

## Server runtime configuration

| Setting | Requirement |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Expected Firebase project. Configure the frontend Firebase project to match the backend for each environment. |
| `FIREBASE_CLIENT_EMAIL` | Service account principal with permission to look up Firebase Authentication users for revocation checks. |
| `FIREBASE_PRIVATE_KEY` | Server-only service account key. Supports PEM newlines and escaped newline sequences. Store in Vercel sensitive environment configuration. |
| `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | Shared Redis REST endpoint and credential with permission to run the atomic limiter script. Use separate resources or credentials for production and staging. |
| COMMAND 02 variables | Keep `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` configured. The JWT key also protects short-lived linking requests and hashes rate-limit identifiers with separate purposes. |

Use a supported Node.js runtime of at least 22 with Firebase Admin 14.5.1. Firebase emulator configuration disables the exchange. Keep Admin credentials out of client `VITE_` variables and repository files. [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup) · [Firebase Admin release notes](https://firebase.google.com/support/release-notes/admin/node) · [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

Password login and Google exchange each allow 240 attempts per network in 10 minutes. Password login also limits a normalized identifier to 24 attempts. Registration and recovery have smaller budgets. The counters are shared across Vercel instances. Missing limiter configuration or Redis outages return a controlled `503` to the affected authentication routes. Established session checks are independent of the limiter. [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi) · [Vercel request headers](https://vercel.com/docs/headers/request-headers)

## Existing accounts and new registrations

1. An existing Student or approved Mentor signs in with Google and shares the encrypted, 30-minute connection code with academy support. The code represents a specific verified Google identity and academy account. It cannot issue a session.
2. Support verifies ownership using historical academy records and an established contact or other approved evidence independent of the Google email. In Admin **Settings → Google অ্যাকাউন্ট সংযোগ**, the authorized Admin selects the verified account type, enters the verified academy ID, pastes the code, and confirms ownership verification.
3. The user signs in with Google again. The binding preserves the existing Student or Mentor record and its relationships. A separate collection stores the binding and approver. Unique keys and a transaction prevent a Firebase UID, Google provider subject, or academy record from being bound twice.
4. New verified identities without a conflicting academy account or related legacy record can register a pending Student. Course selection grants no enrollment. An optional phone is retained as unverified contact information. It cannot identify another account or grant access to receipts. Conflicting records, registration-only records, and orphaned receipts require staff review.

Existing Google-only users may need staff-assisted linking on first sign-in. Historical provider identities were never securely recorded and require independent verification. No migration or bulk binding is included.

## Rollout checks and remaining risks

- Confirm Vercel runtime and credentials, the client project's Google sign-in configuration, Redis capacity for shared networks, and MongoDB transaction support in staging. The binding store requires a transaction-capable deployment and permission to write its separate collection.
- Plan an approved rotation of the JWT signing key and omit the legacy JWT grace setting at cutover. Tokens issued by the former Google handler cannot be distinguished from other JWTs issued under its key. Rotation requires users to sign in again.
- Review legacy account recovery and credentials that may have been derived from a submitted Firebase UID. Prepare support for Google-only users and for conflicts involving old contact information. Firebase revocation blocks new application sessions, while existing application JWTs retain their COMMAND 02 lifetime.
- After explicit deployment approval, verify health, password logins, initial and repeat Google login, authorized linking, role rejection, and enrollment and receipt continuity with approved test accounts. Broader account-management authorization remains part of COMMAND 04.
