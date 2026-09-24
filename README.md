# Multi-Platform Social Campaign Publisher — Capstone Project

## 1. Project Overview

The **Multi-Platform Social Campaign Publisher** is a high-reliability backend system designed to publish, schedule, and track multi-platform social media campaigns (Instagram, X, etc.) across diverse media formats and accounts.

This repository is structured as a **pnpm workspace monorepo** separating the API server (`apps/server`) and frontend web interface (`apps/web`).

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
│   ├── server/                   # Fastify backend application
│   │   ├── .env                  # Server environment variables
│   │   ├── .env.example          # Server environment template
│   │   ├── drizzle.config.ts     # Drizzle Kit configuration
│   │   ├── vitest.config.ts      # Vitest test runner configuration
│   │   ├── src/
│   │   │   ├── app/              # Fastify application factory & plugins
│   │   │   │   ├── app.ts        # App factory (buildApp)
│   │   │   │   ├── plugins/      # Error handler, Swagger, Logger
│   │   │   │   └── routes/       # Route schemas & handlers (/health, /health/ready)
│   │   │   ├── config/           # Centralized Zod env validation & config
│   │   │   ├── db/               # Drizzle client, migrations, schemas
│   │   │   ├── infrastructure/   # Redis client, BullMQ test queue, Pino logger
│   │   │   ├── modules/          # Domain services (Health Service)
│   │   │   ├── shared/           # Error classes, types, utils
│   │   │   ├── workers/          # Standalone BullMQ background worker
│   │   │   └── server.ts         # HTTP Server entry point
│   │   └── tests/                # Automated infrastructure & API tests
│   │
│   └── web/                      # Frontend web application placeholder
│       ├── .env                  # Web environment variables
│       └── .env.example          # Web environment template
│
├── packages/                     # Shared monorepo packages
├── docker-compose.yml            # PostgreSQL (5343) & Redis (6378) services
├── pnpm-workspace.yaml           # Monorepo workspace configuration
├── package.json                  # Root workspace scripts
└── tasks.md                      # Phase 0 task checklist & verification log
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

Environment configuration is managed **separately** for each application:

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

### Web Environment (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3000/api/v1
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
| `pnpm build` | Compiles TypeScript for all workspace apps/packages |
| `pnpm test` | Runs Vitest integration test suite |
| `pnpm typecheck` | Validates TypeScript strict types across workspace |
| `pnpm db:generate` | Generates Drizzle SQL migrations |
| `pnpm db:migrate` | Runs Drizzle SQL migrations against PostgreSQL |
| `pnpm db:studio` | Opens Drizzle Studio GUI for visual database management |

---

## 8. Verification & Test Suite

The infrastructure test suite covers liveness, readiness, DB connection, Redis connection, BullMQ queue/worker execution, Swagger docs generation, and error handling.

Run tests:
```bash
pnpm test
```

Expected output:
```text
 ✓ tests/infrastructure.test.ts (3 tests)
 ✓ tests/error-handler.test.ts (2 tests)
 ✓ tests/health.test.ts (3 tests)
 ✓ tests/swagger.test.ts (2 tests)

 Test Files  4 passed (4)
      Tests  10 passed (10)
```

---

## 9. Phase 0 Definition of Done Checklist

- [x] Fastify server starts cleanly separately from startup script
- [x] TypeScript strict compilation passes without errors (`pnpm typecheck`)
- [x] PostgreSQL & Redis run isolated via Docker Compose (Ports 5343 & 6378)
- [x] Drizzle ORM client connected & migrations execute cleanly (`pnpm db:migrate`)
- [x] Redis connection management & shutdown handled gracefully
- [x] BullMQ test queue pushes jobs and standalone worker processes them
- [x] Structured Pino JSON logging with credential redaction (`authorization`, `password`, `tokens`)
- [x] Request ID generation & propagation (`X-Request-ID` header correlation)
- [x] Centralized environment variable validation using Zod
- [x] Liveness endpoint `GET /api/v1/health` returns `200 OK`
- [x] Readiness endpoint `GET /api/v1/health/ready` verifies PostgreSQL & Redis health
- [x] Centralized error handler returning structured JSON (`{ error: { code, message, requestId } }`)
- [x] Swagger UI served at `/docs` and OpenAPI JSON served at `/docs/json`
- [x] All 10 automated Vitest integration & infrastructure tests pass
- [x] pnpm monorepo setup (`apps/server`, `apps/web`, `packages/`) with independent `.env` files
