# Desarrollador (Developer)

> **Última actualización**: 8 Octubre 2025  
> **Rol**: Implementación de features y mantenimiento de código  
> **Dedicación**: 100%  
> **Reporta a**: Tech Lead

---

## 🎯 Visión General

El Desarrollador es responsable de **implementar features**, **mantener el código**, y **contribuir al crecimiento técnico del equipo**. Este rol tiene 3 niveles de progresión: **Junior (Entry/Mid/Senior)**, **Mid**, y **Senior**, cada uno con responsabilidades crecientes.

---

## 👤 Perfil General

### Skills Técnicas Base
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js 20+, Express, Prisma ORM, PostgreSQL
- **DevOps básico**: Docker, Git, npm
- **Testing**: Jest (unitarios), Playwright (E2E básico)
- **Herramientas**: Cursor AI, GitHub, Jira/Linear, HeidiSQL

### Skills Blandas
- **Comunicación**: Capacidad de explicar problemas técnicos y pedir ayuda
- **Trabajo en equipo**: Colaboración en PRs, pair programming
- **Aprendizaje continuo**: Curiosidad técnica, ganas de crecer
- **Ownership**: Responsabilidad por las tareas asignadas

---

## 📊 Niveles de Desarrollador

### Resumen de Niveles

| Nivel | Experiencia | Autonomía | Supervisión | Aprueba PRs | Mentorea |
|-------|-------------|-----------|-------------|-------------|----------|
| **Jr Entry** | 0-6 meses | Baja | Alta | ❌ | ❌ |
| **Jr Mid** | 6-18 meses | Media | Media | Jr Entry | ❌ |
| **Jr Senior** | 18-24 meses | Alta | Baja | Todos Jr | Jr Entry |
| **Mid** | 2-5 años | Muy alta | Mínima | Jr y Mid | Jr y Mid |
| **Senior** | 5+ años | Completa | Ninguna | Todos | Todos |

---

## 🌱 **DESARROLLADOR JUNIOR - ENTRY (0-6 meses)**

### Perfil
- **Experiencia**: 0-6 meses en el equipo/empresa
- **Nivel técnico**: Conocimientos básicos de stack, aprendiendo
- **Supervisión**: Alta (daily check-ins con Tech Lead o Mid/Senior)

### Responsabilidades

#### R1: Implementar Tareas con Supervisión
- Recibir tareas bien definidas (User Stories claras, CA específicos)
- Implementar features siguiendo estándares del equipo
- Hacer muchas preguntas (es esperado y valorado)
- Estimar tiempo de forma conservadora (x2 o x3 vs estimación inicial)

#### R2: Abrir Pull Requests con Descripción Clara
- Usar template de PR del repositorio
- Describir:
  - **Qué**: Qué cambios se hicieron
  - **Por qué**: Qué problema resuelve
  - **Cómo testear**: Pasos para validar la feature
- Incluir screenshots o videos (Loom) si es cambio de UI
- Linkar a User Story en Jira/Linear

#### R3: Ejecutar Quality Gates Localmente
- Antes de abrir PR, ejecutar:
  ```bash
  npm run lint          # Linter sin errores
  npm run type-check    # TypeScript sin errores
  npm test              # Tests unitarios pasan
  npm run build         # Build exitoso
  ```
- Si algo falla, arreglarlo antes de abrir PR

#### R4: Escribir Tests Unitarios Básicos
- Testear "happy path" (flujo exitoso)
- Ejemplo:
  ```typescript
  describe('calcularTotal', () => {
    it('debe calcular total correctamente con 2 items', () => {
      const items = [{ precio: 100 }, { precio: 200 }];
      expect(calcularTotal(items)).toBe(300);
    });
  });
  ```
- Cobertura mínima: 50% (irá subiendo con experiencia)

#### R5: Actualizar Documentación Básica
- Si se agrega variable de entorno nueva, actualizar `.env.example`
- Si cambia cómo correr el proyecto, actualizar `README.md`
- Si se elimina código, eliminar comentarios obsoletos

#### R6: Participar en Daily Standup
- **Qué hice ayer**: Resumir avance
- **Qué haré hoy**: Próxima tarea
- **Blockers**: Si estoy bloqueado > 2h, pedir ayuda

#### R7: Pedir Ayuda Proactivamente
- **Regla de 2 horas**: Si estás bloqueado > 2h, pedir ayuda (Slack, pair programming)
- **Cómo pedir ayuda bien**:
  - ❌ "No funciona, ayuda"
  - ✅ "Estoy implementando X, probé A y B (adjunto screenshots), pero sigo teniendo error Z. ¿Puedes ayudarme?"

### Funciones que NO Debe Hacer
- ❌ Aprobar PRs de otros (aún)
- ❌ Cambios en arquitectura o infraestructura
- ❌ Decisiones técnicas sin consultar
- ❌ Deploy a staging/producción

### Cadencia
- **Diario**: Daily standup (10 min), desarrollo (6-7h), code review (1h)
- **Semanal**: 1:1 con Tech Lead (30 min) - check-in, feedback, desbloqueo

### KPIs
- **PRs abiertos**: 2-4 por semana (tareas pequeñas)
- **Tiempo de resolución**: Dentro de estimación (±30%)
- **Feedback en PRs**: Máximo 2 rondas de cambios (learning curve)

### Promoción a Jr Mid (6 meses)
- ✅ Implementa tareas con autonomía creciente
- ✅ PRs con calidad aceptable (lint, tests, descripción)
- ✅ Proactividad para pedir ayuda y desbloquear
- ✅ Feedback positivo de Tech Lead

---

## 🌿 **DESARROLLADOR JUNIOR - MID (6-18 meses)**

### Perfil
- **Experiencia**: 6-18 meses en el equipo
- **Nivel técnico**: Conoce bien el stack, autonomía media
- **Supervisión**: Media (check-ins semanales)

### Responsabilidades (además de Jr Entry)

#### R1: Implementar Tareas con Autonomía
- Recibir tareas y ejecutarlas sin supervisión constante
- Proponer soluciones técnicas (con validación de Tech Lead)
- Estimar tiempo de forma realista (±20% vs real)

#### R2: Aprobar PRs de Junior Entry (Peer Review)
- Hacer code review constructivo de PRs de Jr Entry
- Validar:
  - ✅ Código sigue estándares (linting, convenciones)
  - ✅ Tests cubren casos principales
  - ✅ No hay código duplicado
  - ✅ Documentación actualizada si es necesario
- Dar feedback amigable y educativo (no solo "está mal", sino "está mal porque...")

#### R3: Escribir Tests Completos
- Testear happy path + edge cases + errores
- Ejemplo:
  ```typescript
  describe('validarEmail', () => {
    it('debe aceptar email válido', () => {
      expect(validarEmail('user@example.com')).toBe(true);
    });
    
    it('debe rechazar email sin @', () => {
      expect(validarEmail('userexample.com')).toBe(false);
    });
    
    it('debe rechazar email vacío', () => {
      expect(validarEmail('')).toBe(false);
    });
  });
  ```
- Cobertura mínima: 70%

#### R4: Soportar a QA en Datos de Prueba
- Ayudar a QA a preparar datos de prueba (seeds de BD, usuarios test)
- Coordinar con QA para entender cómo testear features

#### R5: Proponer Mejoras Menores
- Refactors pequeños (extraer función, renombrar variable, eliminar código duplicado)
- Proponer a Tech Lead para aprobación
- Implementar si es aprobado

### Funciones que NO Debe Hacer
- ❌ Aprobar PRs de Mid/Senior (aún)
- ❌ Decisiones arquitectónicas
- ❌ Cambios críticos sin supervisión

### Cadencia
- **Diario**: Daily standup, desarrollo, code review
- **Quincenal**: 1:1 con Tech Lead (30 min)

### KPIs
- **PRs abiertos**: 3-5 por semana (tareas medianas)
- **Code reviews**: 2-4 por semana (PRs de Jr Entry)
- **Tests con cobertura ≥ 70%**
- **Autonomía**: Menos bloqueos, menos rondas de feedback en PRs

### Promoción a Jr Senior (18 meses)
- ✅ Implementa features complejas end-to-end
- ✅ Code reviews útiles y constructivos
- ✅ Proactividad para proponer mejoras
- ✅ Feedback positivo de peers

---

## 🌳 **DESARROLLADOR JUNIOR - SENIOR (18-24 meses)**

### Perfil
- **Experiencia**: 18-24 meses en el equipo
- **Nivel técnico**: Domina el stack, alta autonomía
- **Supervisión**: Baja (check-ins mensuales)
- **Próximo paso**: Candidato a promoción a Mid Developer

### Responsabilidades (además de Jr Mid)

#### R1: Implementar Features Complejas End-to-End
- Features que tocan Frontend + Backend + BD
- Features con múltiples edge cases y validaciones
- Coordinar con PM y Tech Lead para diseño de solución

#### R2: Mentorear a Junior Entry (Pair Programming)
- Dedicar 2-4h/semana a pair programming con Jr Entry
- Enseñar buenas prácticas, debugging, cómo usar herramientas
- Dar feedback constructivo y celebrar progreso

#### R3: Aprobar PRs de Cualquier Junior
- Code review de PRs de Jr Entry y Jr Mid
- Validar calidad técnica, arquitectura, performance
- Balancear exigencia con educación

#### R4: Proponer Mejoras de Arquitectura (Pequeñas)
- Identificar patrones problemáticos en el código
- Proponer refactors a Tech Lead
- Ejemplo: "Tenemos mucha lógica duplicada en 5 controladores, propongo crear un service compartido"

#### R5: Participar en Estimación de Esfuerzo
- Ayudar a Tech Lead y PM a estimar esfuerzo de features en planificación de sprint
- Dar opinión técnica sobre viabilidad

#### R6: Ownership de Features Complejas
- Ser el "dueño" técnico de una feature desde inicio hasta deploy
- Coordinar con QA, PM, DevOps según sea necesario

### Funciones que NO Debe Hacer
- ❌ Aprobar PRs críticos sin revisión de Tech Lead (seguridad, arquitectura mayor)
- ❌ Tomar decisiones arquitectónicas mayores solo (consultar siempre)

### Cadencia
- **Diario**: Daily standup, desarrollo, code review, mentoría
- **Mensual**: 1:1 con Tech Lead (enfoque en crecimiento a Mid)

### KPIs
- **PRs abiertos**: 2-4 por semana (tareas complejas)
- **Mentoría**: Feedback positivo de Jr Entry mentoreados
- **Contribución a mejoras**: 1-2 propuestas de refactor por mes
- **Ownership**: Features completadas end-to-end sin supervisión

### Promoción a Mid Developer (24 meses)
- ✅ Implementa features complejas de forma independiente
- ✅ Mentorea efectivamente a Juniors
- ✅ Contribuye a mejora de arquitectura
- ✅ Liderazgo técnico informal (sin ser Tech Lead)
- ✅ Recomendación de Tech Lead

---

## 💼 **DESARROLLADOR MID (2-5 años experiencia)**

### Perfil
- **Experiencia**: 2-5 años en desarrollo de software
- **Nivel técnico**: Experto en el stack, autonomía completa
- **Supervisión**: Mínima (check-ins según necesidad)

### Responsabilidades

#### R1: Implementar Features Complejas Independientemente
- Features que requieren diseño técnico
- Refactors medianos (reestructurar módulo, optimizar performance)
- Integraciones con APIs externas

#### R2: Aprobar PRs de Junior y Otros Mid
- Code review de calidad (arquitectura, performance, seguridad)
- Balancear calidad con velocidad (saber cuándo es "suficientemente bueno")
- Ser mentor en PRs (explicar el "por qué")

#### R3: Proponer y Ejecutar Refactors Medianos
- Identificar deuda técnica
- Proponer plan de refactor a Tech Lead
- Ejecutar refactor en 1-2 sprints

#### R4: Participar en Diseño de Soluciones con Tech Lead
- Sesiones de diseño técnico (whiteboarding, ADRs)
- Aportar experiencia y perspectiva técnica
- Desafiar decisiones (constructivamente) si no tiene sentido

#### R5: Mentorear 1-2 Juniors (Pair Programming Semanal)
- Asignar 4-6h/semana a mentoría
- Pair programming, code review educativo, 1:1s informales

#### R6: Participar en Hiring (Entrevistas Técnicas)
- Hacer entrevistas técnicas de candidatos Junior/Mid
- Evaluar skills técnicas y fit cultural
- Dar feedback a Tech Lead para decisión de contratación

#### R7: On-call Rotation (si existe)
- Participar en rotación de on-call (1 semana cada N semanas)
- Responder a incidentes en producción
- Coordinar hotfixes si es necesario

### Funciones que NO Debe Hacer
- ❌ Aprobar PRs críticos sin contexto (seguridad, arquitectura mayor)
- ❌ Decisiones arquitectónicas mayores sin Tech Lead

### Cadencia
- **Diario**: Daily standup, desarrollo, code review, mentoría
- **Mensual**: 1:1 con Tech Lead (crecimiento profesional)

### KPIs
- **Ownership de módulos completos**: 1-2 módulos bajo su responsabilidad
- **Code reviews de alta calidad**: Feedback útil, educativo
- **Contribución a deuda técnica**: Propone y ejecuta mejoras
- **Mentoría efectiva**: Juniors muestran crecimiento

### Promoción a Senior (5+ años)
- ✅ Expertise técnico reconocido
- ✅ Liderazgo técnico sin ser Tech Lead formal
- ✅ Contribución significativa a arquitectura
- ✅ Mentoría efectiva y reconocida

---

## 🏆 **DESARROLLADOR SENIOR (5+ años experiencia)**

### Perfil
- **Experiencia**: 5+ años en desarrollo de software
- **Nivel técnico**: Experto reconocido, referente técnico
- **Supervisión**: Ninguna (trabaja con Tech Lead de par a par)

### Responsabilidades

#### R1: Diseñar Soluciones Técnicas Complejas
- Diseñar arquitectura de features complejas
- Evaluar trade-offs (performance vs mantenibilidad, etc)
- Documentar decisiones técnicas (ADRs)

#### R2: Aprobar PRs Críticos
- PRs de seguridad (autenticación, autorización)
- PRs de performance (queries optimizadas, caching)
- PRs de arquitectura (cambios estructurales)

#### R3: Liderar Iniciativas Técnicas
- Migrations (ej: React 17 → 18, Node 18 → 20)
- Refactors mayores (ej: modularización, microservicios)
- Implementación de nuevas herramientas (ej: SonarQube, E2E)

#### R4: Mentorear Mid y Junior
- Ser referente técnico del equipo
- Pair programming en problemas complejos
- Code reviews profundos (enseñar patrones avanzados)

#### R5: Participar en Definición de Estándares Técnicos
- Proponer estándares de código
- Proponer herramientas y procesos
- Mantener guías técnicas actualizadas

#### R6: Apoyar a Tech Lead en Decisiones Arquitectónicas
- Ser "sparring partner" del Tech Lead
- Aportar perspectiva técnica en decisiones estratégicas
- Puede actuar como Tech Lead temporal si es necesario

#### R7: Candidato a Tech Lead
- Si Tech Lead se va o se crea nuevo equipo, Senior es candidato natural

### Cadencia
- **Diario**: Daily standup, desarrollo estratégico, code review, mentoría
- **Según necesidad**: 1:1 con Tech Lead (colaboración técnica)

### KPIs
- **Impacto técnico**: Contribuciones significativas a arquitectura
- **Calidad de decisiones**: Decisiones técnicas correctas (medido a posteriori)
- **Liderazgo técnico**: Equipo lo reconoce como referente

---

## 🛠️ Herramientas (Todos los Niveles)

### Desarrollo
- **IDE**: Cursor AI con extensiones (ESLint, Prettier, TypeScript, Prisma)
- **Git**: GitHub (PRs, branches, reviews)
- **Terminal**: bash/zsh, npm, docker
- **BD**: HeidiSQL (cliente visual PostgreSQL)

### Testing
- **Jest**: Tests unitarios
- **Playwright**: E2E (básico)
- **Postman**: Testing de APIs (manual)

### Gestión
- **Jira / Linear**: Tracking de tareas y sprints
- **Slack**: Comunicación diaria
- **Loom**: Videos para PRs o demos

### Documentación
- **Notion / Confluence**: Documentación técnica
- **README**: Documentación de código

---

## 📚 Recursos de Aprendizaje

### Para Junior Entry
- **FreeCodeCamp**: React, JavaScript, Node.js
- **The Odin Project**: Full-stack development
- **Documentation oficial**: React, TypeScript, Prisma

### Para Junior Mid/Senior
- **"Clean Code"** de Robert C. Martin
- **"The Pragmatic Programmer"** de Hunt & Thomas
- **Refactoring.Guru**: Patrones de diseño

### Para Mid/Senior
- **"Designing Data-Intensive Applications"** de Martin Kleppmann
- **"System Design Interview"** de Alex Xu
- **Blogs técnicos**: Kent C. Dodds, Dan Abramov, etc.

---

## 🤝 Colaboración con Otros Roles

### Con Tech Lead
- **Daily**: Desbloqueos, validación de soluciones técnicas
- **Semanal (Jr)** / **Mensual (Mid/Sr)**: 1:1 de crecimiento

### Con PM
- **Planificación**: Clarificar User Stories, estimar esfuerzo
- **Demo**: Mostrar features completadas

### Con QA
- **Testing**: Coordinar testing de features, preparar datos
- **Bugs**: Reproducir y fixear bugs reportados

### Con DevOps
- **Deploy**: Coordinar deploys si hay cambios de infra
- **Troubleshooting**: Debug de issues en staging/prod

---

## 🎓 Checklist de Onboarding (Primera Semana)

### Día 1: Setup
- [ ] Laptop configurado (OS, herramientas básicas)
- [ ] Acceso a GitHub, Jira, Slack, 1Password
- [ ] Clonar repositorio y configurar entorno local
- [ ] Ejecutar `npm install && npm run dev` exitosamente

### Día 2-3: Contexto
- [ ] Leer README y documentación principal
- [ ] Leer código (estructura de carpetas, convenciones)
- [ ] Hacer tour de la aplicación (como usuario)
- [ ] Reunión de onboarding con Tech Lead (1-2h)

### Día 4-5: Primera Tarea
- [ ] Recibir primera tarea (pequeña, guiada)
- [ ] Implementar, testear, abrir PR
- [ ] Recibir feedback y aprender del proceso

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 2.0 (Atomizada - 3 niveles de Junior + Mid + Senior)  
**Mantenido por**: Tech Lead
