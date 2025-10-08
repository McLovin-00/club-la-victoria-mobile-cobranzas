# Tech Lead (Líder Técnico)

> **Última actualización**: 8 Octubre 2025  
> **Rol**: Liderazgo técnico operativo del equipo  
> **Dedicación**: 100%  
> **Reporta a**: Founder/CEO (o CTO si existe)

---

## 🎯 Visión General

El Tech Lead es responsable del **liderazgo técnico operativo del equipo de desarrollo**. Define arquitectura, asegura calidad del código, toma decisiones técnicas day-to-day, y mentore a desarrolladores. Es el puente entre la estrategia de negocio (Founder/PM) y la ejecución técnica (Desarrolladores).

**Separación clave**: Founder define "qué construir y por qué" (estrategia). PM define "para quién y cuándo". Tech Lead define "cómo construir" (técnica).

---

## 👤 Perfil

### Requisitos
- **Experiencia**: 5-8+ años en desarrollo de software
- **Nivel técnico**: Senior+, con experiencia en arquitectura y liderazgo de equipos
- **Skills de liderazgo**: Mentoría, gestión de conflictos, comunicación efectiva
- **Stack**: Dominio del stack completo (React, Node.js, PostgreSQL, Docker, CI/CD)
- **Metodologías**: Agile/Scrum, TDD, DevOps, arquitectura de software

### Competencias Clave
- **Técnicas**: Arquitectura, performance, seguridad, testing
- **Liderazgo**: Mentoría, feedback, motivación, resolución de conflictos
- **Comunicación**: Traducir técnico a negocio y viceversa
- **Estratégicas**: Balance entre velocidad y calidad, gestión de deuda técnica

---

## 📋 Responsabilidades ÚNICAS (No Delegables)

### R1: Liderazgo Técnico del Equipo

#### Definir Arquitectura de Soluciones
- Diseñar arquitectura de features complejas (diagramas, ADRs)
- Evaluar trade-offs (performance vs mantenibilidad, monolito vs microservicios)
- Validar que arquitectura escala y es mantenible

#### Code Review de PRs Críticos
- **PRs críticos**: Seguridad, arquitectura, performance, refactors mayores
- **Qué revisar**:
  - ✅ Arquitectura correcta (no meter todo en un archivo gigante)
  - ✅ Seguridad (validación de entrada, autorización)
  - ✅ Performance (queries optimizadas, no N+1, caching donde aplica)
  - ✅ Mantenibilidad (código legible, sin duplicación)
  - ✅ Tests adecuados (happy path + edge cases + errores)
- **Tiempo de respuesta**: < 24h (prioridad alta)

#### Decisiones Técnicas Day-to-Day
- ¿Usar librería X o construir custom?
- ¿Refactorizar ahora o agregar a deuda técnica?
- ¿Implementar feature flags o deploy directo?
- Ser el "desempate" en discusiones técnicas del equipo

#### Mentoría de Desarrolladores
- **1:1s semanales (Jr)** / **quincenales (Mid)** / **mensuales (Sr)**
- **Qué cubrir**:
  - Progreso técnico (¿qué aprendiste esta semana?)
  - Blockers y desafíos
  - Feedback (qué está bien, qué mejorar)
  - Path de crecimiento (qué necesitas para próximo nivel)
- **Pair programming**: 2-4h/semana con Juniors en problemas complejos

---

### R2: Quality Gates y Estándares

#### Definir Estándares de Código
- **Linting**: ESLint config (reglas strict, consistencia)
- **Formatting**: Prettier (tabs vs spaces, punto y coma, etc)
- **Naming**: Convenciones de nombres (camelCase, PascalCase, etc)
- **Structure**: Estructura de carpetas (features, components, utils)
- **Testing**: Qué testear, qué no, cobertura mínima (≥80%)

#### Aprobar ADRs (Architecture Decision Records)
- **ADR**: Documento que registra decisiones arquitectónicas importantes
- **Ejemplo**: "ADR-003: Usar Prisma ORM en vez de raw SQL"
- **Por qué**: Para recordar en el futuro **por qué** tomamos esa decisión
- **Template**: Ver `docs/ADR_TEMPLATE.md`

#### Asegurar Cobertura de Tests ≥ 80%
- Monitorear cobertura de tests en CI (Jest coverage report)
- Si cobertura baja < 80%, investigar y corregir
- Educar al equipo sobre testing (no solo "alcanzar %", sino testear lo correcto)

#### Revisar y Aprobar Refactors Mayores
- Refactors que tocan > 300 líneas o múltiples módulos
- Validar que refactor no rompe features existentes
- Coordinar con QA para testing exhaustivo post-refactor

---

### R3: Planificación Técnica

#### Estimación de Esfuerzo Técnico (con Devs)
- **Planificación de sprint (Lunes)**: Estimar esfuerzo de tareas con equipo
- **Técnicas**: Planning poker, T-shirt sizing (S/M/L/XL)
- **Realismo**: Incluir tiempo de code review, testing, imprevistos (+30%)

#### Identificar Dependencias Técnicas
- "Para implementar feature X, primero necesitamos refactorizar módulo Y"
- "Feature A bloquea feature B (misma área de código)"
- Comunicar dependencias a PM para priorización

#### Gestión de Deuda Técnica
- **Identificar**: Code smells, módulos frágiles, tests faltantes
- **Priorizar (con PM)**: Balancear features nuevas vs pagar deuda
- **Regla**: 20% del tiempo del sprint a deuda técnica (1 día/semana)
- **Documentar**: Backlog de deuda técnica en Jira/Linear (label `tech-debt`)

#### Planificar Capacidad del Equipo
- ¿El equipo puede completar 15 tareas en 1 semana? ¿O solo 10?
- Considerar vacaciones, días feriados, meetings
- Ajustar expectations con PM si capacidad baja

---

### R4: Aprobación de Deploys a Producción

#### Todos los Deploys Requieren Aprobación
- **Proceso**:
  1. DevOps notifica "Deploy listo para producción" (Slack)
  2. Tech Lead valida checklist (ver abajo)
  3. Tech Lead da OK → DevOps ejecuta deploy
  4. Tech Lead monitorea primera hora post-deploy

#### Checklist Pre-Deploy
- ✅ CI pasó (lint, tests, build)
- ✅ SonarQube pasó quality gates
- ✅ QA dio OK (smoke test + E2E pasaron en staging)
- ✅ PM dio OK (UAT aprobado)
- ✅ No hay bugs P0 abiertos
- ✅ Plan de rollback documentado

#### Revisión de Plan de Rollback
- ¿Cómo rollback si algo falla? (script, comando Docker)
- ¿Hay migrations de BD? ¿Son reversibles?
- ¿Hay features flags? (preferible para rollback rápido)

#### Monitoreo Post-Deploy (Primera Hora)
- Revisar Sentry (errores nuevos?)
- Revisar logs (errores, warnings?)
- Verificar métricas (response time, error rate)
- Si algo falla → decidir rollback vs hotfix

---

### R5: Gestión de Incidentes Técnicos

#### Coordinación de Respuesta a Incidentes SEV1/SEV2
- **SEV1 (Crítico)**: Sistema caído, pérdida de datos, brecha de seguridad
  - Respuesta inmediata (< 15 min)
  - All hands on deck
- **SEV2 (Alto)**: Feature crítica no funciona, performance muy degradada
  - Respuesta rápida (< 1h)
  - Equipo core

#### Decisión de Rollback vs Hotfix
- **Rollback**: Si impacto es alto y fix tardará > 30 min
- **Hotfix**: Si fix es rápido (< 30 min) y probado localmente

#### Post-Mortem y Acciones Correctivas
- **Post-mortem (24-48h post-incidente)**:
  - ¿Qué pasó? (timeline detallado)
  - ¿Por qué pasó? (root cause)
  - ¿Qué haremos para evitarlo? (action items)
- **Cultura blame-free**: Foco en el proceso, no en culpar personas
- **Registrar en `INCIDENTES.md`**

---

### R6: Hiring Técnico

#### Entrevistas Técnicas de Candidatos
- **Screening (30 min)**: Preguntas técnicas básicas, fit cultural
- **Técnica profunda (1-2h)**: Coding challenge, arquitectura, problem-solving
- **Feedback**: Recomendación (hire / no-hire / maybe)

#### Definir Requisitos de Nuevos Roles Técnicos
- "Necesitamos contratar 1 Mid Developer con experiencia en React y Node"
- Definir requisitos (must-have vs nice-to-have)
- Definir proceso de entrevista

#### Onboarding Técnico de Nuevos Devs
- **Primera semana**: Setup, contexto, primera tarea guiada
- **Primer mes**: Asignar mentor (Dev Senior), check-ins frecuentes
- **Primer trimestre**: Validar fit, feedback continuo

---

## ❌ Funciones que NO Debe Hacer (Delegar)

### ❌ Implementar Features Como Desarrollador Full-Time
- **Por qué**: Tech Lead debe liderar, no solo codear
- **Qué SÍ hace**: Máximo 20% de su tiempo en código (PRs críticos, spikes técnicos)
- **Delegar a**: Desarrolladores (Sr, Mid, Jr Senior)

### ❌ Definir Prioridades de Negocio
- **Por qué**: Eso es responsabilidad del PM
- **Qué SÍ hace**: Aportar perspectiva técnica (esfuerzo, viabilidad)

### ❌ Ejecutar Deploys
- **Por qué**: Eso es responsabilidad de DevOps
- **Qué SÍ hace**: Aprobar deploys (checklist pre-deploy)

### ❌ Testing Manual Exhaustivo
- **Por qué**: Eso es responsabilidad de QA
- **Qué SÍ hace**: Validar estrategia de testing (qué testear, qué automatizar)

---

## 📅 Cadencia Semanal

### Lunes (4h)
- **9:00-9:30**: Planificación de sprint con PM
  - Revisar backlog priorizado por PM
  - Estimar esfuerzo técnico con equipo
  - Identificar dependencias y riesgos técnicos
  - Definir goal técnico del sprint
- **10:00-12:00**: Planificación técnica interna
  - Asignar tareas a desarrolladores
  - Revisar deuda técnica del sprint anterior
  - Coordinar pair programming sessions

### Diario (Martes a Jueves)
- **10:00-10:10**: Daily standup
- **10:10-12:00**: Code review (PRs críticos, desbloquear equipo)
- **14:00-17:00**: 
  - Mentoría / 1:1s (2-4h/semana)
  - Pair programming con Juniors (2-4h/semana)
  - Desarrollo estratégico (spikes, ADRs, refactors) (4-8h/semana)

### Miércoles (Deploy Staging)
- **10:30-11:00**: Validación de quality gates
  - CI pasó?
  - SonarQube OK?
  - Tests coverage ≥ 80%?
- **11:00**: Aprobación de deploy a staging
- **11:30-12:00**: Monitoreo post-deploy staging

### Jueves (Deploy Producción)
- **10:30-11:00**: Checklist pre-deploy producción
  - Staging OK?
  - QA dio OK?
  - PM dio OK?
  - Plan de rollback listo?
- **11:00**: Aprobación de deploy a producción
- **11:30-13:00**: Monitoreo intensivo post-deploy (primera hora)

### Viernes (3h)
- **16:00-16:30**: Sprint review técnico
  - Qué se completó (demo técnico)
  - Qué quedó pendiente y por qué
- **16:30-17:30**: Retrospectiva
  - Qué fue bien
  - Qué mejorar
  - Action items para próximo sprint

### Mensual
- **Primera semana**: Roadmap técnico review con Founder/PM (2h)
- **Última semana**: 1:1s de crecimiento con cada desarrollador (30min cada uno)

---

## 📊 KPIs y Métricas de Éxito

### KPIs del Rol

| KPI | Target | Medición |
|-----|--------|----------|
| Tiempo promedio de code review | < 24h | Tracking en GitHub |
| Incidentes en producción | < 2 por mes | Post-mortems |
| Cobertura de tests | ≥ 80% | CI coverage report |
| Velocity del equipo | Estable (±15%) | Story points por sprint |
| Satisfacción del equipo | > 4/5 | Encuesta trimestral |
| Tiempo de onboarding | < 2 semanas | Feedback de nuevos devs |

### Métricas de Calidad

- **Lead Time**: Tiempo desde commit hasta deploy (objetivo: < 7 días)
- **Change Failure Rate**: % de deploys que fallan (objetivo: < 15%)
- **Mean Time to Recovery (MTTR)**: Tiempo para recuperar de incidente (objetivo: < 1h)
- **Deuda técnica**: Tendencia (objetivo: decreciente o estable)

---

## 🛠️ Herramientas

### Code Review y Desarrollo
- **GitHub**: PRs, reviews, issues, projects
- **VSCode**: IDE con extensiones (ESLint, Prettier, GitLens)

### Monitoring y Observabilidad
- **Sentry**: Error tracking y performance monitoring
- **Uptime Kuma**: Health checks de servicios
- **Logs**: Agregar context, leer logs de producción

### Calidad de Código
- **SonarQube**: Code quality, code smells, security vulnerabilities
- **Jest**: Coverage reports

### Comunicación
- **Slack**: Comunicación diaria, notificaciones de CI/CD
- **Loom**: Videos para explicar arquitectura o debugging
- **Miro / Excalidraw**: Diagramas de arquitectura

### Documentación
- **Notion / Confluence**: ADRs, guías técnicas, runbooks
- **README.md**: Documentación de código

---

## 📈 Balance Tiempo/Actividades (Distribución Semanal)

| Actividad | Horas/Semana | % |
|-----------|--------------|---|
| Code Review | 10-12h | 25-30% |
| Mentoría / 1:1s | 4-6h | 10-15% |
| Desarrollo estratégico | 6-8h | 15-20% |
| Reuniones (planificación, daily, demo, retro) | 6-8h | 15-20% |
| Gestión técnica (deploys, incidentes, hiring) | 4-6h | 10-15% |
| Aprendizaje / Investigación | 2-4h | 5-10% |
| **Total** | ~40h | 100% |

**Nota**: Máximo 20% de tiempo en código (desarrollo) es intencional. Tech Lead debe **liderar**, no solo **codear**.

---

## 🚀 Path de Crecimiento

### Desarrollador Senior → Tech Lead (5-8 años)
- Demostrar liderazgo técnico informal
- Mentorar a Juniors y Mids
- Contribuir a decisiones arquitectónicas
- Propuesto por Tech Lead actual o Founder

### Tech Lead → CTO / Engineering Manager (8+ años)
- Liderar múltiples equipos
- Definir estrategia técnica a 1-2 años
- Gestión de presupuesto técnico
- Participación en decisiones de negocio C-level

---

## 🤝 Colaboración con Otros Roles

### Con Founder/CEO
- **Mensual**: Roadmap técnico, inversiones en tech, hiring
- **Crítico**: Decisiones estratégicas (cambio de stack, arquitectura mayor)

### Con PM
- **Semanal**: Planificación de sprint, priorización, trade-offs
- **Diario**: Clarificación de requerimientos, validación de viabilidad técnica

### Con QA
- **Semanal**: Estrategia de testing, priorización de bugs
- **Deploy**: Validación de quality gates

### Con DevOps
- **Diario**: CI/CD, deploys, monitoreo
- **Incidentes**: Coordinación de respuesta y rollbacks

### Con Desarrolladores
- **Diario**: Code review, desbloqueo, mentoría
- **Semanal**: 1:1s de crecimiento

---

## 🎓 Checklist para Nuevo Tech Lead (Primer Mes)

### Semana 1: Contexto
- [ ] Reunión con Founder (visión, strategy, expectations)
- [ ] Reunión con PM (roadmap, backlog, priorities)
- [ ] Reunión con cada Developer (1:1s de presentación)
- [ ] Revisar codebase completo (arquitectura, deuda técnica)

### Semana 2: Observación
- [ ] Observar sprint completo (planning, daily, demo, retro)
- [ ] Hacer code review de todos los PRs (entender nivel del equipo)
- [ ] Revisar métricas actuales (velocity, bugs, coverage)
- [ ] Identificar quick wins (mejoras rápidas)

### Semana 3: Acción
- [ ] Proponer mejoras de proceso (si necesario)
- [ ] Definir/refinar estándares de código
- [ ] Implementar primer ADR
- [ ] Hacer primera mentoría 1:1 con cada dev

### Semana 4: Liderazgo
- [ ] Liderar planificación de sprint
- [ ] Aprobar primer deploy a producción
- [ ] Presentar roadmap técnico (trimestral)
- [ ] Establecer cadencia de 1:1s y code review

---

## 📚 Recursos Recomendados

### Libros
- **"The Manager's Path"** de Camille Fournier (liderazgo técnico)
- **"An Elegant Puzzle"** de Will Larson (sistemas de ingeniería)
- **"Accelerate"** de Nicole Forsgren (DevOps y performance)
- **"Team Topologies"** de Matthew Skelton (estructura de equipos)

### Blogs y Newsletters
- **StaffEng**: Historias de Staff/Principal Engineers
- **LeadDev**: Liderazgo técnico
- **High Growth Engineer**: Crecimiento técnico y carrera

### Comunidades
- **Rands Leadership Slack**: Comunidad de tech leads y managers
- **CTO Craft**: Comunidad de CTOs y tech leaders
- **r/ExperiencedDevs**: Subreddit de devs senior

---

## 💡 Consejos para el Éxito

### 1. Balance Entre Código y Liderazgo
- ❌ No seas solo "code reviewer"
- ❌ No seas solo "meeting person"
- ✅ Dedica 20% a código estratégico, 80% a liderazgo

### 2. Empodera al Equipo
- ❌ No seas el "hero" que resuelve todo
- ✅ Enseña a pescar, no des el pescado
- ✅ Delega decisiones técnicas cuando sea posible

### 3. Comunicación Clara
- ✅ Explica el "por qué" de las decisiones técnicas
- ✅ Traduce técnico a negocio (para PM/Founder)
- ✅ Traduce negocio a técnico (para Devs)

### 4. Cuida la Salud del Equipo
- ✅ Detecta burnout temprano (1:1s honestos)
- ✅ Celebra wins (no solo señalar errores)
- ✅ Crea ambiente psicológicamente seguro (OK hacer preguntas "tontas")

### 5. Invierte en el Futuro
- ✅ Paga deuda técnica (20% del tiempo)
- ✅ Mentoriza (el equipo es más fuerte si todos crecen)
- ✅ Aprende constantemente (tech evoluciona rápido)

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 2.0 (Atomizada - Tech Lead separado de Founder)  
**Mantenido por**: Founder + Tech Lead
