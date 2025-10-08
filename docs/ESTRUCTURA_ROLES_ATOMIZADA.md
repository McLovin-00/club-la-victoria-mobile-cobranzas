# Estructura de Roles Atomizada - Microsyst Software Factory

> **Versión**: 2.0 - Roles profesionales claramente separados  
> **Fecha**: 8 Octubre 2025  
> **Contexto**: Software factory dentro de Microsyst (empresa más grande)

---

## 🎯 Visión General

Esta estructura define **7 roles claramente atomizados** para la software factory de Microsyst, eliminando superposiciones y clarificando responsabilidades. Está diseñada para crecer de forma modular según la madurez y recursos del equipo.

---

## 📊 Estructura de Equipo (Escenarios)

### Escenario 1: Equipo Mínimo Viable (MVP) - **5 personas**
```
├── Founder/CEO (25% dedicación a software factory)
│   └── Decisiones estratégicas y aprobaciones finales
├── Tech Lead (100% dedicación)
│   └── Liderazgo técnico completo
├── Product Manager (50% dedicación)
│   └── Producto y requerimientos
├── QA Analyst (50% dedicación)
│   └── Calidad y testing
├── DevOps Engineer (75% dedicación)
│   └── Infraestructura y CI/CD
└── 2x Desarrolladores Jr (100% dedicación)
    └── Implementación de features
```

**Total**: 5 personas físicas, ~4.75 FTE (Full Time Equivalent)

### Escenario 2: Equipo Operativo Óptimo - **6-7 personas**
```
├── Founder/CEO (10% dedicación - solo aprobaciones críticas)
├── Tech Lead (100%)
├── Product Manager (100%)
├── QA Analyst (100%)
├── DevOps Engineer (100%)
└── 3-4x Desarrolladores (2 Jr + 1-2 Mid) (100% c/u)
```

**Total**: 7-8 personas físicas, ~7.4-8.4 FTE

### Escenario 3: Equipo Escalado - **10+ personas**
```
├── CTO/Director Técnico (nuevo rol, absorbe parte de Founder)
├── Tech Lead
├── Product Manager
├── QA Lead + 1 QA Jr
├── DevOps/SRE Lead
└── 5-7x Desarrolladores (gradación Jr/Mid/Senior)
```

---

## 🧩 Roles Definidos (Atomizados)

---

## 1️⃣ **FOUNDER / CEO**

### Perfil
- **Tipo**: Estratégico, no operativo
- **Dedicación a software factory**: 10-25% (según escenario)
- **Nivel**: C-Level
- **Reporta a**: Board / Accionistas

### Responsabilidades ÚNICAS (No Delegables)

#### R1: Decisiones Estratégicas de Negocio
- Aprobar inversiones > $5,000 USD
- Definir roadmap de producto a 6-12 meses (con PM)
- Aprobar contrataciones de software factory
- Decidir stack tecnológico de alto impacto (ej: migrar de monolito a microservicios)

#### R2: Aprobación Final de Releases Críticos
- **Solo releases que afecten revenue o reputación**
- Ejemplo: cambio en módulo de facturación, integración con cliente enterprise
- **NO** releases normales de features (delega en Tech Lead)

#### R3: Gestión de Stakeholders Externos
- Comunicación con clientes C-Level
- Presentaciones a Board
- Negociación de contratos grandes

#### R4: Resolución de Conflictos de Alto Nivel
- Conflicto entre PM y Tech Lead (priorización vs viabilidad técnica)
- Decisiones de go/no-go en proyectos
- Aprobación de excepciones a procesos (casos extremos)

### Funciones que NO debe hacer (Delegar)
- ❌ Code review de PRs
- ❌ Priorización detallada de sprint (eso es del PM + Tech Lead)
- ❌ Aprobación de deploys a staging/producción normales
- ❌ Mentoría técnica de desarrolladores
- ❌ Ejecución de procedimientos operativos

### Cadencia
- **Mensual**: Revisión de roadmap y presupuesto con PM y Tech Lead
- **Trimestral**: OKRs y estrategia
- **Según necesidad**: Aprobaciones críticas (asíncrono, < 24h respuesta)

### KPIs
- Tiempo de respuesta a aprobaciones críticas < 24h
- Alineación estratégica producto-negocio (medido en QBR)
- ROI de inversiones en software factory

---

## 2️⃣ **TECH LEAD (Líder Técnico)**

### Perfil
- **Tipo**: Liderazgo técnico operativo
- **Dedicación**: 100%
- **Nivel**: Senior+ (5-8 años experiencia)
- **Reporta a**: Founder/CEO (o CTO si existe)

### Responsabilidades ÚNICAS

#### R1: Liderazgo Técnico del Equipo
- Definir arquitectura de soluciones
- Code review de PRs críticos (seguridad, arquitectura, performance)
- Decisiones técnicas day-to-day
- Mentoría de desarrolladores (1:1s semanales)

#### R2: Quality Gates y Estándares
- Definir estándares de código (linting, testing, convenciones)
- Aprobar ADRs (Architecture Decision Records)
- Asegurar cobertura de tests ≥ 80%
- Revisar y aprobar refactors mayores

#### R3: Planificación Técnica
- Estimación de esfuerzo técnico (con devs)
- Identificar dependencias técnicas
- Gestión de deuda técnica (priorizar con PM)
- Planificar capacidad del equipo

#### R4: Aprobación de Deploys a Producción
- **Todos los deploys a producción** requieren su aprobación
- Validar que pasaron todos los quality gates
- Revisar plan de rollback
- Monitorear post-deploy (primera hora)

#### R5: Gestión de Incidentes Técnicos
- Coordinación de respuesta a incidentes SEV1/SEV2
- Decisión de rollback vs hotfix
- Post-mortem y acciones correctivas

#### R6: Hiring Técnico
- Entrevistas técnicas de candidatos
- Definir requisitos de nuevos roles técnicos
- Onboarding técnico de nuevos devs

### Funciones que NO debe hacer (Delegar)
- ❌ Implementar features él solo (max 20% de su tiempo en código)
- ❌ Definir prioridades de negocio (eso es del PM)
- ❌ Ejecutar deploys (eso es de DevOps)
- ❌ Testing manual exhaustivo (eso es de QA)

### Cadencia
- **Diario**: Code review, desbloquear equipo
- **Lunes**: Planificación técnica del sprint con PM
- **Miércoles**: Aprobación de deploy a staging (valida quality gates)
- **Jueves**: Aprobación de deploy a producción
- **Viernes**: Sprint review técnico, retrospectiva

### KPIs
- Tiempo promedio de code review < 24h
- Incidentes en producción < 2 por mes
- Cobertura de tests mantenida ≥ 80%
- Velocity del equipo estable (±15%)
- Satisfacción del equipo (encuesta trimestral) > 4/5

### Herramientas
- GitHub (PRs, reviews, issues)
- Sentry (monitoreo de errores)
- SonarQube (calidad de código)
- Slack (comunicación)
- Figma (revisar diseños antes de implementar)

---

## 3️⃣ **PRODUCT MANAGER (PM)**

### Perfil
- **Tipo**: Gestión de producto y negocio
- **Dedicación**: 50-100% (según escenario)
- **Nivel**: Mid-Senior (3-5 años experiencia en producto)
- **Reporta a**: Founder/CEO

### Responsabilidades ÚNICAS

#### R1: Definición de Producto
- Redactar User Stories con Criterios de Aceptación (CA)
- Definir roadmap de producto (con aprobación de Founder)
- Priorizar backlog (método RICE o valor/esfuerzo)
- Definir métricas de éxito de features

#### R2: Gestión de Requerimientos
- Recolectar feedback de usuarios y stakeholders
- Traducir necesidades de negocio a requerimientos técnicos
- Validar que features resuelven problemas reales
- Mantener documentación de producto actualizada

#### R3: Priorización y Planificación
- **Planificación de sprint (lunes)**: Propone 5-15 tareas, prioriza con Tech Lead
- Decidir qué entra y qué no en cada sprint
- Negociar trade-offs (alcance vs tiempo vs calidad)
- Gestionar expectativas de stakeholders

#### R4: Aceptación de Entregables
- **User Acceptance Testing (UAT)** en staging
- Validar que features cumplen CA
- Aprobar features para deploy a producción (con Tech Lead)
- Demo de features a stakeholders

#### R5: Comunicación de Producto
- Release notes para usuarios
- Updates semanales a stakeholders
- Comunicación de cambios a equipo de soporte
- Presentaciones de roadmap (mensual/trimestral)

#### R6: Análisis y Métricas
- Definir e implementar tracking de métricas (con devs)
- Analizar adoption, engagement, retention de features
- Identificar features de bajo valor (candidatas a deprecar)
- Reportes de producto (semanal/mensual)

### Funciones que NO debe hacer (Delegar)
- ❌ Testing funcional exhaustivo (eso es de QA)
- ❌ Code review o decisiones técnicas (eso es de Tech Lead)
- ❌ Ejecutar deploys (eso es de DevOps)
- ❌ Implementar features (eso es de Desarrolladores)

### Cadencia
- **Lunes (30 min)**: Planificación de sprint con Tech Lead
- **Diario (10 min)**: Daily standup
- **Miércoles (1h)**: UAT en staging de features completadas
- **Jueves (1h)**: Validación post-deploy en producción
- **Viernes (30 min)**: Sprint review y demo
- **Mensual (2h)**: Roadmap review con Founder

### KPIs
- User Stories claridad (medido por devs en retrospectiva)
- Features deployed on time (≥ 80%)
- Adoption de features nuevas (≥ 50% en primer mes)
- NPS de producto (≥ 8.0)
- Tiempo de ciclo de feature (idea → producción) < 4 semanas

### Herramientas
- Jira/Linear/Trello (backlog y sprints)
- Figma (diseño y wireframes)
- Google Analytics / Mixpanel (métricas)
- Notion/Confluence (documentación de producto)
- Typeform (encuestas a usuarios)

---

## 4️⃣ **QA ANALYST (Analista de Calidad)**

### Perfil
- **Tipo**: Aseguramiento de calidad y testing
- **Dedicación**: 50-100% (según escenario)
- **Nivel**: Junior-Mid (1-3 años experiencia en QA)
- **Reporta a**: Tech Lead (técnico) y PM (funcional)

### Responsabilidades ÚNICAS

#### R1: Testing Funcional en DEV
- Ejecutar **CHECKLIST_QA_DEV** para cada feature completada
- Validar Criterios de Aceptación definidos por PM
- Testing exploratorio (casos no especificados)
- Reportar bugs con pasos reproducibles y evidencias

#### R2: Testing en Staging (Pre-Producción)
- **Smoke testing manual** del flujo crítico (miércoles, post-deploy)
- Ejecutar **suite de regresión** (casos de prueba documentados)
- Validar integraciones con sistemas externos
- Testing cross-browser y responsive

#### R3: Automatización de Testing (E2E)
- Mantener suite de **Playwright** (3-5 pruebas críticas)
- Ejecutar E2E en Staging después de cada deploy
- Expandir cobertura E2E progresivamente (1 prueba nueva/sprint)
- Reportar flaky tests y trabajar con devs para estabilizar

#### R4: Gestión de Bugs
- Documentar bugs con severidad y prioridad
- Hacer triage inicial (crítico/alto/medio/bajo)
- Re-testear bugs marcados como resueltos
- Mantener registro de bugs recurrentes (para identificar patrones)

#### R5: Documentación de Calidad
- Mantener casos de prueba actualizados
- Documentar flujos de testing
- Actualizar **CHECKLISTS** (QA_DEV, STAGING) según cambios
- Registrar **INCIDENTES** (junto con DevOps)

#### R6: Preparación de Datos de Prueba
- Crear y mantener datasets de prueba
- Configurar usuarios de testing en cada ambiente
- Coordinar con devs para seeds de BD
- Validar que datos de staging son anonimizados

### Funciones que NO debe hacer (Delegar)
- ❌ Definir Criterios de Aceptación (eso es del PM)
- ❌ Decidir prioridades de bugs (triaje inicial sí, decisión final es PM + Tech Lead)
- ❌ Code review (eso es de Tech Lead / Devs)
- ❌ Ejecutar deploys (eso es de DevOps)

### Cadencia
- **Diario**: Testing en DEV de PRs mergeados
- **Lunes**: Planificación de testing del sprint
- **Miércoles (11:30, post-deploy staging)**: Smoke test + E2E
- **Jueves (11:30, post-deploy prod)**: Smoke test rápido en producción
- **Viernes**: Reporte de calidad del sprint
- **Semanal**: Mantenimiento de tests automatizados (2h)

### KPIs
- Bugs encontrados en DEV vs Staging vs Producción (70% / 25% / 5% - objetivo)
- Cobertura de casos de prueba (≥ 80% de features)
- Flaky tests en E2E (< 10%)
- Tiempo promedio de testing de feature (< 2h)
- Escape rate (bugs que llegaron a prod sin detectar) < 5%

### Herramientas
- Navegadores (Chrome, Firefox, Safari, Edge)
- Postman (testing de APIs)
- Playwright (E2E automatizado)
- Jira/Linear (registro de bugs)
- Loom (videos de bugs)
- DevTools (debugging)

---

## 5️⃣ **DEVOPS ENGINEER / SRE**

### Perfil
- **Tipo**: Infraestructura, CI/CD y operaciones
- **Dedicación**: 75-100% (según escenario)
- **Nivel**: Semi-Senior a Senior (3-6 años experiencia)
- **Reporta a**: Tech Lead (técnico) y Founder (estratégico si es infraestructura crítica)

### Responsabilidades ÚNICAS

#### R1: CI/CD Pipeline
- Mantener y mejorar **GitHub Actions workflows**
- Configurar y gestionar **secretos** (GitHub Secrets, 1Password)
- Optimizar tiempos de build y deploy
- Implementar quality gates (lint, test, SonarQube)

#### R2: Infraestructura y Ambientes
- Administrar servidores (DEV, Staging, Producción)
- Gestionar **Docker** y **docker-compose** / **Swarm**
- Configurar y mantener **Nginx Proxy Manager**
- Gestionar **SSL/TLS** (renovación automática con Let's Encrypt)

#### R3: Deployments
- **Ejecutar deploys a Staging** (miércoles 11:00)
- **Ejecutar deploys a Producción** (jueves 11:00, con aprobación de Tech Lead)
- Implementar estrategias de deploy (rolling, blue-green si necesario)
- Ejecutar **rollbacks** en caso de incidentes

#### R4: Monitoreo y Observabilidad
- Configurar y mantener **Sentry** (error tracking)
- Configurar y mantener **Uptime Kuma** (health checks)
- Gestionar **logs** (agregación, rotación, limpieza)
- Configurar **alertas** (Slack, email) para incidentes

#### R5: Backups y Disaster Recovery
- Configurar **backups automatizados** (diarios)
- **Prueba de restore mensual** (documentada)
- Gestionar retención de backups (7/14/30 días)
- Mantener plan de **disaster recovery** actualizado

#### R6: Seguridad de Infraestructura
- Gestionar acceso SSH (keys, no passwords)
- Configurar y mantener **firewall** (ufw)
- Configurar **fail2ban** (protección contra brute force)
- Auditoría de seguridad trimestral

#### R7: Optimización de Recursos
- Monitorear uso de CPU/RAM/Disco
- Optimizar costos de infraestructura
- Escalar servicios según demanda
- Gestionar límites de recursos en Docker

### Funciones que NO debe hacer (Delegar)
- ❌ Desarrollar features de producto (puede apoyar en tareas de infra, pero no es su foco)
- ❌ Definir prioridades de producto (eso es del PM)
- ❌ Testing funcional (eso es de QA)
- ❌ Code review de lógica de negocio (puede revisar scripts de infra)

### Cadencia
- **Diario**: Monitoreo de infraestructura (30 min)
- **Lunes**: Planificación de tareas de infra/DevOps del sprint
- **Martes**: Preparación de deploy a staging (validar que CI pasó)
- **Miércoles 11:00**: Deploy a Staging + monitoreo post-deploy (1h)
- **Jueves 11:00**: Deploy a Producción + monitoreo post-deploy (2h)
- **Mensual**: Prueba de restore de backup
- **Trimestral**: Auditoría de seguridad

### KPIs
- Uptime de producción ≥ 99.5%
- Tiempo de deploy (staging + prod) < 30 min
- Tiempo de rollback < 10 min
- Backups exitosos ≥ 99%
- Tiempo de respuesta a incidentes < 30 min
- Restore exitoso mensual: 100%

### Herramientas
- Docker, docker-compose, Swarm
- GitHub Actions
- Nginx Proxy Manager (o Nginx clásico)
- Sentry
- Uptime Kuma
- SSH, bash scripting
- Portainer (opcional)
- 1Password / Bitwarden (gestión de secretos)

---

## 6️⃣ **DESARROLLADOR (Jr / Mid / Senior)**

### Perfil
- **Tipo**: Implementación de features y mantenimiento
- **Dedicación**: 100%
- **Niveles**: Junior (0-2 años), Mid (2-5 años), Senior (5+ años)
- **Reporta a**: Tech Lead

### Responsabilidades por Nivel

#### **Desarrollador Junior (Entry) - 0-6 meses**

**Funciones**:
- Implementar tareas con **supervisión cercana** de Tech Lead o Mid/Senior
- Abrir PRs con descripción clara (aún no aprueba PRs de otros)
- Ejecutar `lint`, `test`, `build` antes de abrir PR
- Escribir **tests unitarios básicos** (happy path)
- Actualizar `.env.example` cuando agrega variables
- Participar en Daily standup
- Pedir ayuda proactivamente cuando está bloqueado > 2h

**NO debe hacer**:
- ❌ Aprobar PRs de otros (aún)
- ❌ Cambios en arquitectura o infraestructura
- ❌ Decisiones técnicas sin consultar

**Mentoría recibida**: 1:1 semanal con Tech Lead (30 min)

**KPIs**:
- PRs abiertos y cerrados sin feedback negativo
- Tiempo de resolución de tareas asignadas (vs estimación)
- Proactividad para pedir ayuda

---

#### **Desarrollador Junior (Mid) - 6-18 meses**

**Funciones adicionales**:
- Implementar tareas con **autonomía** (supervisión liviana)
- **Aprobar PRs de Junior Entry** (peer review)
- Escribir **tests completos** (happy path + edge cases)
- Actualizar **README** cuando cambia cómo correr el proyecto
- Soportar a QA en preparación de datos de prueba
- Proponer mejoras menores (refactors pequeños)

**NO debe hacer**:
- ❌ Aprobar PRs de Mid/Senior (aún)
- ❌ Decisiones arquitectónicas
- ❌ Cambios críticos sin supervisión

**Mentoría recibida**: 1:1 quincenal con Tech Lead (30 min)

**KPIs**:
- Code reviews constructivos y útiles
- Tests escritos con cobertura ≥ 80%
- Autonomía en tareas (menos bloqueos)

---

#### **Desarrollador Junior (Senior) - 18-24 meses**

**Funciones adicionales**:
- Implementar **features complejas** end-to-end
- **Mentorear a Junior Entry** (pair programming)
- Aprobar PRs de **cualquier Junior**
- Proponer mejoras de arquitectura (pequeñas) a Tech Lead
- Participar en estimación de esfuerzo
- **Candidato a promoción** a Mid Developer

**NO debe hacer**:
- ❌ Aprobar PRs críticos sin revisión de Tech Lead
- ❌ Tomar decisiones arquitectónicas mayores solo

**Mentoría recibida**: 1:1 mensual con Tech Lead (enfoque en crecimiento)

**KPIs**:
- Calidad de mentoría a Junior Entry (feedback de mentorados)
- Contribuciones a mejora de proceso/arquitectura
- Ownership de features complejas

---

#### **Desarrollador Mid - 2-5 años experiencia**

**Funciones**:
- Implementar features complejas de forma **independiente**
- Aprobar PRs de **Junior y otros Mid** (con criterio)
- Proponer y ejecutar **refactors medianos**
- Participar en **diseño de soluciones** con Tech Lead
- Mentorear a 1-2 Juniors (pair programming semanal)
- Participar en **hiring** (entrevistas técnicas)
- On-call rotation (si existe)

**KPIs**:
- Ownership de módulos completos
- Code reviews de alta calidad
- Contribución a deuda técnica (propone y ejecuta mejoras)

---

#### **Desarrollador Senior - 5+ años experiencia**

**Funciones**:
- Diseñar soluciones técnicas complejas
- Aprobar PRs críticos (seguridad, performance, arquitectura)
- Liderar iniciativas técnicas (migrations, refactors mayores)
- Mentorear a Mid y Junior
- Participar en definición de estándares técnicos
- Apoyar a Tech Lead en decisiones arquitectónicas
- Candidato a Tech Lead en el futuro

**KPIs**:
- Impacto técnico en el equipo
- Calidad de decisiones arquitectónicas
- Liderazgo técnico (sin ser Tech Lead formal)

---

### Cadencia General (todos los niveles)
- **Diario (10 min)**: Daily standup
- **Según necesidad**: Code review de PRs asignados
- **Según tarea**: Implementación de features
- **Semanal (Jr)** / **Quincenal (Mid)** / **Mensual (Sr)**: 1:1 con Tech Lead

---

## 📊 MATRIZ RACI (Responsibility Assignment Matrix)

| Actividad / Decisión | Founder | Tech Lead | PM | QA | DevOps | Dev Jr | Dev Mid/Sr |
|---------------------|---------|-----------|----|----|--------|--------|------------|
| **Estrategia y Roadmap** |
| Roadmap 6-12 meses | **A** | C | **R** | I | I | I | I |
| Inversiones > $5K | **A/R** | C | C | I | I | I | I |
| Contrataciones | **A** | **R** | C | I | I | I | C |
| **Producto** |
| User Stories | I | C | **R/A** | C | I | I | I |
| Priorización sprint | C | C | **R/A** | I | I | I | I |
| UAT y aceptación | I | C | **R/A** | C | I | I | I |
| **Desarrollo** |
| Arquitectura mayor | C | **R/A** | I | I | C | I | C |
| Code review | I | **R/A** | I | I | I | **R** | **R** |
| Implementación features | I | **A** | I | I | I | **R** | **R** |
| Refactors | I | **A** | I | I | I | **R** | **R** |
| **Calidad** |
| Testing en DEV | I | C | C | **R/A** | I | I | I |
| E2E automatizado | I | C | I | **R/A** | C | I | C |
| Triage de bugs | I | C | **A** | **R** | I | I | I |
| **Infraestructura** |
| CI/CD pipeline | I | C | I | I | **R/A** | I | I |
| Deploy a Staging | I | C | I | **R** | **R/A** | I | I |
| Deploy a Producción | **A** | **A** | C | **R** | **R** | I | I |
| Backups y restore | I | C | I | I | **R/A** | I | I |
| **Incidentes** |
| Decisión rollback | C | **A** | I | I | **R** | I | C |
| Hotfix crítico | **A** | **R** | C | C | **R** | **R** | **R** |
| Post-mortem | I | **R/A** | C | C | **R** | C | C |

**Leyenda**:
- **R** = Responsible (ejecuta)
- **A** = Accountable (aprueba, uno solo)
- **C** = Consulted (consultado antes de decisión)
- **I** = Informed (informado después)

---

## 🔄 Plan de Implementación Progresiva

### Fase 1: Inmediato (Sprint 1-2) - **Clarificación**
- [ ] Comunicar nueva estructura al equipo
- [ ] Asignar roles según estructura actual (mapeo)
- [ ] Documentar RACI matrix y distribuir
- [ ] Crear job descriptions actualizadas por rol
- [ ] Definir % de dedicación de cada persona

**Ejemplo de mapeo inicial**:
```
Persona Actual          → Rol Nuevo (% dedicación)
------------------------------------------------------------------
Juan (Founder)          → Founder (25%) + Tech Lead (75% temporal)
María (PM/Analista)     → PM (60%) + QA (40%)
Carlos (DevOps)         → DevOps (100%)
Ana (Dev Jr)            → Dev Jr Mid (18 meses experiencia)
Pedro (Dev Jr)          → Dev Jr Entry (3 meses experiencia)
Lucía (Dev Jr)          → Dev Jr Entry (2 meses experiencia)
```

### Fase 2: Corto Plazo (Sprint 3-6) - **Separación Gradual**
- [ ] Contratar **Tech Lead dedicado** (si Founder no puede 75%)
  - O promover internamente a Dev Senior si existe
- [ ] Separar PM y QA (50/50 → dos personas diferentes):
  - **Opción A**: Contratar QA dedicado (libera PM a 100%)
  - **Opción B**: Promover Dev Jr a QA Jr (capacitación)
- [ ] Implementar niveles de Junior (Entry/Mid/Senior)
- [ ] Automatizar tareas de DevOps (liberar tiempo)

### Fase 3: Mediano Plazo (Sprint 7-12) - **Consolidación**
- [ ] Founder reduce a 10% dedicación (solo decisiones críticas)
- [ ] Tech Lead 100% operativo
- [ ] PM 100% dedicado a producto
- [ ] QA 100% dedicado a calidad
- [ ] DevOps optimizado con runbooks y automatización
- [ ] 3-4 Desarrolladores con gradación clara

### Fase 4: Largo Plazo (12+ sprints) - **Escalamiento**
- [ ] Contratar Mid/Senior Developers (reducir % de Juniors)
- [ ] QA Lead + QA Jr (si volumen aumenta)
- [ ] SRE dedicado (si infraestructura crece)
- [ ] CTO/Director Técnico (si software factory escala)

---

## 💰 Análisis de Costos (Estimado)

### Escenario 1: MVP (Estado Actual Optimizado)
```
Founder (25%)               $3,000/mes
Tech Lead (100%)           $5,000/mes
PM (50%)                   $2,000/mes
QA (50%)                   $1,500/mes
DevOps (75%)               $3,500/mes
Dev Jr x2 (100% c/u)       $4,000/mes

TOTAL:                     $19,000/mes
```

### Escenario 2: Óptimo (Separación Completa)
```
Founder (10%)               $1,000/mes
Tech Lead (100%)           $5,500/mes
PM (100%)                  $4,000/mes
QA (100%)                  $3,000/mes
DevOps (100%)              $4,500/mes
Dev Jr x2                  $4,000/mes
Dev Mid x1                 $3,500/mes

TOTAL:                     $25,500/mes (+34% vs MVP)
```

### Escenario 3: Escalado
```
CTO (100%)                 $7,000/mes
Tech Lead (100%)           $5,500/mes
PM (100%)                  $4,000/mes
QA Lead + QA Jr            $5,000/mes
DevOps/SRE (100%)          $5,000/mes
Devs x5 (mix Jr/Mid/Sr)   $18,000/mes

TOTAL:                     $44,500/mes (+134% vs MVP)
```

---

## 🎯 Recomendación para Microsyst

Dada la naturaleza de Microsyst (software factory dentro de empresa más grande):

### Implementación Sugerida (Pragmática)

**HOY (próximos 30 días)**:
1. ✅ Documentar esta estructura y comunicarla al equipo
2. ✅ Clarificar % de dedicación de PM/Analista actual (60% PM / 40% QA)
3. ✅ Implementar niveles de Desarrollador Junior
4. ✅ Automatizar tareas de DevOps (scripts, runbooks)
5. ✅ Founder delega code review a Tech Lead (si aún lo hace)

**PRÓXIMOS 3 MESES**:
1. 🎯 Contratar o promover **Tech Lead dedicado 100%** (si Founder no puede)
2. 🎯 Evaluar separar PM y QA (contratar QA dedicado o promover dev)
3. 🎯 Implementar RACI matrix en herramientas (Jira/Linear)

**PRÓXIMOS 6-12 MESES**:
1. 🔮 Founder reduce a 10-25% (solo decisiones estratégicas)
2. 🔮 PM y QA son roles separados (100% cada uno)
3. 🔮 Contratar 1 Dev Mid/Senior (equilibrar equipo)
4. 🔮 DevOps con 90% de tareas automatizadas

---

## 📚 Documentos Relacionados

- [Guía del Desarrollador](./roles/01_DESARROLLADOR.md)
- [Guía del Tech Lead](./roles/02_TECH_LEAD.md)
- [Guía del PM/Analista](./roles/03_QA_ANALISTA_CALIDAD.md)
- [Guía del DevOps](./roles/04_DEVOPS_SRE.md)
- [Manual Operativo Microsyst](./MANUAL_OPERATIVO_MICROSYST.md)

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 2.0  
**Mantenido por**: Founder + Tech Lead

