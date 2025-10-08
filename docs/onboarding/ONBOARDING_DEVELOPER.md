# Onboarding: Desarrollador - Checklist Extenso

> **Versión**: 1.0  
> **Fecha**: 8 Octubre 2025  
> **Duración**: 2-4 semanas (según experiencia)  
> **Responsables**: Tech Lead + Dev Senior (mentor asignado)

---

## 🎯 Objetivo

Integrar exitosamente a un nuevo desarrollador al equipo de Microsyst, asegurando que tenga todos los accesos, conocimientos y herramientas necesarias para ser productivo desde la primera semana.

---

## 👤 Información del Nuevo Desarrollador

```
Nombre completo: _________________________________
Email corporativo: _________________________________
Username GitHub: _________________________________
Nivel: [ ] Junior Entry  [ ] Junior Mid  [ ] Junior Senior  [ ] Mid  [ ] Senior
Fecha de inicio: _________________________________
Mentor asignado: _________________________________
Tech Lead: _________________________________
```

---

## 📅 SEMANA 0: Pre-Onboarding (Antes del primer día)

### Responsable: Tech Lead / HR

#### Accesos y Cuentas

- [ ] **Email corporativo creado** (@microsyst.com.ar)
- [ ] **Cuenta de Slack** creada e invitada a canales:
  - `#general` (canal principal)
  - `#tech` (equipo técnico)
  - `#random` (off-topic)
  - `#deploys` (notificaciones de deploys)
- [ ] **Cuenta de GitHub** agregada a organización
  - Usuario agregado al repositorio `sergiobleynat1969/monorepo-bca`
  - Permisos: `Write` (puede push a branches, no a main)
- [ ] **Cuenta de Jira/Linear** creada
  - Agregado al proyecto correcto
  - Permisos según rol
- [ ] **Acceso a 1Password** (vault del equipo)
  - Credenciales compartidas de desarrollo
  - Credenciales de herramientas (Postman collections, etc)
- [ ] **Acceso a Google Drive** (si aplica)
  - Carpeta de documentos del equipo
- [ ] **Acceso a Sentry** (solo lectura)
- [ ] **Acceso a Uptime Kuma** (solo lectura)

#### Hardware y Logística

- [ ] **Laptop asignada** (o confirmación de laptop personal)
  - Specs mínimas: 16GB RAM, 4 cores, 50GB libres
  - OS compatible: Linux/macOS/Windows 11+WSL2
- [ ] **Monitor externo** (si aplica)
- [ ] **Auriculares con micrófono** (para meetings)
- [ ] **Espacio de trabajo** preparado (oficina o remoto)

#### Comunicación Pre-Inicio

- [ ] **Email de bienvenida enviado** (3 días antes)
  - Fecha y hora de inicio
  - Ubicación (si es presencial)
  - Qué traer el primer día
  - Contacto del mentor
- [ ] **Calendario de primera semana compartido**
  - Reuniones clave (bienvenida, tech lead 1:1, etc)

---

## 📅 DÍA 1: Bienvenida y Setup Inicial

### Responsables: Tech Lead + Mentor

#### Hora 1: Bienvenida (9:00-10:00)

- [ ] **Meeting de bienvenida con Tech Lead** (30 min)
  - Presentación del equipo (quién es quién)
  - Visión general del proyecto
  - Expectativas de las primeras semanas
  - Responder preguntas iniciales
- [ ] **Tour de la oficina** (si es presencial) (10 min)
- [ ] **Presentación en Slack** (5 min)
  ```
  #general:
  👋 ¡Bienvenido/a [Nombre]!
  Rol: Desarrollador [Jr Entry/Mid/Senior]
  Background: [breve descripción]
  Fun fact: [algo personal]
  
  Estamos felices de tenerte en el equipo! 🎉
  ```

#### Hora 2-4: Setup de Laptop (10:00-13:00)

- [ ] **Configurar email corporativo** en cliente de email
- [ ] **Configurar Slack** (desktop + mobile)
- [ ] **Configurar GitHub** (account, SSH keys)
- [ ] **Instalar herramientas base**:
  - [ ] Git
  - [ ] Node.js 20+ (via nvm)
  - [ ] Docker y Docker Compose
  - [ ] VSCode con extensiones requeridas
  - [ ] Postman
- [ ] **Clonar repositorio** `monorepo-bca`
- [ ] **Ejecutar `npm install`** (primera vez, puede tardar 15 min)
- [ ] **Levantar entorno local** (docker-compose + npm run dev)
  - Backend en http://localhost:4800
  - Frontend en http://localhost:8550
  - Documentos en http://localhost:4802
- [ ] **Verificar que todo funciona** (health checks)

**Si hay problemas técnicos** → Mentor asiste (pair session)

**Referencia**: [PROCEDURE_DEV_ENVIRONMENT_SETUP.md](../procedures/PROCEDURE_DEV_ENVIRONMENT_SETUP.md)

#### Hora 5-6: Revisión de Documentación (14:00-16:00)

- [ ] **Leer `README.md`** del repositorio (30 min)
- [ ] **Leer guía de su rol** (1 hora)
  - Si es Junior: `/docs/roles/01_DESARROLLADOR.md`
  - Enfocarse en su nivel (Entry/Mid/Senior)
- [ ] **Explorar estructura de carpetas** (30 min)
  - `apps/` (backend, frontend, documentos)
  - `packages/` (si aplica)
  - `docs/` (documentación)
  - `scripts/` (scripts útiles)

#### Hora 7: Check-in con Mentor (16:00-17:00)

- [ ] **Primera sesión 1:1 con Mentor** (45 min)
  - ¿Cómo te fue hoy?
  - ¿Algo que no funcionó?
  - ¿Dudas sobre el proyecto?
  - Plan para mañana
- [ ] **Agregar a Daily Standup** (mañana 10:00)

---

## 📅 DÍA 2-3: Inmersión en el Código

### Responsable: Mentor

#### Objetivos
- Familiarizarse con el código existente
- Entender flujo de trabajo (Git Flow, PRs, CI/CD)
- Primera contribución (muy pequeña)

#### Tareas

- [ ] **Participar en Daily Standup** (10:00)
  - Presentarse brevemente
  - Escuchar updates del equipo
- [ ] **Leer código de 2-3 features existentes** (2 horas)
  - Elegir features simples (ej: Login, CRUD básico)
  - Seguir el flujo: Frontend → Backend → BD
  - Anotar preguntas para el mentor
- [ ] **Revisar PRs recientes** (1 hora)
  - Ver últimos 5-10 PRs mergeados
  - Entender cómo se documenta un PR
  - Ver feedback de code reviews
- [ ] **Leer `MANUAL_OPERATIVO_MICROSYST.md`** (1 hora)
  - Git Flow y convenciones
  - Proceso de PR
  - Quality gates
- [ ] **Primera tarea asignada: Fix de typo o mejora de docs** (2 horas)
  - Crear branch: `fix/[issue-number]-fix-typo`
  - Hacer cambio pequeño (ej: corregir README, agregar comentario)
  - Abrir PR con descripción clara
  - Pasar por proceso de code review
  - Mergear (con ayuda del mentor)

**Milestone**: Primera PR mergeada ✅

---

## 📅 DÍA 4-5: Primera Feature Real (Guiada)

### Responsable: Mentor + Tech Lead

#### Objetivos
- Implementar primera feature real (pequeña)
- Aprender proceso completo (US → Código → Test → PR → Deploy)

#### Tareas

- [ ] **Asignación de primera feature** (Tech Lead)
  - Tarea pequeña y bien definida
  - User Story clara con Criterios de Aceptación
  - Estimación: máximo 1 día
  - Ejemplo: "Agregar campo 'teléfono' a perfil de usuario"
- [ ] **Planificación con Mentor** (30 min)
  - Entender requerimiento
  - Identificar qué archivos modificar
  - Plan de implementación paso a paso
- [ ] **Pair programming con Mentor** (2 horas)
  - Mentor guía, nuevo dev escribe código
  - Implementar Frontend (formulario, validación)
  - Implementar Backend (endpoint, BD)
- [ ] **Implementación independiente** (2 horas)
  - Continuar con la implementación
  - Escribir tests básicos
  - Pedir ayuda si está bloqueado > 30 min
- [ ] **Testing manual** (30 min)
  - Probar en local que funciona
  - Verificar CA (Criterios de Aceptación)
- [ ] **Abrir PR** (30 min)
  - Descripción clara (template de PR)
  - Screenshots/videos si aplica
  - Linkar a User Story
- [ ] **Code review** (por Mentor y/o Tech Lead)
  - Recibir feedback constructivo
  - Hacer ajustes solicitados
  - Aprender de los comentarios
- [ ] **Merge y Deploy** (con Mentor)
  - Mergear PR (squash and merge)
  - Ver cómo se despliega a DEV/Staging
  - Validar en staging que funciona

**Milestone**: Primera feature real mergeada y deployed ✅

---

## 📅 SEMANA 2: Autonomía Creciente

### Responsable: Mentor (check-ins diarios)

#### Objetivos
- Implementar 2-3 tareas con menor supervisión
- Participar activamente en Daily Standups
- Hacer primeros code reviews (si es Jr Mid o superior)

#### Tareas de Desarrollo

- [ ] **Implementar 2-3 tareas pequeñas-medianas** (6-8 horas c/u)
  - Tareas asignadas en Planning (lunes)
  - Pedir clarificaciones a PM si algo no está claro
  - Implementar con mayor autonomía
  - Abrir PRs bien documentados
  - Pasar code reviews con menos rondas de feedback
- [ ] **Escribir tests unitarios** para cada feature
  - Happy path + edge cases mínimos
  - Cobertura ≥ 50% (para Junior Entry)
  - Cobertura ≥ 70% (para Jr Mid+)
- [ ] **Participar en Daily Standup** (todos los días 10:00)
  - Qué hice ayer
  - Qué haré hoy
  - Blockers (si los hay)

#### Code Reviews (Si aplica: Jr Mid+)

- [ ] **Hacer primeros code reviews** de PRs de otros Juniors
  - Enfocarse en: linting, tests, legibilidad
  - Dar feedback constructivo (no solo "está mal")
  - Aprender a revisar código de otros

#### Ceremonias del Equipo

- [ ] **Participar en Planning** (lunes)
  - Escuchar estimaciones de esfuerzo
  - Opinar (con humildad) sobre viabilidad técnica
- [ ] **Participar en Demo** (viernes)
  - Demo de features completadas (si tiene algo para mostrar)
- [ ] **Participar en Retrospectiva** (viernes)
  - Compartir aprendizajes de la semana
  - Proponer mejoras (con respeto)

#### Documentación

- [ ] **Leer `CICD_PIPELINE_3_SERVICES.md`**
  - Entender flujo de CI/CD
  - Cómo se despliega a Staging/Producción
- [ ] **Leer `ENVIRONMENTS.md`**
  - Diferencias entre DEV/Staging/Producción
  - Variables de entorno por ambiente
- [ ] **Explorar scripts de automatización** (`/scripts/`)
  - `health-check-all.sh`
  - `monitor-resources.sh`
  - Etc.

#### Check-in con Mentor (Viernes)

- [ ] **1:1 de 30 min con Mentor**
  - ¿Cómo te fue esta semana?
  - ¿Qué aprendiste?
  - ¿Qué te gustaría mejorar?
  - Feedback del mentor (qué va bien, qué mejorar)

**Milestone**: 2-3 tareas completadas con autonomía creciente ✅

---

## 📅 SEMANA 3: Integración Completa

### Responsable: Tech Lead (check-in semanal)

#### Objetivos
- Ser productivo de forma independiente
- Contribuir a code reviews
- Proponer mejoras pequeñas

#### Tareas de Desarrollo

- [ ] **Implementar 3-5 tareas** según capacidad
  - Mix de tareas pequeñas y medianas
  - Pedir ayuda solo si bloqueado > 2 horas
  - PRs con calidad consistente (pocos comentarios de review)
- [ ] **Ownership de una feature completa** (si es Jr Senior/Mid)
  - Feature end-to-end (Frontend + Backend + BD)
  - Coordinar con QA para testing
  - Coordinar con DevOps si hay cambios de infra

#### Code Reviews y Mentoría

- [ ] **Code reviews activos** (2-4 por semana)
  - Revisar PRs de peers (según nivel)
  - Dar feedback técnico útil
- [ ] **Ayudar a Junior Entry** (si es Jr Mid+)
  - Responder preguntas en Slack
  - Pair programming ocasional (1h/semana)

#### Propuesta de Mejoras

- [ ] **Identificar 1-2 mejoras pequeñas**
  - Refactor menor (extraer función, renombrar variable)
  - Mejora de docs (agregar comentario, actualizar README)
  - Proponer a Tech Lead
  - Implementar si es aprobado

#### 1:1 con Tech Lead (Viernes)

- [ ] **Primera sesión 1:1 con Tech Lead** (45 min)
  - Feedback de las primeras 3 semanas
  - Fortalezas observadas
  - Áreas de mejora
  - Plan de crecimiento (próximos 3-6 meses)
  - Responder dudas sobre carrera, equipo, etc.

**Milestone**: Productivo de forma independiente ✅

---

## 📅 SEMANA 4: Consolidación

### Responsable: Autónomo (Tech Lead disponible)

#### Objetivos
- Velocidad normal de desarrollo
- Participación activa en equipo
- Path de crecimiento claro

#### Tareas

- [ ] **Velocidad de desarrollo estable**
  - Completar tareas según estimación (±20%)
  - PRs con feedback mínimo (1 ronda o menos)
  - Tests con cobertura adecuada
- [ ] **Participación en todas las ceremonias**
  - Planning, Daily, Demo, Retro (cada semana)
  - Contribución activa (no solo escuchar)
- [ ] **Conocimiento del dominio**
  - Entender lógica de negocio del proyecto
  - Saber dónde está cada cosa en el código
  - Poder explicar arquitectura a alto nivel

#### Evaluación de Onboarding (Viernes Semana 4)

- [ ] **Sesión de feedback final** (Tech Lead + Mentor, 1 hora)
  - Qué fue bien en el onboarding
  - Qué se podría mejorar para futuros devs
  - Evaluación de desempeño (informal)
  - Confirmación de fit en el equipo
  - Plan de crecimiento (6-12 meses)

#### Documentar Aprendizajes

- [ ] **Actualizar proceso de onboarding** (si encontraste mejoras)
  - PRs a este documento con sugerencias
  - Feedback constructivo

**Milestone**: Onboarding completado ✅

---

## 📊 Checklist de Evaluación (Semana 4)

### Para Tech Lead y Mentor

#### Skills Técnicas

- [ ] **Setup de entorno**: Puede configurar entorno local sin ayuda
- [ ] **Git Flow**: Usa branches correctamente, PRs bien documentados
- [ ] **Implementación**: Implementa features según US y CA
- [ ] **Testing**: Escribe tests unitarios adecuados
- [ ] **Code review**: Recibe feedback positivo (pocos cambios solicitados)
- [ ] **Debugging**: Puede debuggear y resolver bugs simples

#### Skills Blandas

- [ ] **Comunicación**: Comunica blockers proactivamente
- [ ] **Colaboración**: Trabaja bien con mentor y peers
- [ ] **Proactividad**: Hace preguntas, busca aprender
- [ ] **Ownership**: Toma responsabilidad de sus tareas
- [ ] **Puntualidad**: Llega a tiempo a meetings
- [ ] **Participación**: Participa en Daily, Demo, Retro

#### Integración al Equipo

- [ ] **Conoce al equipo**: Sabe quién es quién y qué hace cada uno
- [ ] **Conoce el proyecto**: Entiende visión, arquitectura, stack
- [ ] **Conoce los procesos**: Sabe cómo funciona Planning, Deploy, etc
- [ ] **Fit cultural**: Alineado con valores del equipo

#### Evaluación General

```
⭐⭐⭐⭐⭐ Excelente - Superó expectativas, listo para tareas complejas
⭐⭐⭐⭐   Muy bien - Cumplió expectativas, on track
⭐⭐⭐     Bien - Necesita un poco más de tiempo/supervisión
⭐⭐       Preocupante - Requiere plan de mejora
⭐         Crítico - Revisar fit en el rol
```

**Evaluación**: ⭐⭐⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐ / ⭐⭐ / ⭐ (marcar una)

---

## 📅 Post-Onboarding: Primeros 3 Meses

### Objetivos de Crecimiento

#### Junior Entry → Junior Mid (6 meses)
- [ ] Implementar tareas con autonomía
- [ ] Aprobar PRs de otros Junior Entry
- [ ] Escribir tests completos (happy path + edge cases)
- [ ] Proponer mejoras menores

#### Junior Mid → Junior Senior (18 meses)
- [ ] Implementar features complejas end-to-end
- [ ] Mentorear a Junior Entry (pair programming)
- [ ] Aprobar PRs de cualquier Junior
- [ ] Proponer mejoras de arquitectura (pequeñas)

#### Plan de 1:1s

- **Junior Entry**: Semanal con Mentor (30 min)
- **Junior Mid**: Quincenal con Tech Lead (30 min)
- **Junior Senior**: Mensual con Tech Lead (45 min)

### Recursos de Aprendizaje Continuo

- [ ] **Libros recomendados** (leer 1 por trimestre):
  - "Clean Code" de Robert C. Martin
  - "The Pragmatic Programmer" de Hunt & Thomas
- [ ] **Cursos online** (según interés):
  - React avanzado (Udemy, Frontend Masters)
  - Node.js avanzado (Udemy, Egghead)
  - Testing (Jest, Playwright)
- [ ] **Blogs técnicos** (seguir):
  - Kent C. Dodds (React, Testing)
  - Dan Abramov (React internals)
  - Prisma Blog (BD, ORM)

---

## 🎉 Felicitaciones!

Has completado el onboarding. Ahora eres parte oficial del equipo de Microsyst.

**Próximos pasos**:
1. Continuar desarrollando features
2. Participar activamente en ceremonias
3. Pedir feedback constante (no esperar a 1:1s)
4. Aprender de seniors y code reviews
5. Proponer mejoras (el equipo valora tu perspectiva fresca)

**Recuerda**:
- ✅ No hay preguntas tontas (es mejor preguntar que adivinar)
- ✅ El equipo está para ayudarte (no estás solo)
- ✅ Los errores son oportunidades de aprendizaje (no te castigamos por bugs)
- ✅ Tu crecimiento es nuestra prioridad (queremos verte crecer a Senior)

**Bienvenido/a al equipo** 🚀

---

## 📚 Documentos de Referencia

- [Guía de Desarrollador](../roles/01_DESARROLLADOR.md)
- [Procedimiento Setup Entorno](../procedures/PROCEDURE_DEV_ENVIRONMENT_SETUP.md)
- [Manual Operativo Microsyst](../MANUAL_OPERATIVO_MICROSYST.md)
- [CI/CD Pipeline](../CICD_PIPELINE_3_SERVICES.md)
- [README Principal](../../README.md)

---

## 📝 Notas del Onboarding

### Semana 1
```
Fecha: __________
Notas del Tech Lead/Mentor:






```

### Semana 2
```
Fecha: __________
Notas del Tech Lead/Mentor:






```

### Semana 3
```
Fecha: __________
Notas del Tech Lead/Mentor:






```

### Semana 4 - Evaluación Final
```
Fecha: __________
Evaluación: ⭐⭐⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐ / ⭐⭐ / ⭐

Fortalezas observadas:




Áreas de mejora:




Plan de crecimiento (6-12 meses):




Firma Tech Lead: _________________ Fecha: __________
Firma Mentor: ____________________ Fecha: __________
Firma Nuevo Dev: _________________ Fecha: __________
```

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: Tech Lead + HR  
**Feedback**: Si tienes sugerencias para mejorar este onboarding, por favor abre un PR

