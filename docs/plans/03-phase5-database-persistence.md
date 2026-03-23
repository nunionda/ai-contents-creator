# Plan: Phase 5 - Database Persistence (Prisma ORM)

## 1. Objective
Replace the in-memory `Map<string, any>` store in the API with a PostgreSQL-backed persistence layer using Prisma ORM. Analysis results must survive server restarts and support paginated listing, while maintaining full backward compatibility with the existing frontend dashboard.

## 2. Core Features (Scope)

### A. Database Package (`packages/database/`)
- **Goal:** Create a shared workspace package encapsulating all database access logic.
- **Implementation:**
  - Prisma schema with a hybrid design: scalar columns for queryable summary/feature fields, JSONB columns for nested arrays (characterNetwork, beatSheet, emotionGraph, predictions).
  - Singleton PrismaClient with hot-reload safety via `globalThis` pattern.
  - Repository pattern (`AnalysisReportRepository`) with `save`, `findByScriptId`, and `findAll` methods.

### B. Schema Design (`AnalysisReport` model)
- **Goal:** Balance queryability with simplicity — avoid over-normalization of document-like analysis results.
- **Implementation:**
  - Normalized fields: `scriptId` (unique), `protagonist`, `predictedRoi`, `predictedRating`, scene/character/dialogue counts.
  - JSONB fields: `characterNetwork`, `beatSheet`, `emotionGraph`, `predictions` — always read/written as a unit.
  - Indexed: `predictedRoi`, `predictedRating`, `createdAt` for future filtering/sorting.

### C. API Migration (`apps/api/src/index.ts`)
- **Goal:** Minimal surgical edits to replace in-memory store with repository calls.
- **Implementation:**
  - Replace `analysisStore.set()` with `reportRepo.save()` (upsert semantics).
  - Replace `analysisStore.get()` with `reportRepo.findByScriptId()`.
  - Add `GET /reports` endpoint with page/pageSize pagination.
  - `toApiResponse()` mapper ensures identical JSON shape for frontend.

### D. Environment & Infrastructure
- **Goal:** Seamless local development with existing Docker Compose or local PostgreSQL.
- **Implementation:** `DATABASE_URL` in `.env` / `.env.example`, dotenv loading in database client for monorepo CWD compatibility.

## 3. Storage & Integration
- PostgreSQL 15+ (Docker Compose pre-configured or local Homebrew installation).
- Prisma migrations committed to source control (`packages/database/prisma/migrations/`).
- Output format unchanged — the dashboard at `apps/web` requires zero modifications.
