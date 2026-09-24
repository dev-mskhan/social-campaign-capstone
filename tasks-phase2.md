# Phase 2 — Content Generation Task List

## 1. Environment & Setup
- [x] Audit Phase 1 foundation & contracts
- [x] Create `tasks-phase2.md` task breakdown

## 2. Image Variant Pipeline (`src/modules/content/image-pipeline.service.ts`)
- [x] Implement Sharp image variant generator
  - [x] Instagram 1080x1080 (1:1) with safe-zone compliance (10% padding / center 864x864 safe area)
  - [x] X 1600x900 (16:9) with safe-zone compliance (10% padding / center 1280x720 safe area)
  - [x] Non-distorting aspect ratio cover & extract strategy
  - [x] Static output file storage in `uploads/` directory
  - [x] Return image variant URLs

## 3. Caption Composition System (`src/modules/content/caption-composer.service.ts`)
- [x] Implement platform-tailored caption composition
  - [x] Instagram caption formatting (visual-first, line breaks, 3-5 hashtags, <= 2200 chars)
  - [x] X caption formatting (concise summary, direct blog URL link, 1-2 hashtags, <= 280 chars)
  - [x] Deterministic template engine (no paid external AI required)

## 4. Campaign & Social Posts Service (`src/modules/campaigns/campaigns.service.ts`)
- [x] Implement campaign creation and social post generation
  - [x] Persist campaign record into `campaigns` table
  - [x] Generate image variants and tailored captions for requested platforms
  - [x] Persist social posts into `social_posts` table with status `'queued'` and unique `idempotencyKey`
  - [x] Implement campaign retrieval (`getCampaignById`, `getCampaignPosts`)

## 5. BullMQ Content Generation Queue (`src/infrastructure/queue/content-queue.ts`)
- [x] Set up BullMQ queue `content-generation-queue` using shared Redis connection
- [x] Create worker handler in `src/workers/index.ts` reusing Redis client

## 6. Fastify API Routes & OpenAPI Docs (`src/app/routes/campaigns.routes.ts`)
- [x] Implement `POST /api/v1/campaigns` route with complete Fastify JSON schemas
- [x] Implement `GET /api/v1/campaigns/:id` route
- [x] Implement `GET /api/v1/campaigns/:id/posts` route
- [x] Register routes in `src/app/app.ts`
- [x] Serve static `/uploads` images

## 7. Testing & Quality Assurance
- [x] Write Sharp image pipeline tests (`tests/image-pipeline.test.ts`)
- [x] Write caption composer tests (`tests/caption-composer.test.ts`)
- [x] Write API integration & database persistence tests (`tests/campaigns.test.ts`)
- [x] Verify `pnpm run typecheck` passes cleanly (0 errors)
- [x] Verify `pnpm --filter server test` passes all tests (29/29 tests passed)
- [x] Verify Swagger OpenAPI documentation at `/docs`

## 8. Final Audit
- [x] Perform read-only Phase 2 audit and produce report
