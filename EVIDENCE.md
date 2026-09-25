# Phase 4 — Production Reliability Evidence Log

## 1. Automated Verification Suite Output

### 1.1 Vitest Full Test Suite
Command executed:
```bash
pnpm --filter server test
```

Verification Result:
 ```text
 ✓ tests/status-trust.test.ts (3 tests)
 ✓ tests/webhooks-api.test.ts (6 tests)
 ✓ tests/webhook-signature.test.ts (6 tests)
 ✓ tests/queue-worker.test.ts (4 tests)
 ✓ tests/campaigns.test.ts (8 tests)
 ✓ tests/idempotent-publishing.test.ts (2 tests)
 ✓ tests/image-pipeline.test.ts (2 tests)
 ✓ tests/caption-composer.test.ts (3 tests)
 ✓ tests/publishing-api.test.ts (3 tests)
 ✓ tests/error-handler.test.ts (2 tests)
 ✓ tests/publishers.test.ts (3 tests)
 ✓ tests/infrastructure.test.ts (3 tests)
 ✓ tests/health.test.ts (3 tests)
 ✓ tests/token-encryption.test.ts (2 tests)
 ✓ tests/swagger.test.ts (2 tests)
 ✓ tests/domain.test.ts (9 tests)

 Test Files  16 passed (16)
      Tests  61 passed (61)
```

### 1.2 TypeScript Compilation Check
Command executed:
```bash
pnpm run typecheck
```
Output:
```text
$ tsc --noEmit
Exit Code: 0 (0 errors)
```

### 1.3 Production Build Check
Command executed:
```bash
pnpm run build
```
Output:
```text
$ tsc -p tsconfig.build.json
Exit Code: 0 (0 errors)
```

---

## 2. Key Phase 4 Evidence Scenarios

### 2.1 Durable BullMQ Queue & Delayed Jobs
- **Evidence File**: `tests/queue-worker.test.ts`
- **Behavior**: Scheduled jobs calculate delay = `scheduledAt - now` and are enqueued with deterministic `jobId` (`job_${postId}`).
- **Log Proof**:
```json
{"level":30,"jobId":"job_scheduled_post_1790345766017","postId":"scheduled_post_1790345766017","delayMs":60000,"scheduledAt":"2026-09-25T14:17:06.017Z","msg":"Enqueued durable publishing job in BullMQ"}
```

### 2.2 Worker Crash & Restart Recovery
- **Evidence File**: `tests/queue-worker.test.ts` (`should handle worker restart and process remaining jobs safely without duplicate posts`)
- **Behavior**: Worker instance 1 is closed mid-queue; worker instance 2 launches, reads current DB state, uses deterministic idempotency key (`post_<campaignId>_<platform>`), and publishes post without duplicate external posts.

### 2.3 Webhook HMAC SHA-256 Signature Verification
- **Evidence File**: `tests/webhooks-api.test.ts` & `tests/webhook-signature.test.ts`
- **Behavior**: Fastify `preParsing` hook extracts raw JSON body bytes. `verifyWebhookSignature` computes HMAC SHA-256 and compares using constant-time `crypto.timingSafeEqual`.
- **Forged Signature Output**:
```json
{"level":40,"signatureHeader":"provided","msg":"Rejected delivery webhook due to invalid HMAC signature"}
HTTP 400 Bad Request — { "error": { "code": "INVALID_SIGNATURE", "message": "Invalid or forged webhook signature" } }
```

### 2.4 Status Trust Rule Enforcement
- **Evidence File**: `tests/status-trust.test.ts`
- **Behavior**:
  1. API publish acceptance sets status to `publishing` and records `externalPostId` with `publishedAt: null`.
  2. Forged delivery webhook returns HTTP 400 and post status remains `publishing`.
  3. Valid HMAC-signed delivery webhook moves post status from `publishing` to `published` and populates `publishedAt`.

---

## 3. Evaluator Acceptance Probe Verification Summary

| Probe | Evaluator Probe | Status | Proof / Evidence |
| :--- | :--- | :--- | :--- |
| **Probe 1** | Duplicate publish (Idempotency Hammer) | **PASS** | `tests/idempotent-publishing.test.ts` & `tests/publishing-api.test.ts` — Repeated calls with same `idempotencyKey` return identical `externalPostId` without duplicate posts. |
| **Probe 2** | 429 Rate Limit Handling | **PASS** | `tests/idempotent-publishing.test.ts` — Catches status 429, respects `Retry-After: 2`, and executes bounded backoff retry. |
| **Probe 3** | Worker Crash Recovery | **PASS** | `tests/queue-worker.test.ts` — Worker 1 killed mid-queue, Worker 2 picks up job from Redis, queries DB, reuses idempotency key with 0 duplicates. |
| **Probe 4** | Webhook Trust & Forged Webhook | **PASS** | `tests/webhooks-api.test.ts` & `tests/status-trust.test.ts` — Forged signature returns HTTP 400 with status unchanged; valid HMAC signature returns HTTP 200 and updates status to `published`. |
| **Probe 5** | Content Artifact Specs | **PASS** | `tests/image-pipeline.test.ts` & `tests/caption-composer.test.ts` — Instagram image `1080x1080` (1:1), X image `1600x900` (16:9), platform captions differ. |
| **Probe 6** | Token Security | **PASS** | `tests/token-encryption.test.ts` & Repository Audit — AES-256-GCM encrypted tokens in DB (`authTag:ciphertext`), zero secrets in Pino logs. |

