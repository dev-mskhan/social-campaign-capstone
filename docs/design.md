# System Design Document: Multi-Platform Social Campaign Publisher

## 1. Problem Statement
Publishing marketing campaigns from source content (e.g., blog posts) to multiple social media platforms involves significant reliability challenges:
- **Platform-Specific Formatting**: Each platform enforces unique image dimensions, aspect ratios, character limits, and content tone.
- **Duplicate Publishing Risks**: Network timeouts, retries, or worker restarts can accidentally publish identical content multiple times if idempotency is not enforced durably.
- **Rate Limits & Failures**: Transient HTTP 429 rate-limit responses and network failures require structured backoff respecting platform `Retry-After` hints.
- **Asynchronous Delivery Status**: Direct publishing APIs may accept a post asynchronously, requiring webhook callbacks for final status verification.
- **Credential Security**: Access tokens and API secrets must be protected at rest with encryption and never leaked in logs.

The Multi-Platform Social Campaign Publisher provides an automated, reliable backend engine that transforms blog post content into platform-tailored social campaigns, schedules delivery durably, guarantees idempotent execution, and tracks post status via signed webhooks.

---

## 2. Core Scope
The core capstone implementation covers:
1. **Multi-Platform Specification**: Platform-tailored media specs and caption composition for **Instagram** and **X (Twitter)**.
2. **Abstract Publisher Interface (`SocialPublisher`)**: A platform-agnostic interface decoupling core application logic from concrete platform implementations.
3. **Fake Platform Adapters**: Adapters targeting the provided fake social platform server (`FakeInstagramPublisher` and `FakeXPublisher`).
4. **Durable Idempotency**: Database-level uniqueness constraints and key propagation preventing duplicate publishing.
5. **Durable Queue & Scheduling**: Redis/BullMQ queueing for immediate and delayed publishing that survives worker process restarts.
6. **Encrypted Credentials**: Storing OAuth tokens at rest using AES-256-GCM with random initialization vectors (IVs).
7. **Webhook Status Verification**: Ingestion of signed delivery webhooks (`/api/v1/webhooks/social-delivery`) to confirm publication.

---

## 3. Platform Specifications & Safe-Zone Requirement

### Instagram Specification
- **Platform ID**: `instagram`
- **Image Size**: 1080 × 1080 px
- **Aspect Ratio**: 1:1 (Square)
- **Caption Rules**: Up to 2200 characters; visual-first tone; 3–5 hashtags; line-break formatting.

### X (Twitter) Specification
- **Platform ID**: `x`
- **Image Size**: 1600 × 900 px
- **Aspect Ratio**: 16:9 (Widescreen)
- **Caption Rules**: Up to 280 characters; punchy, direct tone; 1–2 hashtags; direct URL link.

### Caption Composition Contract
Caption generation separates shared brand identity from platform rules:
```text
Shared Brand Voice (tone, audience, core message)
+ Content Summary (title, key points, link)
+ Platform Rules (char limit, hashtag policy)
→ Platform-Specific Caption
```

### Safe-Zone Requirement
To ensure that key subject elements (text overlays, focal points) are not cropped out when generating different aspect ratios (1:1 square vs 16:9 widescreen), the image variant pipeline enforces an **80% Centered Safe Zone** (10% outer margin padding on all edges):
- **Instagram Safe Box**: Center 864 × 864 px area within the 1080 × 1080 canvas.
- **X Safe Box**: Center 1280 × 720 px area within the 1600 × 900 canvas.

This simple, deterministic rule ensures focal content remains intact across all variants without requiring complex computer vision models.

---

## 4. Architecture

```text
                                  +-----------------------+
                                  |  HTTP API (Fastify)   |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |  Application Service  |
                                  +-----+-----------+-----+
                                        |           |
                     +------------------+           +-------------------+
                     |                                                  |
                     v                                                  v
         +------------------------+                         +-----------------------+
         | Image Variant Pipeline |                         | BullMQ Queue Manager  |
         | (Sharp / Safe Zone)    |                         +-----------+-----------+
         +------------------------+                                     |
                                                                        v
                                                            +-----------------------+
                                                            | Worker / Publisher    |
                                                            +-----------+-----------+
                                                                        |
                                                                        v
                                                            +-----------------------+
                                                            |   SocialPublisher     |
                                                            |      Interface        |
                                                            +----+-------------+----+
                                                                 |             |
                                              +------------------+             +------------------+
                                              |                                                   |
                                              v                                                   v
                                 +-------------------------+                         +-------------------------+
                                 | FakeInstagramPublisher  |                         |     FakeXPublisher      |
                                 +------------+------------+                         +------------+------------+
                                              |                                                   |
                                              +------------------+             +------------------+
                                                                 |             |
                                                                 v             v
                                                     +-----------------------------------+
                                                     |    Fake Social Platform Server    |
                                                     +-------------------+---------------+
                                                                         |
                                                                         | Delivery Webhook
                                                                         v
                                                     +-----------------------------------+
                                                     | POST /webhooks/social-delivery    |
                                                     +-----------------------------------+
```

---

## 5. SocialPublisher Contract

The application layer communicates exclusively with the generic `SocialPublisher` TypeScript interface:

```typescript
export interface PublishInput {
  idempotencyKey: string;
  postId: string;
  campaignId: string;
  platform: PlatformId;
  caption: string;
  imageUrl: string;
  accessToken?: string;
  scheduledAt?: Date;
}

export interface PublishResult {
  success: boolean;
  platform: PlatformId;
  externalPostId: string;
  publishedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SocialPublisher {
  getPlatformId(): PlatformId;
  publish(input: PublishInput): Promise<PublishResult>;
}
```

### Rationale
- **Platform Agnostic**: The application domain does not contain platform-specific `if/else` checks or direct knowledge of platform HTTP endpoints.
- **Idempotency Propagation**: Accepts the `idempotencyKey` explicitly so adapters propagate it in HTTP headers (`Idempotency-Key` or payload).
- **Error Uniformity**: Converts platform HTTP errors into standard `PublishError` objects carrying `isRetryable` flags and `retryAfterSeconds` hints.

---

## 6. Data Model

The PostgreSQL database schema (managed via Drizzle ORM) enforces domain integrity:

### 1. `campaigns` Table
Represents the top-level marketing campaign generated from blog content.
- `id` (uuid, PK)
- `title` (varchar 255, NOT NULL)
- `body` (text, NOT NULL)
- `source_url` (varchar 1024)
- `source_image_url` (varchar 1024)
- `status` (varchar 50, DEFAULT 'scheduled')
- `scheduled_at` (timestamp with tz)
- `created_at`, `updated_at` (timestamp with tz)

### 2. `social_posts` Table
Represents platform-specific target posts associated with a campaign.
- `id` (uuid, PK)
- `campaign_id` (uuid, FK -> `campaigns.id` ON DELETE CASCADE)
- `platform` (varchar 50, NOT NULL) — `'instagram'` | `'x'`
- `caption` (text, NOT NULL)
- `image_variant_url` (varchar 1024, NOT NULL)
- `status` (varchar 50, NOT NULL, DEFAULT 'queued') — `'queued'` | `'publishing'` | `'published'` | `'failed'`
- `idempotency_key` (varchar 255, UNIQUE, NOT NULL) — **Guarantees durable idempotency**
- `external_post_id` (varchar 255) — Assigned upon successful delivery
- `retry_count` (integer, DEFAULT 0)
- `last_error` (text)
- `scheduled_at` (timestamp with tz)
- `published_at` (timestamp with tz)
- `created_at`, `updated_at` (timestamp with tz)
- **Constraints**:
  - `UNIQUE(campaign_id, platform)` — Max 1 post per platform per campaign.
  - `UNIQUE(idempotency_key)` — DB-level duplicate prevention.

### 3. `platform_tokens` Table
Stores OAuth credentials encrypted at rest.
- `id` (uuid, PK)
- `platform` (varchar 50, UNIQUE, NOT NULL)
- `encrypted_token` (text, NOT NULL) — Cipher text
- `iv` (varchar 255, NOT NULL) — Random initialization vector
- `auth_metadata` (jsonb) — Expiration, scopes (non-sensitive)
- `created_at`, `updated_at` (timestamp with tz)

---

## 7. Status Model & State Transitions

Valid `SocialPostStatus` state machine:
```text
queued ──────────────► publishing ──────────────► published
                          │
                          ▼
                       failed ───► queued (retry)
```

### Transition Rules
1. `queued -> publishing`: Permitted when a background worker picks up the post for delivery.
2. `publishing -> published`: Permitted **ONLY** upon receiving and verifying a signed social delivery webhook or direct sync confirmation.
3. `publishing -> failed`: Permitted when terminal failure occurs or retry count is exhausted.
4. `failed -> queued`: Permitted for manual or automated retry re-queueing.
5. **Direct Bypass Prohibited**: `queued -> published` directly without entering `publishing` and receiving webhook confirmation is strictly prohibited by domain assertions.

---

## 8. API Surface

| Endpoint | Method | Purpose | Key Inputs | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/campaigns` | `POST` | Create campaign & generate social post drafts | `title`, `body`, `sourceUrl`, `platforms`, `scheduledAt` | 201 Created (`CampaignResponse`) |
| `/api/v1/campaigns/:id` | `GET` | Get campaign details & post delivery statuses | `id` (path param) | 200 OK (`CampaignResponse`) |
| `/api/v1/campaigns/:id/posts` | `GET` | Get social posts for a campaign | `id` (path param) | 200 OK (`SocialPostResponse[]`) |
| `/api/v1/webhooks/social-delivery` | `POST` | Receive signed post delivery webhooks | `eventId`, `idempotencyKey`, `externalPostId`, `status` | 200 OK (`WebhookResponse`) |

---

## 9. Layer Responsibilities

```text
HTTP / Routes (Fastify)
  ├── Request validation (Fastify JSON Schemas / Zod)
  ├── Mapping application errors to HTTP status codes (4xx vs 500)
  └── Response formatting & OpenAPI documentation
        │
        v
Application / Services
  ├── Campaign orchestration & image variant generation triggers
  ├── Idempotency key generation & database transaction control
  └── Queue job creation (BullMQ delayed jobs)
        │
        v
Domain Layer
  ├── Platform specifications & safe-zone contracts
  ├── SocialPublisher interface definition
  └── Status transition state machine validation
        │
        v
Infrastructure
  ├── Database persistence (PostgreSQL / Drizzle ORM)
  ├── Durable queues & Redis connection management
  ├── Crypto token encryption / decryption (AES-256-GCM)
  └── Concrete Fake Social Platform Adapters (FakeInstagramPublisher, FakeXPublisher)
```

---

## 10. Reliability Invariants

1. **Durable Idempotency**: Duplicate calls with the same idempotency key are caught by database unique constraints (`social_posts_idempotency_key_unique`), guaranteeing that no double-publishing occurs regardless of network failures or worker restarts.
2. **Status Integrity**: A post status reaches `published` only after a cryptographically verified delivery webhook payload is processed.
3. **Credential Security**: OAuth access tokens are encrypted using random IVs (AES-256-GCM) before DB insertion and are redacted from all Pino logs.
4. **Rate Limit Handling**: Rate limit responses (HTTP 429) read `Retry-After` headers and re-queue jobs with BullMQ delayed execution.
5. **Crash Resilience**: Queue jobs and status state reside durably in Redis and PostgreSQL; crashing workers resume seamlessly without losing state.

---

## 11. Explicit Non-Goal

> **Explicit Non-Goal**: Real social-media platform publishing (direct calls to production Instagram Graph API or X API v2) is intentionally **OUT OF SCOPE** for the core system. The core system publishes exclusively against the provided fake social platform server. Stretch goal extensions for real platform APIs are intentionally excluded from the core implementation phase.

---

## 12. Design Decision Records (ADRs)

### Decision 1 — Focus on Two Platforms (Instagram & X)
- **Context**: Multi-platform publishing must demonstrate varying media and text constraints without unnecessary operational complexity.
- **Decision**: Target Instagram (1:1 square image, 2200 char caption) and X (16:9 widescreen image, 280 char caption).
- **Rationale**: Provides contrasting visual and text rules sufficient to validate adapter architecture.

### Decision 2 — Generic `SocialPublisher` Adapter Boundary
- **Context**: The application layer must not depend on platform implementation details.
- **Decision**: Define a single `SocialPublisher` interface and instantiate `FakeInstagramPublisher` and `FakeXPublisher` behind it.
- **Rationale**: Decouples business logic from platform transport, enabling seamless future adapter additions.

### Decision 3 — Database-Backed Durable Idempotency
- **Context**: Process restarts or distributed worker execution could bypass in-memory idempotency caches.
- **Decision**: Persist `idempotency_key` on the `social_posts` table with a UNIQUE database index.
- **Rationale**: PostgreSQL enforces atomic, durable uniqueness even across concurrent worker executions.

### Decision 4 — Redis/BullMQ Persistent Job Queue
- **Context**: Scheduled social posts must survive process restarts.
- **Decision**: Use BullMQ backed by Redis for queue management and delayed job scheduling.
- **Rationale**: BullMQ handles delayed jobs, retries, and persistence out of the box with zero data loss on restart.

### Decision 5 — Fake Platform Server Target
- **Context**: Core capstone requires predictable testing of rate-limits, errors, and webhooks without external API quotas or secrets.
- **Decision**: Build and test against the fake social platform server.
- **Rationale**: Ensures deterministic, fast, reproducible tests and zero external network dependencies.
