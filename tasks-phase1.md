# Phase 1 — Design Task List

## 1. Environment & Baseline Verification
- [x] Inspect Phase 0 project structure & configuration
- [x] Run `pnpm run typecheck` (Passed)
- [x] Run `pnpm run test` (Passed 10/10)

## 2. Platform Specifications & Domain Contracts Configuration (`apps/server/src/domain/`)
- [x] Define platform specification constants/types (`src/domain/platforms/specifications.ts`)
  - [x] Instagram: 1080x1080 (1:1), platform ID 'instagram', voice rules
  - [x] X: 1600x900 (16:9), platform ID 'x', voice rules
  - [x] Shared voice vs platform rules caption composition contract
  - [x] Safe-zone specification contract (80% centered safe margin bounding box)
- [x] Define `SocialPublisher` domain interface & types (`src/domain/publishing/social-publisher.interface.ts`)
  - [x] `PublishInput` (idempotencyKey, platform, caption, imageUrl, tokens)
  - [x] `PublishResult` (success, externalPostId, publishedAt, metadata)
  - [x] `PublishError` (errorCode, message, isRetryable, retryAfterSeconds)
- [x] Define status model & transition rules (`src/domain/campaigns/status.ts`)
  - [x] Statuses: `queued`, `publishing`, `published`, `failed`
  - [x] State transition validation logic

## 3. Data Model & Database Schema (`apps/server/src/db/schema/`)
- [x] Define `campaigns` table schema (`src/db/schema/campaigns.ts`)
- [x] Define `social_posts` table schema (`src/db/schema/social-posts.ts`)
  - [x] Unique constraint on `idempotencyKey`
  - [x] Foreign key to `campaigns`
  - [x] Foreign key / enum constraints for platform & status
- [x] Define `platform_tokens` table schema (`src/db/schema/platform-tokens.ts`)
  - [x] Encrypted token material storage (`encryptedToken`, `iv`, `authMetadata`)
- [x] Export schemas in `src/db/schema/index.ts`
- [x] Run `pnpm run db:generate` to verify schema compilation

## 4. API Surface & Webhook Contracts (`apps/server/src/domain/api/`)
- [x] Define API DTOs & schemas (Campaign Creation, Campaign Status Retrieval, Webhook Delivery)

## 5. Design Documentation (`docs/design.md`)
- [x] Section 1: Problem statement
- [x] Section 2: Core scope
- [x] Section 3: Platform specifications & safe-zone
- [x] Section 4: Architecture diagram (ASCII / GFM mermaid)
- [x] Section 5: `SocialPublisher` contract & rationale
- [x] Section 6: Data model (Campaigns, Social Posts, Tokens, Idempotency)
- [x] Section 7: Status transitions state machine
- [x] Section 8: API surface specification
- [x] Section 9: Layer responsibilities
- [x] Section 10: Reliability invariants
- [x] Section 11: Explicit non-goal
- [x] Section 12: Design Decision Records (ADRs 1-5)

## 6. Verification & Final Quality Checks
- [x] Run `pnpm run typecheck` (Passed 0 errors)
- [x] Run `pnpm run test` (Passed 19/19 tests)
- [x] Verify Drizzle migrations generate cleanly (`0001_dapper_overlord.sql`)
- [x] Verify Fastify server startup and Swagger specs
- [x] Conduct Phase 1 final consistency audit
