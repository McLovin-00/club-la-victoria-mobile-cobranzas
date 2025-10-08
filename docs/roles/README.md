# Guías de Roles - Monorepo BCA

> **Última actualización**: 8 Octubre 2025  
> **Versión**: 2.0 - Roles atomizados profesionalmente

---

## 🎯 Visión General

Este directorio contiene **guías operativas detalladas** para cada rol en la software factory de Microsyst. Cada guía define responsabilidades, cadencias, KPIs, herramientas y paths de crecimiento de forma clara y accionable.

**Documentos relacionados**:
- **[ESTRUCTURA_ROLES_ATOMIZADA.md](../ESTRUCTURA_ROLES_ATOMIZADA.md)** - Estructura completa de 7 roles, matriz RACI, escenarios de equipo
- **[PLAN_IMPLEMENTACION_ROLES.md](../PLAN_IMPLEMENTACION_ROLES.md)** - Plan pragmático de implementación en 4 fases

---

## 📂 Roles Definidos

### 1️⃣ [Desarrollador (Developer)](./01_DESARROLLADOR.md)
**Tipo**: Implementación de features y código  
**Dedicación**: 100%  
**Niveles**: 5 niveles de progresión

#### Niveles de Junior (0-24 meses)
- **Junior Entry** (0-6 meses): Tareas guiadas, supervisión alta
- **Junior Mid** (6-18 meses): Autonomía media, aprueba PRs de Entry
- **Junior Senior** (18-24 meses): Alta autonomía, mentorea Entry

#### Desarrolladores Experimentados
- **Mid Developer** (2-5 años): Autonomía completa, ownership de módulos
- **Senior Developer** (5+ años): Referente técnico, liderazgo informal

**Responsabilidades clave**:
- Implementar features según User Stories
- Code review (según nivel)
- Testing (unitarios, E2E básico)
- Mentoría (Mid/Senior)

---

### 2️⃣ [Tech Lead (Líder Técnico)](./02_TECH_LEAD.md)
**Tipo**: Liderazgo técnico operativo  
**Dedicación**: 100%  
**Reporta a**: Founder/CEO

**Responsabilidades clave**:
- Arquitectura de soluciones
- Code review de PRs críticos
- Mentoría de desarrolladores (1:1s)
- Aprobación de deploys a producción
- Gestión de incidentes técnicos
- Hiring técnico

**Balance tiempo**: 20% código, 80% liderazgo

---

### 3️⃣ [Product Manager (PM)](./03_PRODUCT_MANAGER.md)
**Tipo**: Gestión de producto y requerimientos  
**Dedicación**: 60-100% (según escenario)  
**Reporta a**: Founder/CEO

**Responsabilidades clave**:
- Definir User Stories y Criterios de Aceptación
- Priorizar backlog (RICE, valor/esfuerzo)
- UAT (User Acceptance Testing) en staging
- Demo de features a stakeholders
- Análisis de métricas de producto
- Comunicación de roadmap

**Separación con QA**: PM define "qué construir". QA valida "qué tan bien funciona".

---

### 4️⃣ [QA Analyst (Analista de Calidad)](./04_QA_ANALYST.md)
**Tipo**: Aseguramiento de calidad y testing  
**Dedicación**: 40-100% (según escenario)  
**Reporta a**: Tech Lead (técnico) y PM (funcional)

**Responsabilidades clave**:
- Testing funcional en DEV (valida Criterios de Aceptación)
- Smoke testing en Staging y Producción
- Automatización E2E (Playwright)
- Gestión de bugs (triage, re-testing)
- Documentación de casos de prueba
- Preparación de datos de prueba

**Métricas**: Bugs en DEV 70% / Staging 25% / Prod 5%

---

### 5️⃣ [DevOps Engineer / SRE](./05_DEVOPS_SRE.md)
**Tipo**: Infraestructura, CI/CD y operaciones  
**Dedicación**: 75-100% (según escenario)  
**Reporta a**: Tech Lead (técnico)

**Responsabilidades clave**:
- CI/CD Pipeline (GitHub Actions)
- Gestión de infraestructura (Docker, Swarm, Nginx)
- Ejecución de deploys (Staging miércoles, Prod jueves)
- Monitoreo (Sentry, Uptime Kuma)
- Backups y Disaster Recovery
- Seguridad de infraestructura (SSH, firewall, SSL)

**Automatización**: Scripts disponibles ahorran 12h/mes

---

### 6️⃣ [Product Owner (PO)](./06_PRODUCT_OWNER.md)
**Tipo**: Referencia (opcional, rol enterprise)  
**Dedicación**: Variable  
**Nota**: En Microsyst, este rol lo cubre el PM o Founder según el contexto

---

## 🔄 Flujos de Colaboración

### Sprint Planning (Lunes)
```
PM propone tareas → Tech Lead valida esfuerzo → Equipo estima → Goal definido
```

### Implementación (Martes-Jueves)
```
Dev implementa → Dev abre PR → Peers review → Tech Lead aprueba → QA testea en DEV
```

### Deploy Staging (Miércoles 11:00)
```
Tech Lead valida gates → DevOps ejecuta → QA smoke test → OK para prod
```

### Deploy Producción (Jueves 11:00)
```
Tech Lead checklist → DevOps ejecuta → Tech Lead monitorea → QA smoke test
```

### Sprint Review & Retro (Viernes 16:00)
```
PM demo features → Tech Lead demo técnico → Equipo retrospectiva
```

---

## 📊 Matriz de Responsabilidades (RACI Simplificada)

| Actividad | Developer | Tech Lead | PM | QA | DevOps |
|-----------|-----------|-----------|----|----|--------|
| Implementar features | **R** | A | I | I | I |
| Code review crítico | C | **R/A** | I | I | I |
| Definir User Stories | I | C | **R/A** | C | I |
| Testing en DEV | I | C | C | **R/A** | I |
| Deploy a Producción | I | **A** | C | **R** | **R** |
| Gestión de incidentes | C | **A** | I | C | **R** |

**Leyenda**:
- **R** = Responsible (ejecuta)
- **A** = Accountable (aprueba, uno solo)
- **C** = Consulted (consultado)
- **I** = Informed (informado)

---

## 📈 Paths de Crecimiento

### Desarrollador
```
Junior Entry (0-6m) → Junior Mid (6-18m) → Junior Senior (18-24m) 
→ Mid (2-5y) → Senior (5+y) → Tech Lead (8+y)
```

### Tech Lead
```
Tech Lead → Engineering Manager / CTO (gestión de múltiples equipos)
```

### Product Manager
```
PM Junior → PM Mid → PM Senior → Head of Product / CPO
```

### QA Analyst
```
QA Junior → QA Mid → QA Senior → QA Lead / QA Automation Engineer
```

### DevOps
```
DevOps Junior → DevOps Mid → DevOps Senior → SRE / DevOps Lead
```

---

## 🛠️ Herramientas Comunes

### Desarrollo
- **GitHub**: Código, PRs, issues
- **Cursor AI**: IDE con extensiones (ESLint, Prettier, Prisma)
- **Docker**: Contenedores para desarrollo local
- **HeidiSQL**: Cliente visual de PostgreSQL

### Gestión
- **Jira / Linear**: Backlog, sprints, tracking
- **Slack**: Comunicación diaria
- **Loom**: Videos de demos o explicaciones

### Testing y Calidad
- **Jest**: Tests unitarios
- **Playwright**: E2E automatizado
- **SonarQube**: Code quality

### Infraestructura
- **GitHub Actions**: CI/CD
- **Docker Compose / Swarm**: Orquestación
- **Sentry**: Error tracking
- **Uptime Kuma**: Health checks

### Documentación
- **Notion / Confluence**: Wikis, ADRs, runbooks
- **README.md**: Documentación de código

---

## 📚 Documentos de Soporte

### Procedimientos Operativos
- **[MANUAL_OPERATIVO_MICROSYST.md](../MANUAL_OPERATIVO_MICROSYST.md)** - Manual completo del equipo
- **[CICD_PIPELINE_3_SERVICES.md](../CICD_PIPELINE_3_SERVICES.md)** - Flujo de CI/CD
- **[ENVIRONMENTS.md](../ENVIRONMENTS.md)** - Configuración de ambientes

### Checklists
- **CHECKLIST_DESARROLLO.md** - Checklist de desarrollo
- **CHECKLIST_QA_DEV.md** - Checklist de testing en DEV
- **CHECKLIST_STAGING.md** - Checklist de deploy a staging
- **CHECKLIST_DEPLOY_PROD.md** - Checklist de deploy a producción
- **CHECKLIST_INCIDENTE.md** - Checklist de manejo de incidentes

### Scripts de Automatización
- **[scripts/README_SCRIPTS.md](../../scripts/README_SCRIPTS.md)** - Documentación de scripts DevOps
  - `health-check-all.sh` - Verificación de servicios
  - `monitor-resources.sh` - Monitoreo de CPU/RAM/Disco
  - `cleanup-docker.sh` - Limpieza automática
  - `daily-report.sh` - Reporte diario

---

## 🎓 Onboarding por Rol

### Nuevo Desarrollador
**Semana 1**: Setup, contexto, primera tarea guiada  
**Semana 2-3**: Tareas pequeñas con code review  
**Semana 4**: Primera feature completa

**Documentos**: Leer `01_DESARROLLADOR.md`, `README.md`, `MANUAL_OPERATIVO_MICROSYST.md`

### Nuevo Tech Lead
**Semana 1**: Contexto (Founder, PM, Devs)  
**Semana 2**: Observación (sprint completo)  
**Semana 3**: Acción (proponer mejoras)  
**Semana 4**: Liderazgo (liderar planificación)

**Documentos**: Leer TODO el repositorio de docs/

### Nuevo PM
**Semana 1**: Contexto (Founder, Tech Lead, usuarios)  
**Semana 2**: Inmersión (participar en sprint)  
**Semana 3**: Práctica (redactar primeras US)  
**Semana 4**: Autonomía (liderar planificación)

**Documentos**: Leer `03_PRODUCT_MANAGER.md`, roadmap actual, backlog

### Nuevo QA
**Semana 1**: Contexto (arquitectura, ambientes)  
**Semana 2**: Inmersión (observar testing)  
**Semana 3**: Práctica (testear en DEV)  
**Semana 4**: Automatización (Playwright)

**Documentos**: Leer `04_QA_ANALYST.md`, casos de prueba, checklists

### Nuevo DevOps
**Semana 1**: Contexto (infraestructura actual, accesos)  
**Semana 2**: Observación (deploy, monitoreo)  
**Semana 3**: Práctica (deploy con supervisión)  
**Semana 4**: Autonomía (deploy independiente)

**Documentos**: Leer `05_DEVOPS_SRE.md`, runbooks, scripts

---

## 🤝 Cómo Usar Estas Guías

### Para Miembros del Equipo
1. **Lee tu guía de rol** completa (30-60 min)
2. **Imprime tu checklist** operativo (o ponlo en tu espacio de trabajo)
3. **Consulta regularmente** ante dudas ("¿esto es mi responsabilidad?")
4. **Propone mejoras** si algo está desactualizado

### Para Tech Lead / Founder
1. **Onboarding**: Asigna guía correspondiente a nuevo miembro
2. **1:1s**: Usar KPIs de guía para feedback
3. **Promociones**: Usar criterios de "Promoción a..." para evaluaciones
4. **Resolución de conflictos**: "Según la guía, esto es responsabilidad de X"

### Para Actualizar Guías
1. **Frecuencia**: Revisar trimestralmente o cuando hay cambio significativo
2. **Proceso**: Proponer cambio → Revisar con equipo → Actualizar → Comunicar
3. **Versión**: Incrementar versión (2.0 → 2.1) y fecha de actualización

---

## 📞 Contacto

**Dudas sobre roles o responsabilidades**:
- Tech Lead: [nombre@microsyst.com]
- PM: [nombre@microsyst.com]
- Founder/CEO: [nombre@microsyst.com]

---

**Versión**: 2.0 (Roles atomizados profesionalmente)  
**Última actualización**: 8 Octubre 2025  
**Mantenido por**: Tech Lead + Founder
