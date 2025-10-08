# Checklist Staging

> **Responsable**: PM/Analista + DevOps/Back  
> **Objetivo**: Validar release candidato en ambiente que replica producción  
> **Cadencia**: Miércoles 11:00 AM (semanal)

**Regla de Oro**: Nada llega a Producción sin pasar por Staging con todos los checks verdes

---

## 🚀 Pre-Deploy a Staging

### 1. Preparación (DevOps/Back)

- [ ] `main` está estable (todos los tests pasando)
- [ ] Backup de BD de Staging ejecutado
- [ ] Release notes preparadas (features + fixes del sprint)
- [ ] Tag de versión creado (ej: `v1.5.0`)
- [ ] Aprobación de Lead para deploy

**Comando de tag**:
```bash
git tag -a v1.5.0 -m "Release 1.5.0 - [Features principales]"
git push origin v1.5.0
```

### 2. Deploy (DevOps/Back)

- [ ] Workflow `deploy-staging.yml` ejecutado manualmente
- [ ] Deploy completado sin errores
- [ ] Servicios levantados (verificar con `docker service ls`)
- [ ] Health checks responden OK:
  - [ ] Frontend: [staging-url]/
  - [ ] Backend: [staging-url]/api/health
  - [ ] Documentos: [staging-url]/docs/health

---

## 🧪 Post-Deploy - Validaciones Automáticas

### 3. Tests E2E (Playwright)

- [ ] Suite E2E ejecutada automáticamente en CI
- [ ] Todas las pruebas críticas pasaron:
  - [ ] Login flow
  - [ ] Flujo de negocio principal (3-5 casos críticos)
  - [ ] Creación de datos
  - [ ] Navegación principal

**Si falla**:
- Revisar logs de Playwright
- Reproducir manualmente
- Si es bug real → rollback y crear hotfix

### 4. Monitoreo Sentry (30 minutos)

- [ ] Sentry configurado para Staging
- [ ] Sin errores nuevos en últimos 30 minutos
- [ ] Sin picos de errores existentes
- [ ] Performance dentro de rangos aceptables

**Verificar en Sentry**:
- Issues → Filtrar por "Last 30 minutes"
- No debe haber errores críticos/bloqueantes

---

## 🔍 Validaciones Manuales (PM/Analista)

### 5. Smoke Test Manual

**Flujo crítico completo** (15-20 minutos):

- [ ] **Login**
  - [ ] Usuario válido puede entrar
  - [ ] Usuario inválido recibe error claro
  - [ ] Redirección correcta post-login

- [ ] **Dashboard Principal**
  - [ ] Datos cargan correctamente
  - [ ] Gráficos/estadísticas se renderizan
  - [ ] Sin errores en consola

- [ ] **Flujo de Negocio 1**: [Especificar]
  - [ ] Paso 1
  - [ ] Paso 2
  - [ ] Paso 3

- [ ] **Flujo de Negocio 2**: [Especificar]
  - [ ] Paso 1
  - [ ] Paso 2
  - [ ] Paso 3

- [ ] **Gestión de Documentos** (si aplica)
  - [ ] Upload funciona
  - [ ] Descarga funciona
  - [ ] Notificaciones real-time funcionan

### 6. Features Nuevas del Sprint

Para cada feature nueva:

- [ ] Feature #1: [Nombre]
  - [ ] Criterios de Aceptación verificados
  - [ ] Flujo completo probado
  - [ ] Sin errores de consola
  - [ ] Veredicto: ✅ / ❌

- [ ] Feature #2: [Nombre]
  - [ ] Criterios de Aceptación verificados
  - [ ] Flujo completo probado
  - [ ] Sin errores de consola
  - [ ] Veredicto: ✅ / ❌

### 7. Regresión de Funcionalidad Crítica

Verificar que nada se rompió:

- [ ] Autenticación
- [ ] Gestión de usuarios
- [ ] Módulo principal de negocio
- [ ] Reportes/exports
- [ ] Integraciones externas (si aplica)

### 8. Validaciones de Datos

- [ ] Datos de Staging son **anonimizados** (nunca datos reales)
- [ ] Migraciones de BD ejecutadas correctamente
- [ ] Seeds/fixtures cargados si es necesario
- [ ] Integridad referencial OK (no hay errores de FK)

### 9. Cross-Browser (Spot Check)

- [ ] Chrome (principal)
- [ ] Firefox (secundario)
- [ ] Safari/Edge (si es crítico)
- [ ] Mobile responsive (Chrome DevTools)

---

## 📊 Análisis de Performance

### 10. Performance Básico

- [ ] Lighthouse score > 80 (Performance)
- [ ] Tiempo de carga inicial < 3 segundos
- [ ] Requests principales < 1 segundo
- [ ] Sin requests infinitos o polling excesivo

### 11. Logs y Observabilidad

- [ ] Logs en Docker no muestran errores críticos
  ```bash
  docker service logs monorepo-staging_backend --tail 100
  docker service logs monorepo-staging_frontend --tail 100
  docker service logs monorepo-staging_documentos --tail 100
  ```
- [ ] Uptime Kuma reporta servicios UP
- [ ] Redis/PostgreSQL respondiendo normalmente

---

## 🐛 Gestión de Hallazgos

### Si encuentro bugs:

**Críticos** (bloquean producción):
- [ ] Crear issue de prioridad ALTA
- [ ] Notificar inmediatamente al equipo
- [ ] **NO promover a producción**
- [ ] Planificar hotfix urgente

**No críticos** (menores):
- [ ] Crear issue de prioridad MEDIA/BAJA
- [ ] Documentar para próximo sprint
- [ ] Evaluar si bloquea producción (criterio: impacto en usuarios)

---

## ✅ Veredicto Final

### ✅ APROBADO para Producción

Se cumplen **todas** estas condiciones:

- [ ] E2E completo pasó
- [ ] Sentry sin errores nuevos (30 min)
- [ ] Smoke test manual OK
- [ ] Features nuevas validadas
- [ ] Sin regresión en funcionalidad crítica
- [ ] Performance aceptable
- [ ] Sin bugs críticos

**Acción**:
- [ ] Actualizar tablero → mover tasks a **"Listo p/Prod"**
- [ ] Notificar a Lead y DevOps
- [ ] Preparar para deploy de Producción (jueves 11:00)

---

### ❌ RECHAZADO - Requiere correcciones

Si **alguna** de estas ocurre:

- [ ] E2E falló
- [ ] Errores críticos en Sentry
- [ ] Bugs bloqueantes encontrados
- [ ] Regresión detectada

**Acción**:
- [ ] Documentar todos los hallazgos
- [ ] Crear issues para cada bug
- [ ] Notificar al equipo
- [ ] Mover tasks a **"En curso"** en tablero
- [ ] Planificar correcciones urgentes
- [ ] Re-deploy a Staging cuando se corrija

---

## 📝 Reporte de Staging (Template)

```markdown
## Reporte Staging - v1.5.0

**Fecha**: 2025-10-09 11:00  
**Responsable QA**: [Nombre]  
**Responsable Deploy**: [Nombre DevOps]

### Deploy
- ✅ Completado sin errores
- ✅ Health checks OK
- ✅ Servicios levantados

### Tests Automáticos
- E2E Playwright: ✅ 12/12 pasaron
- Sentry (30 min): ✅ Sin errores nuevos

### Validaciones Manuales
- Smoke Test: ✅ OK
- Features Nuevas: 
  - Feature A: ✅ OK
  - Feature B: ✅ OK
- Regresión: ✅ Sin incidencias

### Performance
- Lighthouse: 88/100
- Carga inicial: 2.1s
- Veredicto: ✅ Aceptable

### Bugs Encontrados
- 🟡 Menor: [Issue #123] - Alineación en botón X
- Ninguno bloqueante

### Veredicto Final
✅ **APROBADO para Producción**

Autorización para deploy a Producción el jueves 10/10 a las 11:00.

### Notas
[Comentarios adicionales]
```

---

**Tiempo estimado**: 45-60 minutos  
**Frecuencia**: Semanal (miércoles 11:00)  
**Última actualización**: 8 Octubre 2025  
**Alineado con**: Manual Operativo Microsyst

