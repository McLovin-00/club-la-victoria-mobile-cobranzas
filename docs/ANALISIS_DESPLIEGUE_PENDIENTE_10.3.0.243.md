# Análisis: Despliegue Pendiente en 10.3.0.243

**Documento base**: `DESPLIEGUE_10.3.0.243.md` (2024-11-16)  
**Fecha de análisis**: 2026-02-07  
**Último commit en main**: `9800564` (2026-02-07)

---

## Resumen Ejecutivo

El despliegue documentado en `DESPLIEGUE_10.3.0.243.md` corresponde a **noviembre 2024**. Han transcurrido **~15 meses** y hay **~500 commits** en main que no están reflejados en ese documento. El servidor 10.3.0.243 necesita una actualización integral para estar alineado con el código actual de GitHub.

---

## Servicios y Cambios Pendientes

### 1. Nuevo servicio: REMITOS

| Aspecto | Estado en doc 2024-11 | Estado actual en código |
|---------|------------------------|--------------------------|
| Servicio Remitos | No existía | Incluido en docker-compose (puerto 4803) |
| Schema Prisma | — | `apps/remitos/src/prisma/schema.prisma` |
| Migraciones | — | No hay carpeta `migrations/` (usa schema único) |

**Acción requerida:**
- Levantar el servicio `remitos` si aún no está en el servidor.
- Crear el schema `remitos` en PostgreSQL: `npx prisma db push` o migración inicial para `apps/remitos`.
- El workflow `deploy-staging.yml` **no ejecuta migraciones de remitos**; hay que añadirlas.

---

### 2. Frontend

| Aspecto | Doc 2024-11 | Código actual |
|---------|-------------|----------------|
| Servidor web | goStatic | **nginx:alpine** |
| URLs API | `VITE_API_URL=http://10.3.0.243:4800` (hardcoded) | URLs vacías; proxy nginx (`/api`, `/api/docs`, `/api/remitos`) |
| Proxy reverso | No | Sí: backend, documentos, remitos |
| Rutas nuevas | Alta completa | Remitos sidebar CHOFER, ChoferDashboard, Portal Equipos, etc. |

**Commits relevantes no desplegados (ejemplos):**
- `bd2b8d9` build(frontend): cambiar de goStatic a nginx
- `cd69d45` fix(frontend): configurar nginx como proxy para APIs
- `5214dcf` feat(frontend): agregar Remitos al sidebar de CHOFER
- `0626f2e` feat(frontend): igualar ChoferDashboard al estilo de Transportista/Dador
- `39385a8` feat(frontend): add Portal Equipos menu item para SUPERADMIN y ADMIN

---

### 3. Backend

| Aspecto | Doc 2024-11 | Código actual |
|---------|-------------|---------------|
| Dockerfile | goStatic, `--legacy-peer-deps` | Multi-stage, optimizado, path ajustado |
| Funcionalidad | Base | Refactors SonarQube, handleValidationErrors, rutas de instancia, platformAuth |

**Cambios destacados:**
- Optimización de Dockerfiles (imágenes más pequeñas).
- Correcciones de dependencias (dotenv, @prisma/client).
- Reducción de duplicación en controllers/routes.
- Cambios de tipos y aserciones (S4325, S1874).

---

### 4. Documentos

| Aspecto | Doc 2024-11 | Código actual |
|---------|-------------|---------------|
| Validación IA | No documentada | `FLOWISE_VALIDATION_ENABLED=true` |
| Rasterización PDF | No | `PDF_RASTERIZE_*` configurado |
| Migraciones | Básicas | 20260123 (transferencias, estado documental), 20260128 (plantillas requisito), etc. |

**Variables de entorno nuevas en docker-compose:**
```yaml
FLOWISE_VALIDATION_ENABLED: "true"
FLOWISE_VALIDATION_BASE_URL: http://10.3.0.243:3005
FLOWISE_VALIDATION_FLOW_ID: bf6fc420-6e91-4886-a9ca-a86c285ee49a
PDF_RASTERIZE_ENABLED: "true"
PDF_RASTERIZE_DPI: "300"
# ... y otras
```

---

### 5. Migraciones Prisma

**Documentadas en doc 2024-11:**
- Backend: `apps/backend/prisma/schema.prisma`
- Documentos: ruta incorrecta en README (`apps/documentos/prisma/` vs `apps/documentos/src/prisma/`)

**Migraciones nuevas en documentos (desde 2024-11):**
- `20251204180000_add_rejection_fields`
- `20251215000000_add_equipo_activo`
- `20260114_add_internal_notifications`
- `20260123_add_estado_documental_y_transferencias`
- `20260123_add_notification_types`
- `20260128_add_plantillas_requisito`

**Remitos:**
- Sin carpeta `migrations/`; se usa `prisma db push` o migración inicial.

---

## Checklist de Despliegue Pendiente

### Pre-despliegue

- [ ] Verificar que `main` o `staging` estén actualizados con `git pull`
- [ ] Confirmar que `npm ci` pasa sin errores
- [ ] Verificar que las migraciones de backend y documentos están al día localmente

### Infraestructura

- [ ] Copiar o actualizar `deploy/stack-ip-10.3.0.243/` en el servidor
- [ ] Asegurar que el docker-compose incluye el servicio `remitos`
- [ ] Comprobar que las claves JWT están en `./keys/`
- [ ] Puerto 4803 abierto en UFW si remitos se expone externamente

### Migraciones

- [ ] `npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma`
- [ ] `npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma`
- [ ] Schema remitos: `npx prisma db push --schema=apps/remitos/src/prisma/schema.prisma` (o migración equivalente)

### Build y servicios

- [ ] Reconstruir imágenes: `docker compose build --no-cache` (o por servicio)
- [ ] Levantar servicios: `docker compose up -d`
- [ ] Comprobar: frontend (8550), backend (4800), documentos (4802), remitos (4803), flowise (3005)

### Validación post-despliegue

- [ ] Frontend con nginx y proxy: `curl -s http://10.3.0.243:8550/`
- [ ] APIs: `/api`, `/api/docs`, `/api/remitos` vía proxy
- [ ] Health: backend, documentos, remitos
- [ ] Login y navegación: Dashboard, Documentos, Remitos, Alta Completa
- [ ] Revisar logs: `docker compose logs -f frontend backend documentos remitos`

---

## Correcciones al workflow de deploy-staging

El workflow actual (`.github/workflows/deploy-staging.yml`) tiene omisiones:

1. **Migraciones de remitos:**
   ```yaml
   npx prisma migrate deploy --schema=apps/remitos/src/prisma/schema.prisma || true
   ```
   O, si remitos usa `db push`:
   ```bash
   npx prisma db push --schema=apps/remitos/src/prisma/schema.prisma --accept-data-loss
   ```

2. **Generate de Prisma para remitos:**
   ```yaml
   npx prisma generate --schema=apps/remitos/src/prisma/schema.prisma
   ```

3. **Health check de remitos:**
   Añadir verificación de `http://localhost:4803/health` en el paso de health check.

4. **Ruta del stack:**
   El script usa `cd /home/administrador/stack-ip-10.3.0.243`. Si el stack vive dentro del monorepo, debería ser:
   ```bash
   cd ${{ env.PROJECT_PATH }}/deploy/stack-ip-10.3.0.243
   ```
   Ajustar según la estructura real en el servidor.

---

## Diferencias de rutas en el servidor

| Referencia | Path |
|------------|------|
| `PROJECT_PATH` (workflow) | `/home/administrador/monorepo-bca` |
| `stack` (workflow) | `/home/administrador/stack-ip-10.3.0.243` |
| Repo en disco | `deploy/stack-ip-10.3.0.243/` dentro del monorepo |

Debe existir `stack-ip-10.3.0.243` como copia o enlace a `monorepo-bca/deploy/stack-ip-10.3.0.243` para que los build contexts (`context: ../..`) apunten correctamente al monorepo.

---

## Prioridad sugerida

| Prioridad | Tarea | Riesgo si no se hace |
|-----------|-------|----------------------|
| Alta | Sincronizar código (git pull + rebuild) | Funcionalidad desactualizada |
| Alta | Ejecutar migraciones de backend y documentos | Posibles errores de schema |
| Alta | Frontend con nginx y proxy (reemplazar goStatic) | APIs no alcanzables si las URLs cambiaron |
| Media | Desplegar servicio remitos | Remitos no disponible para CHOFER |
| Media | Migración/push de schema remitos | Remitos no arranca |
| Baja | Actualizar `DESPLIEGUE_10.3.0.243.md` | Documentación desfasada |

---

## Referencias

- `docs/DESPLIEGUE_10.3.0.243.md` – Último despliegue documentado
- `deploy/stack-ip-10.3.0.243/docker-compose.yml` – Stack actual
- `.github/workflows/deploy-staging.yml` – Workflow de staging
- `docs/CORRECCION_VARIABLES_ENTORNO.md` – Historial de cambios de variables
