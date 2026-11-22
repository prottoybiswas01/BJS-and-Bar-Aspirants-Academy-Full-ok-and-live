# PERMANENT DEVELOPMENT & AUTO-DEPLOYMENT RULES

Project: BJS & Bar Aspirants Academy  
Production: https://bjs.kodl.uk  
Production Database: `bjs_academy`

## DEFAULT WORKFLOW — DIRECT PUSH TO MAIN

For all future approved development tasks:

1. Implement the requested changes completely.
2. Run appropriate targeted tests.
3. Run `node -c server/server.js`.
4. Run `cd client && npm run build && cd ..`.
5. Verify that no secrets, production data, or unrelated files are included.
6. Commit the verified changes with a meaningful message.
7. Push directly to `origin/main`.
8. Let Vercel automatically deploy from GitHub.
9. Verify the new Production Deployment is Ready and matches the pushed commit.
10. Check `https://bjs.kodl.uk/api/health` and relevant Vercel runtime logs.
11. Report the commit, deployment URL, and verification results.

## ONE-TIME AUTO-DEPLOY CONFIGURATION

Verify that:

- GitHub is connected to the correct Vercel project.
- `main` is configured as the Production Branch.
- Automatic Git deployments are enabled.
- No unexpected branch protection or deployment configuration prevents the intended workflow.
- The correct production domain is connected.
- Vercel CLI is authenticated in the local terminal.

Do not disable security protections or bypass repository rules to enable direct pushes.

Do not create Pull Requests by default unless technically required.

Do not run a redundant manual `vercel --prod` deployment when the Git integration has already deployed the same commit.

## FAILURE HANDLING

Never push code with known critical build or security failures.

If deployment fails:

- Inspect Vercel logs.
- Identify the actual cause.
- Apply a safe code-level fix.
- Re-run targeted tests.
- Push the corrected commit.
- Verify the new deployment.

Do not falsely report success.

For dangerous or irreversible changes, stop and request explicit approval.

## CRITICAL SAFETY RULE

**NEVER touch, wipe, seed, reset, migrate, or modify the real production database (`bjs_academy`) during development or testing.**

Preserve all real students, courses, lessons, payments, receipts, and certificates.

Never expose credentials, disable authentication, or force-push Git history.
