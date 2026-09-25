# Phase 3 — Adapters & Publishing System Task List

## 1. Setup & Environment
- [x] Create `tasks-phase3.md` task breakdown
- [x] Configure `FAKE_PLATFORM_BASE_URL` and `TOKEN_ENCRYPTION_KEY` in `env.ts` and `.env.example`

## 2. Token Encryption Security Layer (`src/infrastructure/security/token-encryption.ts`)
- [x] Implement AES-256-GCM token encryption & decryption utility using Node.js `node:crypto`
  - [x] Random IV generation per encryption operation (never reuse IVs)
  - [x] Store `encryptedToken`, `iv`, and `authMetadata`
  - [x] Decrypt access token cleanly in memory when needed for publishing
  - [x] Ensure plaintext tokens and encryption keys are NEVER logged by Pino

## 3. Fake Social Platform Server (`src/infrastructure/fake-platform/server.ts`)
- [x] Implement embedded Fake Social Platform HTTP Server/Service
  - [x] Fake OAuth token exchange (`POST /oauth/token`)
  - [x] Fake Instagram publish (`POST /api/v1/instagram/publish`)
  - [x] Fake X publish (`POST /api/v1/x/publish`)
  - [x] Support `Authorization: Bearer <token>` validation
  - [x] Support durable idempotency tracking (return existing post on duplicate `idempotencyKey`)
  - [x] Support rate limit simulation (`429 Too Many Requests` with `Retry-After` headers)

## 4. SocialPublisher Adapters & Resolver (`src/infrastructure/adapters/`)
- [x] Implement `FakeInstagramPublisher` implementing `SocialPublisher`
- [x] Implement `FakeXPublisher` implementing `SocialPublisher`
- [x] Translate generic `PublishInput` to fake server request payloads
- [x] Propagate `idempotencyKey` in requests
- [x] Translate platform responses into `PublishResult` and `PublishError` with `isRetryable` & `retryAfterSeconds`
- [x] Implement `PublisherRegistry` / resolver (`src/infrastructure/adapters/publisher-registry.ts`)

## 5. OAuth & Token Management Service (`src/modules/tokens/tokens.service.ts`)
- [x] Acquire access tokens from fake OAuth server
- [x] Encrypt tokens using AES-256-GCM and store in `platform_tokens` database table
- [x] Retrieve and decrypt tokens safely for publishing requests

## 6. Publishing Service (`src/modules/publishing/publishing.service.ts`)
- [x] Implement application-level `PublishingService`
  - [x] Fetch social post by ID and verify publishing eligibility
  - [x] Retrieve & decrypt platform OAuth access token
  - [x] Resolve appropriate `SocialPublisher` adapter
  - [x] Execute `publish()` with idempotency key propagation
  - [x] Bounded 429 rate limit retry logic respecting `Retry-After` headers
  - [x] Update `social_posts` table with `externalPostId`, status (`publishing` / `published` / `failed`), and error details
  - [x] Persist `externalPostId` upon success

## 7. Fastify API Endpoint & OpenAPI Docs (`src/app/routes/publishing.routes.ts`)
- [x] Implement `POST /api/v1/social-posts/:id/publish` route handler
- [x] Define Fastify JSON schema for Swagger UI documentation at `/docs`
- [x] Register route in `src/app/app.ts`

## 8. Automated Testing & Verification
- [x] Write unit tests for AES-256-GCM token encryption/decryption (`tests/token-encryption.test.ts`)
- [x] Write unit/integration tests for `FakeInstagramPublisher` and `FakeXPublisher` (`tests/publishers.test.ts`)
- [x] Write integration tests for idempotent publishing and 429 `Retry-After` backoff (`tests/idempotent-publishing.test.ts`)
- [x] Write API integration tests for `POST /api/v1/social-posts/:id/publish` (`tests/publishing-api.test.ts`)
- [x] Verify `pnpm run typecheck` passes with 0 errors
- [x] Verify `pnpm --filter server test` passes all tests
- [x] Verify OpenAPI/Swagger documentation at `/docs`

## 9. Completion Report & Final Audit
- [x] Produce Phase 3 completion report and readiness statement for Phase 4
