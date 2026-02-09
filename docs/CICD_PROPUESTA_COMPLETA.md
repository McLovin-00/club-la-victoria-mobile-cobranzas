# 🚀 Propuesta CI/CD para monorepo-bca

> **Versión**: 1.0  
> **Fecha**: 30 Diciembre 2025  
> **Objetivo**: Definir arquitectura de CI/CD enterprise-grade con testing/staging/prod

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Comparativa: GitHub Actions vs Jenkins](#comparativa-github-actions-vs-jenkins)
3. [Explicación de Conceptos Clave](#explicación-de-conceptos-clave)
4. [Arquitectura Propuesta](#arquitectura-propuesta)
5. [Estrategia de Branches](#estrategia-de-branches)
6. [Deploy por Ambiente](#deploy-por-ambiente)
7. [Manejo de Secretos](#manejo-de-secretos)
8. [Quality Gates](#quality-gates)
9. [Estrategia de Rollback](#estrategia-de-rollback)
10. [Equipo y Roles](#equipo-y-roles)
11. [Roadmap de Implementación](#roadmap-de-implementación)
12. [Ejemplos YAML](#ejemplos-yaml)

---

## Resumen Ejecutivo

### ¿Qué es CI/CD?

**CI (Continuous Integration)**: Cada vez que alguien sube código, automáticamente se ejecutan pruebas para verificar que no se rompió nada.

**CD (Continuous Delivery/Deployment)**: El código probado se despliega automáticamente a los servidores (dev, staging, producción).

### ¿Por qué lo necesitan?

| Sin CI/CD | Con CI/CD |
|-----------|-----------|
| "Funciona en mi máquina" | Funciona igual para todos |
| Deploy manual propenso a errores | Deploy automático consistente |
| Bugs llegan a producción | Bugs se detectan antes de llegar |
| Downtime cuando algo falla | Rollback automático |
| Nadie sabe qué versión está en prod | Trazabilidad completa |

---

## Comparativa: GitHub Actions vs Jenkins

### Tabla Comparativa

| Aspecto | GitHub Actions | Jenkins |
|---------|---------------|---------|
| **Costo** | Gratis para repos públicos, 2000 min/mes gratis para privados | Gratis (open source), pero requiere servidor |
| **Hosting** | GitHub lo hostea (cloud) | Ustedes lo hostean en su servidor |
| **Setup inicial** | 15 minutos | 2-4 horas |
| **Mantenimiento** | Cero (GitHub lo mantiene) | Alto (actualizar, parches, plugins) |
| **Integración Git** | Nativa, perfecta | Requiere configuración |
| **Curva de aprendizaje** | Baja (YAML simple) | Media-Alta (Groovy, pipelines) |
| **Plugins/Extensiones** | 15,000+ actions | 1,800+ plugins |
| **Secretos** | Integrado con Environments | Credentials plugin (más complejo) |
| **Escalabilidad** | Auto-escala | Requiere configurar agentes |
| **UI/Visualización** | Moderna, clara | Funcional pero anticuada |
| **Self-hosted runners** | Sí (opcional) | Siempre self-hosted |

### Opción 1: GitHub Actions (⭐ Recomendada)

```
┌─────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  GitHub  │───▶│  Runner  │───▶│  Deploy  │───▶│  Server  │  │
│  │   Repo   │    │  (cloud) │    │   SSH    │    │  Propio  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  Ventajas:                                                       │
│  ✅ Ya tienen workflows funcionando                              │
│  ✅ Cero infraestructura adicional                               │
│  ✅ Secretos integrados con Environments                         │
│  ✅ Aprobaciones nativas                                         │
│  ✅ Visualización de pipelines excelente                         │
│                                                                  │
│  Desventajas:                                                    │
│  ⚠️ Límite de minutos (2000/mes gratis)                          │
│  ⚠️ Dependencia de GitHub                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Cuándo elegir GitHub Actions:**
- ✅ Ya usan GitHub para el código
- ✅ Equipo pequeño/mediano (< 20 devs)
- ✅ No quieren mantener infraestructura adicional
- ✅ Prefieren simplicidad sobre flexibilidad extrema

### Opción 2: Jenkins

```
┌─────────────────────────────────────────────────────────────────┐
│                          JENKINS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  GitHub  │───▶│ Jenkins  │───▶│  Agents  │───▶│  Server  │  │
│  │   Repo   │    │  Master  │    │ (workers)│    │  Propio  │  │
│  │ (webhook)│    │(servidor)│    │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                       │                                          │
│                       ▼                                          │
│                ┌──────────────┐                                  │
│                │   Docker o   │                                  │
│                │     VM en    │                                  │
│                │   su server  │                                  │
│                └──────────────┘                                  │
│                                                                  │
│  Ventajas:                                                       │
│  ✅ Control total                                                │
│  ✅ Sin límites de uso                                           │
│  ✅ Extensible con plugins                                       │
│  ✅ Funciona sin internet (todo local)                           │
│                                                                  │
│  Desventajas:                                                    │
│  ⚠️ Requiere servidor dedicado (~4GB RAM mínimo)                │
│  ⚠️ Mantenimiento constante (actualizaciones, seguridad)        │
│  ⚠️ Configuración inicial más compleja                          │
│  ⚠️ Necesitan aprender Groovy/Pipeline syntax                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Cuándo elegir Jenkins:**
- ✅ Tienen DevOps dedicado para mantenerlo
- ✅ Requisitos de seguridad que exigen todo on-premise
- ✅ Necesitan integraciones muy específicas
- ✅ Builds que toman > 30 minutos frecuentemente

### Mi Recomendación: GitHub Actions

**Razones:**
1. Ya tienen 10 workflows funcionando
2. No requiere infraestructura adicional
3. El equipo ya conoce YAML
4. Aprobaciones y secretos por ambiente integrados
5. Ahorro de tiempo de mantenimiento

**Si en el futuro necesitan migrar a Jenkins**, los conceptos son transferibles.

---

## Explicación de Conceptos Clave

### 🐤 ¿Qué es Canary Deployment?

**Analogía del canario en la mina:**
En las minas antiguas, llevaban un canario en una jaula. Si había gas tóxico, el canario moría primero, alertando a los mineros para escapar.

**En software es lo mismo:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CANARY DEPLOYMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Paso 1: Estado inicial (100% versión vieja)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Usuarios ──────────▶ [v1.4.0] [v1.4.0] [v1.4.0]         │    │
│  │           100%                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Paso 2: Canary (10% versión nueva)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Usuarios ──┬──────▶ [v1.4.0] [v1.4.0] (90%)              │    │
│  │            └──────▶ [v1.5.0] (10% = canario)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Paso 3a: Si el canario está sano (sin errores)                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Usuarios ──────────▶ [v1.5.0] [v1.5.0] [v1.5.0]         │    │
│  │           100%      ✅ Deploy completo                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Paso 3b: Si el canario falla (errores detectados)              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Usuarios ──────────▶ [v1.4.0] [v1.4.0] [v1.4.0]         │    │
│  │           100%      🔙 Rollback automático               │    │
│  │                     (solo afectó al 10%)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Beneficios:**
- Si hay un bug, solo afecta al 10% de usuarios por 5 minutos
- Rollback automático sin intervención humana
- Zero downtime (el servicio nunca se cae)

**¿Es necesario para ustedes?**
- **Si tienen poco tráfico** (< 100 usuarios/hora): Pueden omitirlo y hacer deploy directo
- **Si tienen tráfico moderado** (100-1000 usuarios/hora): Recomendado al 10%
- **Si tienen mucho tráfico** (> 1000 usuarios/hora): Crítico

### 🔵🟢 ¿Qué es Blue-Green Deployment?

Alternativa más simple al canary:

```
┌─────────────────────────────────────────────────────────────────┐
│                   BLUE-GREEN DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Estado inicial:                                                 │
│    BLUE (activo) ◀── Usuarios                                    │
│    GREEN (standby)                                               │
│                                                                  │
│  Después del deploy:                                             │
│    BLUE (standby)                                                │
│    GREEN (activo) ◀── Usuarios                                   │
│                                                                  │
│  Si algo falla:                                                  │
│    BLUE (activo) ◀── Usuarios (switch instantáneo)               │
│    GREEN (apagado)                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Para su caso recomiendo: Blue-Green** (más simple con Docker Swarm).

### 🚦 ¿Qué son Quality Gates?

Son "checkpoints" que el código debe pasar antes de avanzar:

```
┌─────────────────────────────────────────────────────────────────┐
│                       QUALITY GATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PR creado ─────▶ [GATE 1] ─────▶ Merge permitido               │
│                       │                                          │
│                       ├── ✅ Tests pasan                         │
│                       ├── ✅ Lint sin errores                    │
│                       ├── ✅ Build exitoso                       │
│                       └── ✅ Coverage > 80%                      │
│                                                                  │
│  Main ──────────▶ [GATE 2] ─────▶ Deploy a Staging              │
│                       │                                          │
│                       ├── ✅ E2E tests pasan                     │
│                       └── ✅ PM aprueba                          │
│                                                                  │
│  Staging OK ────▶ [GATE 3] ─────▶ Deploy a Producción           │
│                       │                                          │
│                       ├── ✅ Staging validado                    │
│                       ├── ✅ Lead aprueba                        │
│                       └── ✅ DevOps aprueba                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura Propuesta

### Diagrama General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO CI/CD COMPLETO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DESARROLLO                     CI                        AMBIENTES          │
│  ──────────                 ─────────                    ──────────          │
│                                                                              │
│  ┌─────────┐               ┌─────────────────┐                               │
│  │ Feature │──── Push ────▶│  Lint + Tests   │                               │
│  │ Branch  │               │  (automático)   │                               │
│  └─────────┘               └────────┬────────┘                               │
│       │                             │                                        │
│       │                             ▼                                        │
│       │                    ┌─────────────────┐                               │
│       └──── PR ───────────▶│  Code Review +  │                               │
│                            │  Quality Gate 1 │                               │
│                            └────────┬────────┘                               │
│                                     │                                        │
│                                     ▼ (merge)                                │
│                            ┌─────────────────┐        ┌────────────┐         │
│                            │      main       │───────▶│    DEV     │         │
│                            │    (branch)     │  auto  │  (server)  │         │
│                            └────────┬────────┘        └────────────┘         │
│                                     │                                        │
│                                     ▼ (tag: v1.0.0-rc.1)                     │
│                            ┌─────────────────┐        ┌────────────┐         │
│                            │  Quality Gate 2 │───────▶│  STAGING   │         │
│                            │   + PM Approval │        │  (server)  │         │
│                            └────────┬────────┘        └────────────┘         │
│                                     │                                        │
│                                     ▼ (tag: v1.0.0 + approvals)              │
│                            ┌─────────────────┐        ┌────────────┐         │
│                            │  Quality Gate 3 │───────▶│ PRODUCCIÓN │         │
│                            │ + Team Approval │        │  (server)  │         │
│                            └─────────────────┘        └────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Eventos y Triggers

| Evento | Qué pasa | Ambiente destino |
|--------|----------|------------------|
| Push a feature branch | Solo CI (tests, lint) | Ninguno |
| PR a main | CI completo + E2E smoke | Ninguno |
| Merge a main | Auto-deploy | DEV |
| Tag `v1.0.0-rc.1` | Deploy con approval PM | STAGING |
| Tag `v1.0.0` + manual trigger | Deploy con 2 approvals | PRODUCCIÓN |

---

## Estrategia de Branches

### Modelo Simplificado

```
main ─────────●────────●────────●────────●───────▶ (siempre estable)
              │        │        │        │
              │        │        │        └── hotfix/critical-bug
              │        │        │
              │        │        └── feature/nueva-funcionalidad-3
              │        │
              │        └── feature/nueva-funcionalidad-2
              │
              └── feature/nueva-funcionalidad-1


Tags:
  v1.4.0 ──────────────────────────── Producción actual
  v1.5.0-rc.1 ─────────────────────── En staging (candidato)
  v1.5.0 ──────────────────────────── Próxima versión prod
```

### Reglas

| Branch | Protección | Quién puede hacer merge |
|--------|------------|------------------------|
| `main` | PR obligatorio + 1 review + CI verde | Desarrolladores |
| `feature/*` | Ninguna | Autor del feature |
| `hotfix/*` | PR obligatorio | Lead o DevOps |

### Convención de Nombres

```bash
# Features (nuevas funcionalidades)
feature/agregar-login-google
feature/dashboard-reportes

# Bugfixes
fix/error-carga-documentos
fix/validacion-email

# Hotfixes (emergencias en producción)
hotfix/security-vulnerability
hotfix/caida-servicio-pagos
```

---

## Deploy por Ambiente

### Matriz de Ambientes

| Ambiente | Servidor | URL | Trigger | Approvals |
|----------|----------|-----|---------|-----------|
| **DEV** | 10.3.0.243 | `dev.microsyst.local` | Auto (merge a main) | 0 |
| **STAGING** | 10.3.0.244 | `staging.bca.microsyst.com.ar` | Tag rc + manual | 1 (PM) |
| **PROD** | 10.3.0.245 | `bca.microsyst.com.ar` | Tag release + manual | 2 (Lead + DevOps) |

### Deploy Parcial (Solo lo que cambió)

El monorepo tiene 4 aplicaciones:
- `apps/backend`
- `apps/frontend`
- `apps/documentos`
- `apps/remitos`

**Problema**: Si solo cambio el frontend, ¿para qué re-deployar todo?

**Solución con Turborepo:**

```bash
# Detecta qué cambió desde el último deploy
npx turbo run build --filter='...[origin/main]'

# Resultado: Solo buildea/deploya lo afectado
# Si cambié frontend → solo frontend
# Si cambié types → frontend + backend + documentos (dependientes)
```

```
┌─────────────────────────────────────────────────────────────────┐
│                  MATRIZ DE DEPENDENCIAS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  packages/types ──────┬───▶ apps/frontend                        │
│                       ├───▶ apps/backend                         │
│                       └───▶ apps/documentos                      │
│                                                                  │
│  packages/utils ──────┬───▶ apps/frontend                        │
│                       ├───▶ apps/backend                         │
│                       └───▶ apps/documentos                      │
│                                                                  │
│  apps/backend ────────────▶ apps/documentos (consume API)        │
│                                                                  │
│  Si cambio:                    Se re-deploya:                    │
│  ─────────────────────────────────────────────────               │
│  Solo frontend                 Solo frontend                     │
│  Solo backend                  backend + documentos              │
│  packages/types                frontend + backend + documentos   │
│  packages/utils                frontend + backend + documentos   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Manejo de Secretos

### Estructura por Ambiente

```
┌─────────────────────────────────────────────────────────────────┐
│              GITHUB ENVIRONMENTS (Secretos)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Repository Secrets (compartidos):                               │
│  ├── SONAR_TOKEN                                                │
│  ├── SONAR_HOST_URL                                             │
│  └── SLACK_WEBHOOK_URL (notificaciones)                         │
│                                                                  │
│  Environment: development                                        │
│  ├── DEV_HOST = "10.3.0.243"                                    │
│  ├── DEV_USER = "administrador"                                 │
│  ├── DEV_SSH_KEY = "-----BEGIN RSA..."                          │
│  └── DEV_DATABASE_URL = "postgresql://..."                      │
│                                                                  │
│  Environment: staging                                            │
│  ├── STAGING_HOST = "10.3.0.244"                                │
│  ├── STAGING_USER = "administrador"                             │
│  ├── STAGING_SSH_KEY = "-----BEGIN RSA..."                      │
│  ├── STAGING_DATABASE_URL = "postgresql://..."                  │
│  └── Protection: Require 1 reviewer                             │
│                                                                  │
│  Environment: production                                         │
│  ├── PROD_HOST = "10.3.0.245"                                   │
│  ├── PROD_USER = "administrador"                                │
│  ├── PROD_SSH_KEY = "-----BEGIN RSA..."                         │
│  ├── PROD_DATABASE_URL = "postgresql://..."                     │
│  ├── MINIO_SECRET_KEY = "..."                                   │
│  ├── SENTRY_DSN = "..."                                         │
│  └── Protection: Require 2 reviewers + 5min wait                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cómo Configurarlo en GitHub

1. Ir a **Settings > Environments**
2. Crear environments: `development`, `staging`, `production`
3. En cada uno, agregar secretos específicos
4. En `staging` y `production`, agregar **Required reviewers**

---

## Quality Gates

### Gate 1: Pull Request

**Cuándo**: Al crear/actualizar un PR a `main`

**Checks obligatorios:**
- ✅ `npm run lint` pasa sin errores
- ✅ `npm run build` exitoso
- ✅ `npm run test` con coverage > 80%
- ✅ Al menos 1 code review aprobado

**Si falla:** El PR no se puede mergear.

### Gate 2: Deploy a Staging

**Cuándo**: Se crea un tag `v*.*.*-rc.*` (release candidate)

**Checks obligatorios:**
- ✅ E2E tests completos pasan (>95%)
- ✅ Health checks de staging OK
- ✅ PM/QA aprueba en GitHub

**Si falla:** No se puede promover a producción.

### Gate 3: Deploy a Producción

**Cuándo**: Se dispara manualmente con tag `v*.*.*`

**Checks obligatorios:**
- ✅ Staging estuvo estable 24h
- ✅ Backup de BD creado
- ✅ Lead aprueba
- ✅ DevOps aprueba

**Si falla:** Se ejecuta rollback automático.

---

## Estrategia de Rollback

### Rollback Automático (Recomendado)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLLBACK AUTOMÁTICO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Deploy nueva versión                                         │
│     docker service update --image backend:v1.5.0 ...            │
│                                                                  │
│  2. Esperar 5 minutos                                            │
│                                                                  │
│  3. Verificar:                                                   │
│     ├── Health check: curl /health → 200?                        │
│     ├── Error rate < 5%? (verificar logs/Sentry)                │
│     └── Tiempo de respuesta < 1s?                                │
│                                                                  │
│  4a. Si TODO OK:                                                 │
│      ✅ Deploy completado                                        │
│      Notificar al equipo                                         │
│                                                                  │
│  4b. Si ALGO FALLA:                                              │
│      🔙 Rollback automático                                      │
│      docker service update --image backend:v1.4.0 ...           │
│      Crear issue de incidente                                    │
│      Alertar al equipo                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rollback Manual (Emergencias)

```bash
# 1. Conectar al servidor de producción
ssh administrador@10.3.0.245

# 2. Ver versión actual
docker service ls

# 3. Rollback a versión anterior
cd /home/administrador/monorepo-bca
git checkout v1.4.0  # versión anterior estable

# 4. Re-deployar
docker service update --image backend:v1.4.0 monorepo-prod_backend
docker service update --image frontend:v1.4.0 monorepo-prod_frontend
docker service update --image documentos:v1.4.0 monorepo-prod_documentos

# 5. Verificar
curl -f https://api.bca.microsyst.com.ar/health
```

### Cuándo Hacer Rollback

| Situación | Acción | Tiempo máximo |
|-----------|--------|---------------|
| Error rate > 5% | Auto-rollback | 5 minutos |
| Health check falla 3 veces | Auto-rollback | 3 minutos |
| Bug crítico reportado | Manual rollback | 15 minutos |
| Performance degradada 50% | Evaluar, probablemente rollback | 30 minutos |

---

## Equipo y Roles

### Roles en el Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLES Y RESPONSABILIDADES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👨‍💻 DESARROLLADOR                                                │
│  ├── Crea features en branches                                  │
│  ├── Abre PRs con descripción clara                             │
│  ├── Hace code review de PRs de otros                           │
│  └── Corrige issues de CI (tests, lint)                         │
│                                                                  │
│  🧪 QA / PM                                                      │
│  ├── Valida features en staging                                 │
│  ├── Aprueba deploy a staging (Gate 2)                          │
│  ├── Ejecuta smoke tests manuales                               │
│  └── Reporta bugs encontrados                                   │
│                                                                  │
│  👨‍💼 LEAD TÉCNICO                                                  │
│  ├── Aprueba PRs críticos                                       │
│  ├── Aprueba deploy a producción (Gate 3)                       │
│  ├── Decide rollbacks                                           │
│  └── Define arquitectura de pipelines                           │
│                                                                  │
│  🔧 DEVOPS (puede ser el Lead también)                           │
│  ├── Mantiene pipelines de CI/CD                                │
│  ├── Configura secretos y ambientes                             │
│  ├── Aprueba deploy a producción (Gate 3)                       │
│  ├── Ejecuta rollbacks cuando es necesario                      │
│  └── Monitorea salud de los sistemas                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Configuración de Approvers en GitHub

```yaml
# GitHub Environment: staging
Required reviewers:
  - Team: @microsyst/qa-team
  # O usuarios específicos:
  # - @usuario-pm
  
# GitHub Environment: production
Required reviewers:
  - Team: @microsyst/leads-team
  # O usuarios específicos:
  # - @usuario-lead
  # - @usuario-devops
Wait timer: 5 minutes  # Tiempo para cancelar si es error
```

### Notificaciones

| Evento | Quién recibe | Canal |
|--------|--------------|-------|
| CI falla en PR | Autor del PR | GitHub + Email |
| Deploy a DEV | Todos | Slack (info) |
| Deploy a Staging | QA + PM | Slack + mención |
| Deploy a Producción | Todo el equipo | Slack + @channel |
| Rollback ejecutado | Leads + DevOps | Slack urgente + Email |

---

## Roadmap de Implementación

### Fase 1: Fundamentos (Semana 1-2)

| Tarea | Responsable | Esfuerzo | Prioridad |
|-------|-------------|----------|-----------|
| Configurar GitHub Environments | DevOps | 2h | Alta |
| Migrar secretos a Environments | DevOps | 4h | Alta |
| Branch protection en `main` | Lead | 1h | Alta |
| Cache de Turborepo en CI | DevOps | 2h | Media |
| E2E smoke tests (5 críticos) | QA/Dev | 8h | Alta |

### Fase 2: Pipeline de Deploy (Semana 3-4)

| Tarea | Responsable | Esfuerzo | Prioridad |
|-------|-------------|----------|-----------|
| `deploy-staging-v2.yml` | DevOps | 6h | Alta |
| Integrar E2E en staging | QA + DevOps | 4h | Alta |
| `deploy-prod-v2.yml` | DevOps | 8h | Alta |
| Rollback automático | DevOps | 6h | Alta |
| Notificaciones Slack | DevOps | 2h | Media |

### Fase 3: Mejora Continua (Semana 5-6)

| Tarea | Responsable | Esfuerzo | Prioridad |
|-------|-------------|----------|-----------|
| Dashboard de métricas | DevOps | 4h | Media |
| Runbooks de emergencia | DevOps + Lead | 4h | Alta |
| Training del equipo | Lead | 4h | Alta |
| Optimizar tiempos CI | DevOps | 4h | Baja |

### Diagrama de Gantt

```
Semana     1           2           3           4           5           6
           |-----------|-----------|-----------|-----------|-----------|
           
Fase 1     ████████████████████████
           [Environments] [Secrets] [Protection] [Cache] [E2E smoke]
           
Fase 2                             ████████████████████████
                                   [Staging] [E2E] [Prod] [Rollback]
                                   
Fase 3                                                     ████████████
                                                           [Metrics][Runbooks]
```

---

## Ejemplos YAML

### 1. CI Optimizado con Detección de Cambios

```yaml
# .github/workflows/ci-affected.yml
name: CI (Affected Packages)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
      documentos: ${{ steps.filter.outputs.documentos }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            backend:
              - 'apps/backend/**'
              - 'packages/**'
            frontend:
              - 'apps/frontend/**'
              - 'packages/**'
            documentos:
              - 'apps/documentos/**'
              - 'packages/**'

  backend:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --workspace=apps/backend
      - run: npm run build --workspace=apps/backend
      - run: npm run test --workspace=apps/backend

  frontend:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --workspace=apps/frontend
      - run: npm run build --workspace=apps/frontend

  documentos:
    needs: detect-changes
    if: needs.detect-changes.outputs.documentos == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --workspace=apps/documentos
      - run: npm run build --workspace=apps/documentos
      - run: npm run test --workspace=apps/documentos
```

### 2. Deploy a Staging con Approval

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    tags:
      - 'v*.*.*-rc.*'  # Solo release candidates

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging  # Requiere approval de PM
      url: https://staging.bca.microsyst.com.ar
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /home/administrador/monorepo-bca
            git fetch --all
            git checkout ${{ github.ref_name }}
            npm ci
            npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
            docker stack deploy -c docker-compose.staging.yml monorepo-staging
            sleep 30
            curl -f https://staging.bca.microsyst.com.ar/api/health

  e2e-tests:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run E2E tests
        run: npx playwright test --project=chromium
        env:
          BASE_URL: https://staging.bca.microsyst.com.ar

  notify:
    needs: [deploy, e2e-tests]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        run: |
          if [ "${{ needs.e2e-tests.result }}" == "success" ]; then
            echo "✅ Staging deploy successful"
          else
            echo "❌ Staging deploy failed"
          fi
```

### 3. Deploy a Producción con Rollback

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: 'Tag de release (vX.Y.Z)'
        required: true
        type: string

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.release_tag }}
          
      - name: Validate tag format
        run: |
          if [[ ! "${{ inputs.release_tag }}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "❌ Tag must be vX.Y.Z format (no -rc)"
            exit 1
          fi

  backup:
    needs: validate
    runs-on: ubuntu-latest
    environment: production  # Requiere 2 approvals
    steps:
      - name: Create backup
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            /home/administrador/scripts/backup.sh
            echo "Backup created"

  deploy:
    needs: backup
    runs-on: ubuntu-latest
    outputs:
      previous_tag: ${{ steps.get-prev.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Get previous tag
        id: get-prev
        run: |
          PREV=$(git describe --tags --abbrev=0 ${{ inputs.release_tag }}^ 2>/dev/null || echo "none")
          echo "tag=$PREV" >> $GITHUB_OUTPUT
          
      - name: Deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /home/administrador/monorepo-bca
            git fetch --all
            git checkout ${{ inputs.release_tag }}
            npm ci
            npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
            docker stack deploy -c docker-compose.prod.yml monorepo-prod
            
  health-check:
    needs: deploy
    runs-on: ubuntu-latest
    outputs:
      healthy: ${{ steps.check.outputs.healthy }}
    steps:
      - name: Wait and check health
        id: check
        run: |
          sleep 60
          BACKEND=$(curl -sf https://api.bca.microsyst.com.ar/health || echo "FAIL")
          DOCS=$(curl -sf https://doc.bca.microsyst.com.ar/health || echo "FAIL")
          
          if [[ "$BACKEND" == "FAIL" ]] || [[ "$DOCS" == "FAIL" ]]; then
            echo "healthy=false" >> $GITHUB_OUTPUT
            exit 1
          fi
          echo "healthy=true" >> $GITHUB_OUTPUT

  rollback:
    needs: [deploy, health-check]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Rollback
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            echo "Rolling back to ${{ needs.deploy.outputs.previous_tag }}"
            cd /home/administrador/monorepo-bca
            git checkout ${{ needs.deploy.outputs.previous_tag }}
            docker stack deploy -c docker-compose.prod.yml monorepo-prod
            
      - name: Create incident issue
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Production Rollback - ${{ inputs.release_tag }}',
              body: 'Rollback automático ejecutado. Investigar causa.',
              labels: ['incident', 'production']
            })

  notify-success:
    needs: health-check
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: echo "✅ Production deploy completed successfully"
```

---

## Checklist de Implementación

### Semana 1
- [ ] Crear GitHub Environments (development, staging, production)
- [ ] Migrar secretos actuales a los environments
- [ ] Configurar branch protection en `main`
- [ ] Agregar required reviewers a staging y production

### Semana 2
- [ ] Implementar `ci-affected.yml`
- [ ] Agregar cache de npm/turbo
- [ ] Crear 5 E2E smoke tests críticos

### Semana 3
- [ ] Implementar `deploy-staging.yml` mejorado
- [ ] Integrar E2E tests en staging

### Semana 4
- [ ] Implementar `deploy-prod.yml` con rollback
- [ ] Configurar notificaciones Slack

### Semana 5-6
- [ ] Documentar runbooks
- [ ] Capacitar al equipo
- [ ] Optimizar tiempos de CI

---

## Preguntas Frecuentes

### ¿Por qué no Docker Hub/GHCR para imágenes?

Para su caso (servidor propio, imágenes no públicas), buildear directamente en el servidor es más simple. Si en el futuro escalan a múltiples servidores, agregaríamos un registry.

### ¿Qué pasa si falla internet durante un deploy?

El deploy abortará y los contenedores anteriores seguirán funcionando. No hay riesgo de estado intermedio.

### ¿Puedo saltear staging en una emergencia?

Sí, con un tag `hotfix-v1.4.1` y confirmación de 2 leads se puede hacer deploy directo a producción. Pero luego deben validar en staging.

### ¿Cuánto tarda un deploy completo?

- DEV: 3-5 minutos
- STAGING: 5-8 minutos
- PROD: 8-12 minutos (incluyendo backup y health checks)

---

> **Última actualización**: 30 Diciembre 2025  
> **Autor**: DevOps Team  
> **Versión**: 1.0
