## [1.5.0] - 2025-10-07

### Changed
- Repository reduced to 3 services: `apps/backend`, `apps/frontend`, `apps/documentos`.
- Removed gateway, chat-processor and calidad apps and all references in backend, frontend, docs and infra.
- Default database names unified to `monorepo-bca` across `.env` and fallbacks.
- Updated Prisma output for `apps/documentos` to avoid client/type conflicts.

### Fixed
- Lint errors in `apps/documentos` (unused variables, flat config alignment).
- Frontend build issues due to stale imports and removed routes.

### Infra
- Docker Compose cleaned (dev/hybrid/prod) to keep only required infra (PostgreSQL, Redis, MinIO, Nginx; Flowise kept per user request in specific stack).

## [1.4.0] - 2025-08-29

### Fixed
- Frontend build failure in `documentos` UI by replacing console calls and adjusting vite remove-console.
- ESLint errors across backend routes (`docs.routes.ts`, `transportistas.ts`).
- OpenAPI YAML indentation and missing `$ref` for Transportistas.
- Documentos ESLint config to include tests; unused imports removed.

### Added
- Standalone Docker build for `apps/documentos` with `tsconfig.standalone.json` and prune.
- Local `UserRole` enum to decouple from Prisma client in `documentos`.
- New mobile-first components and hooks (FAB, TouchFeedback, Calendario, etc.).
- Approval queue and detail pages with KPIs.

### CI/CD
- Green pipelines for backend, documentos, and frontend (lint/build/tests/OpenAPI bundle).


