# Phase 3 — Adapters & Publishing System Task List

## 1. Setup & Environment
- [ ] Create `tasks-phase3.md` task breakdown
- [ ] Configure `FAKE_PLATFORM_BASE_URL` and `TOKEN_ENCRYPTION_KEY` in `env.ts` and `.env.example`

## 2. Token Encryption Security Layer (`src/infrastructure/security/token-encryption.ts`)
- [ ] Implement AES-256-GCM token encryption & decryption utility using Node.js `node:crypto`
  - [ ] Random IV generation per encryption operation (never reuse IVs)
  - [ ] Store `encryptedToken`, `iv`, and `authMetadata`
  - [ ] Decrypt access token cleanly in memory when needed for publishing
  - [ ] Ensure plaintext tokens and encryption keys are NEVER logged by Pino

## 3. Fake Social Platform Server (`src/infrastructure/fake-platform/server.ts`)
- [ ] Implement embedded Fake Social Platform HTTP Server/Service
  - [ ] Fake OAuth token exchange (`POST /oauth/token`)
  - [ ] Fake Instagram publish (`POST /api/v1/instagram/publish`)
  - [ ] Fake X publish (`POST /api/v1/x/publish`)
  - [ ] Support `Authorization: Bearer <token>` validation
  - [ ] Support durable idempotency tracking (return existing post on duplicate `idempotencyKey`)
  - [ ] Support rate limit simulation (`429 Too Many Requests` with `Retry-After` headers)

## 4. SocialPublisher Adapters & Resolver (`src/infrastructure/adapters/`)
- [ ] Implement `FakeInstagramPublisher` implementing `SocialPublisher`
- [ ] Implement `FakeXPublisher` implementing `SocialPublisher`
- [ ] Translate generic `PublishInput` to fake server request payloads
- [ ] Propagate `idempotencyKey` in requests
- [ ] Translate platform responses into `PublishResult` and `PublishError` with `isRetryable` & `retryAfterSeconds`
- [ ] Implement `PublisherRegistry` / resolver (`src/infrastructure/adapters/publisher-registry.ts`)

## 5. OAuth & Token Management Service (`src/modules/tokens/tokens.service.ts`)
- [ ] Acquire access tokens from fake OAuth server
- [ ] Encrypt tokens using AES-256-GCM and store in `platform_tokens` database table
- [ ] Retrieve and decrypt tokens safely for publishing requests

## 6. Publishing Service (`src/modules/publishing/publishing.service.ts`)
- [ ] Implement application-level `PublishingService`
  - [ ] Fetch social post by ID and verify publishing eligibility
  - [ ] Retrieve & decrypt platform OAuth access token
  - [ ] Resolve appropriate `SocialPublisher` adapter
  - [ ] Execute `publish()` with idempotency key propagation
  - [ ] Bounded 429 rate limit retry logic respecting `Retry-After` headers
  - [ ] Update `social_posts` table with `externalPostId`, status (`publishing` / `published` / `failed`), and error details
  - [ ] Persist `externalPostId` upon success

## 7. Fastify API Endpoint & OpenAPI Docs (`src/app/routes/publishing.routes.ts`)
- [ ] Implement `POST /api/v1/social-posts/:id/publish` route handler
- [ ] Define Fastify JSON schema for Swagger UI documentation at `/docs`
- [ ] Register route in `src/app/app.ts`

## 8. Automated Testing & Verification
- [ ] Write unit tests for AES-256-GCM token encryption/decryption (`tests/token-encryption.test.ts`)
- [ ] Write unit/integration tests for `FakeInstagramPublisher` and `FakeXPublisher` (`tests/publishers.test.ts`)
- [ ] Write integration tests for idempotent publishing and 429 `Retry-After` backoff (`tests/idempotent-publishing.test.ts`)
- [ ] Write API integration tests for `POST /api/v1/social-posts/:id/publish` (`tests/publishing-api.test.ts`)
- [ ] Verify `pnpm run typecheck` passes with 0 errors
- [ ] Verify `pnpm --filter server test` passes all tests
- [ ] Verify OpenAPI/Swagger documentation at `/docs`

## 9. Completion Report & Final Audit
- [ ] Produce Phase 3 completion report and readiness statement for Phase 4
