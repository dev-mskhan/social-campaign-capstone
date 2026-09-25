# Phase 4 — Production Reliability Task List

## 1. Setup & Security Configuration
- [x] Configure `SOCIAL_WEBHOOK_SECRET` in `env.ts`, `config.ts`, and `.env.example`
- [x] Implement HMAC SHA-256 signature generation and constant-time verification in `src/infrastructure/security/webhook-signature.ts`
- [x] Write unit tests for webhook HMAC verification in `tests/webhook-signature.test.ts`

## 2. Durable BullMQ Scheduler & Worker (`src/infrastructure/queue/`)
- [x] Implement `publishingQueue` with BullMQ & Redis in `src/infrastructure/queue/publishing-queue.ts`
  - [x] Calculate `delay` from `scheduledAt` for future jobs
  - [x] Use deterministic `jobId` (`job_${postId}`) for idempotent job enqueuing
- [x] Implement `createPublishingWorker` in `src/infrastructure/queue/publishing-worker.ts`
  - [x] Fetch current DB state (source of truth)
  - [x] Execute `publishingService.publishPost(postId)`
  - [x] Preserve `idempotencyKey` and 429 rate limit backoff
- [x] Connect `createCampaign` in `CampaignsService` to `enqueuePublishJob` for immediate and delayed publishing
- [x] Write integration tests for queue, worker, delayed jobs, and worker restart recovery in `tests/queue-worker.test.ts`

## 3. Signed Delivery Webhook System (`src/modules/webhooks/`)
- [x] Implement Fastify raw body `preParsing` hook in `src/app/app.ts` to preserve raw payload bytes for HMAC signature checks
- [x] Implement `WebhooksService` in `src/modules/webhooks/webhooks.service.ts`
  - [x] Constant-time HMAC SHA-256 signature check (`timingSafeEqual`)
  - [x] Reject forged, missing, or malformed signatures with HTTP 400
  - [x] Look up social post by `externalPostId` or `idempotencyKey`
  - [x] Execute status transition `publishing` -> `published` upon valid signature
  - [x] Handle duplicate webhooks idempotently without data corruption
  - [x] Update campaign status to `completed` when all posts are delivered
- [x] Implement Fastify controller `handleDeliveryWebhook` in `src/modules/webhooks/webhooks.controller.ts`
- [x] Implement `POST /api/v1/webhooks/social-delivery` route plugin with Fastify Swagger OpenAPI schemas in `src/app/routes/webhook.routes.ts`
- [x] Write API integration tests for signed delivery webhooks in `tests/webhooks-api.test.ts`

## 4. Status Trust Rule & Phase 3 Preservation
- [x] Enforce status trust rule: publish API acceptance sets status to `publishing` with `externalPostId`; final status `published` is set ONLY upon verified signed delivery webhook
- [x] Integrate `createSignedDeliveryWebhook` helper in `FakeSocialPlatformServer`
- [x] Write status trust verification tests in `tests/status-trust.test.ts`
- [x] Preserve all Phase 1-3 adapter, token encryption, and status state machine functionality

## 5. Verification & Documentation
- [x] Verify `pnpm run typecheck` passes with 0 errors
- [x] Verify `pnpm --filter server test` passes all 58 tests across 16 files
- [x] Verify `pnpm run build` passes with 0 errors
- [x] Update `README.md` with Phase 4 architecture and execution instructions
- [x] Update `EVIDENCE.md` with Phase 4 execution logs and test proof
- [x] Update `BUILDLOG.md` with Phase 4 engineering rationale and decisions
- [x] Produce structured Phase 4 final implementation audit report
