# Multi-Platform Social Campaign Publisher — Capstone Project

## 1. Project Overview

The **Multi-Platform Social Campaign Publisher** is a high-reliability backend system designed to publish, schedule, and track multi-platform social media campaigns (Instagram, X, etc.) across diverse media formats and accounts.

This repository is structured as a **pnpm workspace monorepo** housing the Fastify API server application (`apps/server`).

---

## 2. Technology Stack (Phase 0 Foundation)

* **Monorepo Management**: pnpm workspaces
* **Runtime**: Node.js (v20+), TypeScript (Strict Mode)
* **HTTP Framework**: Fastify (Native plugin architecture)
* **Database**: PostgreSQL (v16-alpine) with Drizzle ORM & Drizzle Kit
* **Queue / Async Jobs**: Redis (v7-alpine) & BullMQ
* **Logging**: Pino (Structured JSON logging with request ID correlation & credential redaction)
* **API Documentation**: Swagger / OpenAPI generated dynamically via `@fastify/swagger` and `@fastify/swagger-ui`
* **Validation**: Fastify route JSON Schema validation & Zod environment validation
* **Testing**: Vitest (`app.inject()` integration tests & infrastructure unit tests)
* **Infrastructure**: Docker & Docker Compose

---

## 3. Monorepo Structure

```text
social-campaign/
├── apps/
│   └── server/                   # Fastify backend application
│       ├── .env                  # Server environment variables
│       ├── .env.example          # Server environment template
│       ├── drizzle.config.ts     # Drizzle Kit configuration
│       ├── vitest.config.ts      # Vitest test runner configuration
│       ├── src/
│       │   ├── app/              # Fastify application factory & plugins
│       │   │   ├── app.ts        # App factory (buildApp)
│       │   │   ├── plugins/      # Error handler, Swagger, Logger
│       │   │   └── routes/       # Route schemas & handlers (/health, /health/ready, /campaigns, /publishing, /webhooks)
│       │   ├── config/           # Centralized Zod env validation & config
│       │   ├── db/               # Drizzle client, migrations, schemas
│       │   ├── infrastructure/   # Redis client, BullMQ queues & workers, Pino logger
│       │   ├── modules/          # Domain services (Campaigns, Content, Publishing, Tokens, Webhooks)
│       │   ├── shared/           # Error classes, types, utils
│       │   └── server.ts         # HTTP Server entry point
│       └── tests/                # Automated infrastructure, domain & API integration tests
│
├── packages/                     # Shared monorepo packages
├── docker-compose.yml            # PostgreSQL (5343) & Redis (6378) services
├── pnpm-workspace.yaml           # Monorepo workspace configuration
├── package.json                  # Root workspace scripts
└── tasks.md                      # Phase task checklists & verification logs
```

---

## 4. Architecture Diagram

```text
                    ┌──────────────────┐
                    │      Client      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     Fastify      │
                    │    REST API      │
                    └───────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌───────────┐  ┌──────────┐
        │PostgreSQL│  │   Redis   │  │  Pino    │
        │ + Drizzle│  │ (port 6378│  │  Logger  │
        │(port 5343)  └─────┬─────┘  └──────────┘
        └──────────┘        │
                            ▼
                      ┌───────────┐
                      │  BullMQ   │
                      │   Queue   │
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │  Worker   │
                      └───────────┘
```

**OpenAPI / Swagger Integration**:
```text
Client ──► Fastify ──► Route Schemas ──► Swagger UI (/docs) & OpenAPI JSON (/docs/json)
```

---

## 5. Environment Setup

### Server Environment (`apps/server/.env`)
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5343/social_campaign_db
REDIS_URL=redis://127.0.0.1:6378

LOG_LEVEL=info
API_PREFIX=/api/v1
```

---

## 6. Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Docker](https://www.docker.com/) & Docker Compose

### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url>
cd social-campaign
pnpm install
```

### Step 2: Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```
* PostgreSQL runs on `localhost:5343`
* Redis runs on `localhost:6378`

### Step 3: Run Database Migrations
```bash
pnpm db:migrate
```

To generate new Drizzle migrations after schema updates:
```bash
pnpm db:generate
```

### Step 4: Start Development API Server
```bash
pnpm dev:server
```
Server runs at `http://localhost:3000`. Swagger documentation available at `http://localhost:3000/docs`.

### Step 5: Start Background BullMQ Worker (Separate Process)
```bash
pnpm worker
```

---

## 7. Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev:server` | Starts Fastify development server with auto-reload (`apps/server`) |
| `pnpm worker` | Starts standalone BullMQ worker process (`apps/server`) |
| `pnpm seed` | Populates PostgreSQL and Redis with deterministic demo campaign data |
| `pnpm build` | Compiles TypeScript for all workspace apps/packages |
| `pnpm test` | Runs Vitest integration test suite |
| `pnpm typecheck` | Validates TypeScript strict types across workspace |
| `pnpm db:generate` | Generates Drizzle SQL migrations |
| `pnpm db:migrate` | Runs Drizzle SQL migrations against PostgreSQL |
| `pnpm db:studio` | Opens Drizzle Studio GUI for visual database management |

---

## 8. Verification & Test Suite

Run full automated test suite (61/61 passing):
```bash
pnpm test
```

---

## 9. Phase 5 — Evaluator Acceptance Probe Rehearsal Guide

The system can be evaluated against all six core acceptance probes on a clean environment:

### Step 1: Clean Start & Infrastructure
```bash
docker compose up -d
pnpm db:migrate
pnpm seed
```

### Step 2: Start API Server & Worker
```bash
pnpm dev:server
# In a separate terminal:
pnpm worker
```

### Step 3: Interactive Swagger API Documentation
Open `http://localhost:3000/docs` to view and execute OpenAPI endpoints.

---

### Acceptance Probe Scenarios

#### Probe 1 — Duplicate Publish (The Idempotency Hammer)
- **Scenario**: Send repeated publish requests for the same post (`POST /api/v1/social-posts/:id/publish`).
- **Result**: All retries reuse the deterministic `idempotencyKey` (`post_<campaignId>_<platform>`). The platform server returns the existing `externalPostId`, guaranteeing **exactly 1 external post**.
- **Automated Test**: `tests/idempotent-publishing.test.ts` & `tests/publishing-api.test.ts`

#### Probe 2 — 429 Rate Limit Handling
- **Scenario**: Fake platform simulates `429 Too Many Requests` with `Retry-After: 2`.
- **Result**: `PublishingService` executes exponential backoff respecting the 2-second delay and succeeds on retry using the identical idempotency key.
- **Automated Test**: `tests/idempotent-publishing.test.ts`

#### Probe 3 — Worker Crash & Restart Recovery
- **Scenario**: Enqueue job, kill worker process mid-execution, start fresh worker instance.
- **Result**: The job is safely recovered from Redis by BullMQ. The worker checks PostgreSQL source of truth, uses the deterministic idempotency key, and completes publishing with **0 duplicate posts**.
- **Automated Test**: `tests/queue-worker.test.ts`

#### Probe 4 — Signed Webhook Trust & Forged Webhook Rejection
- **Scenario 4A (Forged)**: Post payload to `POST /api/v1/webhooks/social-delivery` with invalid `x-social-signature`. Returns `HTTP 400 Bad Request`. Database status remains `publishing`.
- **Scenario 4B (Valid)**: Post payload with valid HMAC-SHA256 signature (`crypto.timingSafeEqual`). Returns `HTTP 200 OK`. Post status flips from `publishing` → `published` and sets `publishedAt`.
- **Automated Test**: `tests/webhooks-api.test.ts` & `tests/status-trust.test.ts`

#### Probe 5 — Content Artifact Specifications
- **Instagram**: Sharp pipeline resizes image to exact `1080 × 1080` (1:1 ratio) with caption ≤2200 chars and hashtags.
- **X**: Sharp pipeline resizes image to exact `1600 × 900` (16:9 ratio) with caption ≤280 chars with link.
- **Automated Test**: `tests/image-pipeline.test.ts` & `tests/caption-composer.test.ts`

#### Probe 6 — Token Security
- **Database**: `platform_tokens` table stores encrypted token string packed as `authTag:ciphertext` (AES-256-GCM). No plaintext OAuth token is stored.
- **Logs**: Pino logger redacts `authorization`, `password`, `tokens`. Plaintext secrets never appear in logs or API responses.
- **Automated Test**: `tests/token-encryption.test.ts`

