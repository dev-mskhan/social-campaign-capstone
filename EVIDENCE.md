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
 ✓ tests/campaigns.test.ts (5 tests)
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
      Tests  58 passed (58)
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
