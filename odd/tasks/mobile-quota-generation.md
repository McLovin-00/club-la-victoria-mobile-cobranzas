# Mobile quota generation

Objective: Let cobradores generate a quota for one member and period in mobile so the existing individual credit can be applied.
Branches: `feat/mobile-quota-generation` in `club-la-victoria-mobile-cobranzas` and `club-la-victoria-backend`.
Delivery: `ask-on-risk`; test runner: Jest in the mobile app and backend.

## Specs

### S1 — Generate a member quota from mobile

User request, verbatim:

> Claro, el tema es que hay que permitir desde la aplicación mobile que se pueda hacer esto, porque actualmente no se puede, solamente queda el dinero a favor. Cuando se genera una nueva cuota desde la app web, ahí el cobrador de la app mobile si ve las cuotas nuevas y ahí las podría pagar, pero no tienen la posibilidad de generar estas cuotas para usar ese saldo a favor.

Scope and acceptance criteria:
- The cobrador can generate one quota for a selected member and period from the mobile collection flow.
- After generation, the mobile flow refreshes pending quotas so the cobrador can select the new quota and apply that member's existing credit using the current collection behavior.
- Mobile generation preserves existing quota-generation business rules, including the 3-pending notification and the 4+-pending transition to `MOROSO` with new-quota creation skipped.
- Existing individual collection behavior remains unchanged.

Checks: backend controller tests cover period/member scope; backend service tests cover the 3-pending warning, 4+-pending MOROSO transition, and duplicate-period behavior; mobile tests cover generation, refresh, and the existing credit-backed collection path.

### S2 — Explicitly authorized public endpoint scope

User decision, verbatim:

> Login y jwt en la app mobile no vamos a usar, asi que tal vez crear otro endpoint estaria bien. Es una app privada y la app mobile la distribuyo yo asi que nadie va a entrar que no sea parte del club

> Te dije que por mas que sea inseguro no va a entrar nadie que no deseemos, es un sistema chiquito para un club de un pueblo

Selected option, verbatim: “Endpoint público limitado”.

Scope and acceptance criteria:
- Add a separate unauthenticated mobile endpoint with each request constrained to exactly one member ID and one `YYYY-MM` period; do not accept a member-ID array or route through the broad web batch endpoint directly.
- Reuse the existing quota-generation service and its validation/idempotency behavior. Do not claim that private app distribution authenticates the API caller.
- Document that the endpoint is unauthenticated and test the no-JWT call plus single-member/single-period scope.

Checks: backend endpoint tests verify request scope, validation, and unauthenticated access; backend service tests verify duplicate behavior; mobile tests verify it calls only this endpoint for the selected member and period.

## Tasks
- T1 — S1-S2 — inline — done — commit: `c61577c` — Add `POST /cobros/mobile/socios/:socioId/cuotas` and isolated contract tests. Risk: item 2 (unauthenticated financial operation, explicitly authorized and constrained to one member and period).
- T2 — S1-S2 — inline — done — commit: pending — Add period selection/generation to mobile collection and refresh pending quotas. Risk: item 2 (exposes the authorized unauthenticated quota-generation operation in the mobile UI).

## Log

- L1 (2026-10-30): “Claro, el tema es que hay que permitir desde la aplicación mobile que se pueda hacer esto, porque actualmente no se puede, solamente queda el dinero a favor. Cuando se genera una nueva cuota desde la app web, ahí el cobrador de la app mobile si ve las cuotas nuevas y ahí las podría pagar, pero no tienen la posibilidad de generar estas cuotas para usar ese saldo a favor.”
- L2 (2026-10-30): “Login y jwt en la app mobile no vamos a usar, asi que tal vez crear otro endpoint estaria bien. Es una app privada y la app mobile la distribuyo yo asi que nadie va a entrar que no sea parte del club”
- L3 (2026-10-30): “Te dije que por mas que sea inseguro no va a entrar nadie que no deseemos, es un sistema chiquito para un club de un pueblo”
- L4 (2026-10-30): “Endpoint público limitado”
- L5 (2026-10-30): Source evidence in `club-la-victoria-backend/src/cobros/cobros.service.ts:3001-3037`: selected-quota generation notifies at 3 pending quotas; at 4+ it changes the selected member's state to `MOROSO` and skips quota creation. Asked the user whether mobile should preserve this behavior or differ.
- L6 (2026-11-03): User selected option `1`, “Mantener la regla web”: mobile preserves the existing 3-pending warning and 4+-pending `MOROSO` transition with quota creation skipped.
- L7 (2026-11-03): Implemented T1 as `POST /cobros/mobile/socios/:socioId/cuotas` with no JWT guard, an integer path ID, a `YYYY-MM`-only body DTO, OpenAPI `security: []`, and an exact singleton call into the existing quota-generation service. RED: the new HTTP contract tests returned 404 before the route existed. GREEN: focused controller contract tests pass 3/3 (public call, invalid period, and rejection of plural IDs); `npm run build` passes.
- L8 (2026-11-03): Backend full Jest suite was run and failed: 8 suites failed, 11 passed; 5 tests failed and 194 passed, with other failures caused by existing fixture/type errors. Failures are in unchanged `cobradores`, `grupos-familiares`, `tarjeta-centro-23f`, `temporadas`, `estadisticas`, and `socios` tests. Database E2E was not run because `test/e2e/setup.ts` invokes the development seed against its configured database; an isolated database was not established.
- L9 (2026-11-03): Added isolated service regression tests for the selected member's 3-pending warning, 4+-pending `MOROSO`/skip behavior, and duplicate-period idempotency. The focused controller+service Jest run passes 2 suites/82 tests without a database. Independent review found no implementation defect and requested this missing rule coverage; its scoped recheck remains pending.
- L10 (2026-11-03): The independent scoped recheck passed all three new service-rule probes in a fresh scratch copy (1 suite/3 tests passed); no blockers remained. It rechecked only the morosidad and duplicate-period coverage, not the pending mobile flow.
- L11 (2026-11-03): Committed T1 as backend commit `c61577c` (`feat(cobros): add scoped mobile quota endpoint`). Backend `gentle-ai review mode status` reported `off (decided by global)`, so no native review was started; delivery remains disabled/unmanaged.
- L12 (2026-11-03): User authorized installing lockfile dependencies from `registry.npmjs.org`; `npm ci --ignore-scripts` installed 921 packages without changing `package-lock.json`. npm reported 65 dependency vulnerabilities (7 low, 38 moderate, 19 high, 1 critical); no dependency updates or audit fixes were applied.
- L13 (2026-11-03): T2 implementation adds month navigation, a per-member generation call, pending-quota/member refresh, and visible backend warnings; payment logic itself is unchanged. RED: focused tests initially failed because the month controls, generator, and API method were missing. GREEN: all payment-flow tests and all three T2-focused API/flow tests pass; `tsc --noEmit` passes. Added cleanup for member/generation mocks after observing cross-test state leakage.
- L14 (2026-11-03): Full mobile Jest run: 18 suites passed, 2 failed; 49 tests passed, 4 failed. All four failures were confirmed on the baseline: three `lib/api.test.ts` URL-configuration expectations and `home-success.test.tsx`'s undefined `socios` result. The focused before/after comparison found no new failing legacy test; the API helper tests remain outside this change.
- L15 (2026-11-03): `impeccable detect --json app/cobradora/pago.tsx` returned no findings. Mobile RDD status is `off (decided by global)`; no native review was started. T2 still needs the required independent high-risk verification before commit.
- L16 (2026-11-04): Independent T2 verification initially timed out in a cold scratch Jest run because the full React Native transform exceeded the default 5-second test limit; the parent reproduced an 8.45-second cold run that passed with a 15-second per-test timeout. The flow test now explicitly allows 15 seconds. Independent scratch recheck passed 2 focused tests (14 skipped) with no endpoint/database calls; the strengthened flow asserts the selected pre-existing quota is preserved and $7,000 credit reduces a $10,000 payment to $3,000.
- L17 (2026-11-04): Parent spot check of the strengthened flow/API probes passes (2 suites/2 tests), and `tsc --noEmit` passes after the final test adjustment. The earlier full suite still has four failures confirmed on baseline; no full-suite rerun was performed during the bounded correction.
- L18 (2026-11-04): Independent high-risk verification for T2 is complete. RDD remains globally off, so no native review ran. T2 is complete; its mobile work-unit commit and final commit identity still need recording.
- Analysis: mobile currently applies individual credit when selected pending quotas are collected. The existing multi-member quota-generation endpoint requires JWT, so the user explicitly approved a separate public route limited to one member and one period. This change remains high risk because the route is intentionally unauthenticated.
- Next: commit the completed mobile work unit, record its commit identity in this document and Engram mirror, then report the verified outcome and known baseline failures.
