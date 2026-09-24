# Phase 0 Implementation Plan & Task List (pnpm Monorepo Setup)

## 1. Monorepo & Tooling Setup
- [x] Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [x] Set up Root `package.json` with scripts (`dev:server`, `dev:web`, `worker`, `build`, `test`, `lint`, `typecheck`)
- [x] Configure `apps/server` directory & `apps/server/package.json`
- [x] Configure `apps/web` directory & `apps/web/package.json` placeholder foundation
- [x] Set up `.gitignore`, root `docker-compose.yml` for PostgreSQL (port 5343) & Redis (port 6378)

## 2. Server Configuration & Environment Validation (`apps/server`)
- [x] Create `apps/server/.env` and `apps/server/.env.example`
- [x] Implement `apps/server/src/config/env.ts` with Zod schema for environment variable validation
- [x] Implement `apps/server/src/config/config.ts` exposing typed server configuration

## 3. Pino Logging & Request IDs (`apps/server`)
- [x] Configure Pino logger foundation with structured JSON logging and sensitive headers/field redaction (`apps/server/src/infrastructure/logger/index.ts`)
- [x] Fastify logger plugin integration with request ID generation and propagation (`X-Request-ID` header)

## 4. Database Setup (PostgreSQL + Drizzle ORM in `apps/server`)
- [x] Implement Drizzle ORM database client (`apps/server/src/db/client.ts`)
- [x] Create initial infrastructure health check table schema (`apps/server/src/db/schema/health.ts`)
- [x] Set up Drizzle Kit configuration (`apps/server/drizzle.config.ts`) and migration scripts (`apps/server/src/db/migrate.ts`)

## 5. Redis & BullMQ Queue Setup (`apps/server`)
- [x] Implement Redis connection management (`apps/server/src/infrastructure/redis/client.ts`)
- [x] Implement BullMQ test queue manager (`apps/server/src/infrastructure/queue/test-queue.ts`)
- [x] Create standalone worker entry point (`apps/server/src/workers/index.ts`) for test job processing

## 6. Shared Error Handling & Utilities (`apps/server`)
- [x] Define standardized application error classes (`apps/server/src/shared/errors/app-error.ts`)
- [x] Implement Fastify centralized error handler plugin (`apps/server/src/app/plugins/error-handler.ts`)

## 7. Fastify App Architecture & Route Definitions (`apps/server`)
- [x] Implement Fastify plugins (`swagger.ts`, `logger.ts`, `database.ts`, `redis.ts`, `error-handler.ts`)
- [x] Create health controller and service (`apps/server/src/modules/health/`)
- [x] Register `/api/v1/health` and `/api/v1/health/ready` routes with JSON schemas (`apps/server/src/app/routes/health.routes.ts`)
- [x] Build Fastify application factory function (`apps/server/src/app/app.ts`)
- [x] Implement server startup script (`apps/server/src/server.ts`) with graceful shutdown handling for Fastify, DB, Redis, BullMQ

## 8. API Documentation (Swagger / OpenAPI in `apps/server`)
- [x] Configure `@fastify/swagger` and `@fastify/swagger-ui` serving UI at `/docs`
- [x] Verify automatic OpenAPI spec generation from route schemas

## 9. Automated Testing (Vitest in `apps/server`)
- [x] Configure Vitest (`apps/server/vitest.config.ts`)
- [x] Write integration test for `GET /api/v1/health`
- [x] Write integration test for `GET /api/v1/health/ready`
- [x] Write integration test for Database connection
- [x] Write integration test for Redis connection
- [x] Write integration test for BullMQ queue/worker execution
- [x] Write integration test for Swagger documentation endpoint
- [x] Write integration test for Error Handler & schema validation failure

## 10. Verification & Documentation
- [x] Execute `pnpm run typecheck`, `pnpm run test`, `pnpm run db:generate`, `pnpm run db:migrate`, `pnpm run build`
- [x] Create comprehensive `README.md` explaining monorepo layout, setup instructions, and Phase 0 status
