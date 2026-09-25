# Multi-Platform Social Campaign Publisher — Build Log

## Phase 0 — Foundation & Infrastructure
- Set up Fastify API server with Pino JSON logging and request correlation IDs (`X-Request-ID`).
- Dockerized PostgreSQL (5343) and Redis (6378).
- Configured Drizzle ORM and migrations.
- Configured BullMQ queue/worker connection infrastructure.

## Phase 1 — Domain Contracts & Design
- Defined `PlatformSpec`, `INSTAGRAM_SPEC` (1080x1080, 1:1), `X_SPEC` (1600x900, 16:9), and safe-zone rules.
- Defined `SocialPublisher` interface signature.
- Designed database schemas (`campaigns`, `social_posts`, `platform_tokens`) and status state machine (`queued` -> `publishing` -> `published` / `failed`).

## Phase 2 — Content Generation Layer
- Implemented Sharp image pipeline producing exact platform variants.
- Implemented platform caption composer with hashtag and limit enforcement.
- Created `CampaignsService` persisting campaigns and platform social posts with deterministic idempotency keys (`post_<campaignId>_<platform>`).

## Phase 3 — Adapters & Publishing System
- Implemented AES-256-GCM token encryption and decryption storing `authTag:ciphertext` in `platform_tokens`.
- Embedded `FakeSocialPlatformServer` simulating OAuth token exchange, publishing, and rate limits.
- Implemented `FakeInstagramPublisher` and `FakeXPublisher` implementing `SocialPublisher`.
- Implemented `PublisherRegistry` keeping application code platform-agnostic.
- Implemented `PublishingService` with 429 `Retry-After` backoff handling.

## Phase 4 — Production Reliability
- **Durable Scheduling & Validation**: Created `publishingQueue` using BullMQ with delay calculation (`delay = scheduledAt - now`). Enforced strict `scheduledAt` date validation on `POST /api/v1/campaigns` to reject past or invalid dates with `HTTP 400 Bad Request` (`INVALID_INPUT`). Deterministic job IDs (`job_${postId}`) prevent duplicate enqueueing.
- **Worker Crash Recovery**: Implemented `createPublishingWorker` consuming `publishing-jobs`. Worker re-reads current DB state (source of truth) and executes `publishingService.publishPost(postId)`. Deterministic idempotency key (`post_<campaignId>_<platform>`) prevents duplicate external posts across worker restarts and crashes.
- **Signed Delivery Webhook**: Implemented `POST /api/v1/webhooks/social-delivery` with Fastify raw body `preParsing` hook. HMAC SHA-256 signatures (`x-social-signature`) are verified using constant-time comparison (`timingSafeEqual`). Forged, missing, or tampered signatures are rejected with `HTTP 400 Bad Request` without mutating database status.
- **Status Trust Rule**: `PublishingService.publishPost()` puts status in `publishing` state and records `externalPostId`. Final status `published` is set **ONLY** when a signature-verified delivery webhook is processed (`publishing` → `published`).
- **Test Verification**: 61 automated tests passing across 16 test files covering queue durability, worker crash recovery, HMAC signature verification, forged signature rejection, duplicate webhooks, status trust rule enforcement, and future schedule validation.

## Phase 5 — Demo Preparation & Final Readiness
- Created deterministic CLI seed script (`pnpm seed`) using domain services to generate multi-platform campaigns with encrypted OAuth tokens, Sharp image variants, and BullMQ delayed jobs.
- Cleaned up monorepo workspace structure by removing unused `apps/web` placeholder.
- Documented step-by-step Evaluator Acceptance Probe Rehearsal Guide in README.md covering all 6 capstone acceptance probes: idempotency hammer, 429 rate-limit retry, worker crash recovery, forged webhook rejection, image dimension verification, and token security audit.
- Updated EVIDENCE.md with concrete reproducible proof for all 6 evaluator acceptance probes.
- Verified: 61/61 tests passing, 0 typecheck errors, 0 build errors.
