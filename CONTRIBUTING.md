## Contribuir al monorepo

Gracias por contribuir. Este documento resume el flujo de trabajo y los estándares.

### Flujo Git
- Trunk-Based Development. Ramas cortas: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- Commits con Conventional Commits.
- PRs pequeños, con checklist completo y al menos 1 reviewer (CODEOWNERS aplica).

### Checks locales antes de PR
```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

### Estándares de código
- TypeScript `strict: true`, sin `any` innecesarios.
- ESLint + Prettier sin warnings.
- Validaciones en bordes con Zod/Joi.
- Manejo de errores y logs consistentes (Winston).

### Tests
- Unit > integración > E2E para casos críticos.
- Cobertura mínima igual o superior al umbral del repo.

### Entornos y variables
- Variables en `.env` raíz. No commitear secretos. Usar `.env.example` como guía.
- Prisma y migraciones desde la raíz con `--schema=apps/backend/prisma/schema.prisma`.

### CI/CD
- PR: lint, typecheck, test, build; no se mergea con errores.
- `main`: despliegue a staging. Producción requiere aprobación manual.

### Seguridad
- JWT RS256, bcrypt ≥ 12, rate-limit y CORS por entorno.
- No incluir PII en logs.

### ADRs y documentación
- Documentar decisiones técnicas relevantes en `docs/`.
- Mantener CHANGELOG y README actualizados.


