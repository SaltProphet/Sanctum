# Sanctum Project Status Analysis

_Last updated: 2026-02-13_

## 1) Executive summary

Sanctum has a solid foundation for a creator-focused gated video platform built on Next.js App Router with strong domain-level utilities and tests for core business logic (payments, onboarding, webhook verification, panic state, route helpers, and vault-style artifact handling). The primary blocker is **app stability in the dashboard and watermark modules**, which currently prevents lint and production builds from succeeding.

### Current delivery status
- **Architecture maturity:** Medium-High (clear route and domain separation)
- **Feature readiness:** Medium (many pieces implemented, but critical compile blockers remain)
- **Quality/readiness for deploy:** Low-Medium (build currently fails)
- **Priority for next sprint:** Resolve compile blockers, then run full smoke checks and deployment checklist

---

## 2) What is implemented today

### 2.1 Application surfaces

### Web pages (App Router)
- `/` landing page
- `/dashboard` creator dashboard surface (+ dashboard layout)
- `/room/[roomId]` room/watch experience and client-side room runtime
- `/blocked` gated/blocked state page
- `/terms` legal/terms page
- custom `not-found` page

### API routes (server)
- `POST /api/create-room`
- `POST /api/meeting-token`
- `POST /api/payments/deposit/initiate`
- `GET /api/payments/deposit/status`
- `POST /api/payments/webhook`
- `POST /api/webhooks/payments`
- `POST /api/webhooks/veriff`
- `POST /webhooks/veriff`
- `POST /creator/deposit/initiate`
- `POST /creator/veriff/session`
- `POST /api/rooms/[roomId]/panic`
- `GET /api/rooms/[roomId]/panic/stream`

### 2.2 Domain capabilities already present

### Creator and onboarding controls
- Creator preflight gate with payment + verification provider abstraction before room creation
- State machine for creator onboarding transitions and audit metadata
- View-layer mapping utilities for onboarding step UI/CTA states

### Payments and webhooks
- Deposit initiation/status and idempotency-oriented provider logic in domain utilities
- Webhook signature verification utilities and webhook processor with duplicate/out-of-order handling safeguards

### Video/room security controls
- Meeting-token issuance path with entitlement checks and bounded token expiration logic
- Panic shutdown workflow that closes Daily rooms and clears ephemeral state

### Abuse deterrence and tracing
- Watermark text/tiles utilities and viewer session metadata hooks
- Vault-style artifact service with role-gated read semantics and audit logging

---

## 3) Quality signal snapshot

### 3.1 Automated tests

`npm test` currently executes and passes most domain tests, but the run fails overall due to two hard failures:
1. **Module resolution/import issue** involving `lib/creatorGate.ts` importing `./payments` without a resolvable extension in current Node test execution mode.
2. **Syntax error in `lib/watermark.ts`** (`watermarkId` declared twice in `getWatermarkMetadata`).

Result: **45 passing tests, 2 failing tests** in current environment.

### 3.2 Lint and build

- `npm run lint` fails on a parse error in `app/dashboard/page.tsx`.
- `npm run build` fails with the same dashboard parsing/async issues plus the duplicate declaration in `lib/watermark.ts`.

Result: **Not deployment-ready** until blockers are fixed.

---

## 4) Risks and blockers

### P0 blockers (must-fix)
1. **Dashboard page syntax/handler defects**
   - Non-async callback using `await`
   - Unbalanced callback/closure syntax near submit handler
2. **Watermark metadata duplicate symbol**
   - Duplicate `const watermarkId` declaration in one function
3. **Node test ESM resolution fragility**
   - Import path mismatch/runtime mode inconsistency causing module-not-found during tests

### P1 risks (should address after P0)
1. Runtime/env drift risk from many required env vars across Daily/Veriff/payments paths
2. Potential route duplication/confusion (`/webhooks/veriff` and `/api/webhooks/veriff`) without a clearly documented canonical path
3. README/project structure notes are partially stale compared to implemented route/domain scope

---

## 5) Recommended remediation plan

### Phase 1 — Stabilize compile and tests (highest priority)
1. Fix `app/dashboard/page.tsx` handler syntax and async callback signatures.
2. Remove duplicate `watermarkId` declaration in `lib/watermark.ts`.
3. Normalize test-time module imports for Node ESM (`.ts` extension strategy or package/module config alignment).
4. Re-run `npm test`, `npm run lint`, and `npm run build` until green.

### Phase 2 — Hardening and consistency
1. Canonicalize webhook route usage and deprecate duplicates if unnecessary.
2. Add integration-level checks for key API routes:
   - create-room preflight deny/allow
   - meeting-token entitlement deny/allow
   - panic route behavior and stream behavior
3. Expand smoke-check docs to include currently used canonical routes (`/dashboard`, `/room/[roomId]`, onboarding/payment APIs).

### Phase 3 — Documentation and operational readiness
1. Refresh README with current architecture (creator gating, webhook processors, panic controls).
2. Add an environment matrix (required, optional, preview-only vars).
3. Add runbook sections for incident handling:
   - webhook signature failures
   - Daily API outages
   - panic-trigger verification and rollback strategy

---

## 6) Suggested definition of "good state" for next milestone

Project can be considered back to a healthy baseline when all are true:
- `npm test` passes without runtime/import/syntax failures.
- `npm run lint` passes.
- `npm run build` passes.
- Route smoke checklist confirms `/`, `/dashboard`, and direct `/room/[roomId]` deep link behavior.
- Deployment checklist is validated in preview with correct env vars and Node 20 runtime.

---

## 7) Immediate next actions (practical 48-hour plan)

1. Patch dashboard and watermark compile blockers.
2. Align test runtime module behavior and rerun full checks.
3. Execute existing docs checklists (`docs/route-smoke-checklist.md`, `docs/vercel-deployment-checklist.md`) against preview.
4. Publish a follow-up "release readiness" snapshot once all gates are green.
