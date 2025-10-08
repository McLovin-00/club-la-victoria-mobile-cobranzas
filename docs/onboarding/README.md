# Onboarding - Microsyst Software Factory

> Checklists extensos de integración para nuevos miembros del equipo

---

## 🎯 Objetivo

Asegurar que cada nuevo miembro del equipo tenga una experiencia de onboarding estructurada, completa y exitosa, con todos los accesos, conocimientos y herramientas necesarias para ser productivo desde las primeras semanas.

---

## 📂 Onboardings Disponibles

### 1. [Desarrollador](./ONBOARDING_DEVELOPER.md)
**Duración**: 2-4 semanas (según nivel)  
**Niveles**: Junior Entry, Junior Mid, Junior Senior, Mid, Senior  
**Responsables**: Tech Lead + Mentor asignado

**Incluye**:
- **Semana 0** (Pre-onboarding): Accesos, hardware, comunicación
- **Día 1**: Bienvenida, setup de laptop, documentación inicial
- **Día 2-3**: Inmersión en código, primera contribución (typo fix)
- **Día 4-5**: Primera feature real (guiada)
- **Semana 2**: Autonomía creciente (2-3 tareas)
- **Semana 3**: Integración completa (productivo)
- **Semana 4**: Consolidación y evaluación final
- **Post-onboarding**: Plan de crecimiento 3-6 meses

**Milestone**: Primera PR mergeada (Día 3), Primera feature deployed (Día 5), Autónomo (Semana 3)

---

### 2. Tech Lead _(Por crear si necesario)_
**Duración**: 1 mes  
**Responsable**: Founder/CEO

**Incluiría**:
- Contexto completo del negocio y producto
- Revisión exhaustiva del codebase
- Identificación de deuda técnica
- Plan técnico trimestral
- Hiring pipeline

---

### 3. Product Manager _(Por crear si necesario)_
**Duración**: 3-4 semanas  
**Responsable**: Founder/CEO + Tech Lead

**Incluiría**:
- Visión de producto y roadmap actual
- Entrevistas con usuarios (5-10)
- Revisión de métricas actuales
- Backlog y priorización
- Primera feature end-to-end

---

### 4. QA Analyst _(Por crear si necesario)_
**Duración**: 2-3 semanas  
**Responsable**: Tech Lead + PM

**Incluiría**:
- Arquitectura del sistema y flujos
- Casos de prueba existentes
- Herramientas (Postman, Playwright)
- Primera sesión de testing en DEV
- Primera automation E2E

---

### 5. DevOps Engineer _(Por crear si necesario)_
**Duración**: 3-4 semanas  
**Responsable**: Tech Lead + DevOps actual

**Incluiría**:
- Infraestructura actual (diagramas, accesos)
- CI/CD pipeline completo
- Observación de deploy (Staging, Prod)
- Primer deploy supervisado
- Runbooks y procedimientos

---

## 📋 Checklist General de Onboarding (Todos los Roles)

### Pre-Onboarding (Antes del primer día)

#### Responsable: HR / Tech Lead

- [ ] **Contrato firmado** y documentación legal completa
- [ ] **Fecha de inicio confirmada** con nuevo miembro
- [ ] **Hardware preparado** (laptop, monitor, accesorios)
- [ ] **Accesos creados**:
  - [ ] Email corporativo (@microsyst.com.ar)
  - [ ] Slack (invitado a canales relevantes)
  - [ ] GitHub (agregado a organización y repos)
  - [ ] Jira/Linear (cuenta creada, permisos configurados)
  - [ ] 1Password (acceso a vault del equipo)
  - [ ] Sentry (solo lectura)
  - [ ] Uptime Kuma (solo lectura)
- [ ] **Mentor/Buddy asignado** (si aplica)
- [ ] **Espacio de trabajo preparado** (oficina o setup remoto)
- [ ] **Email de bienvenida enviado** (3 días antes)
  - Fecha y hora de inicio
  - Ubicación (si es presencial)
  - Qué traer
  - Contacto de referencia
- [ ] **Calendario de primera semana compartido**

---

### Primer Día (Todos los Roles)

#### Hora 1: Bienvenida

- [ ] **Meeting de bienvenida con Tech Lead/Founder** (30-60 min)
  - Presentación del equipo (quiénes son, qué hacen)
  - Visión del proyecto y la empresa
  - Valores y cultura del equipo
  - Expectativas de las primeras semanas
  - Q&A
- [ ] **Tour de la oficina** (si es presencial) (10 min)
- [ ] **Presentación en Slack #general**
  ```
  👋 ¡Bienvenido/a [Nombre]!
  Rol: [Rol]
  Background: [Breve descripción]
  Fun fact: [Algo personal]
  
  Estamos felices de tenerte en el equipo! 🎉
  ```

#### Hora 2-4: Setup Administrativo y Técnico

- [ ] **Configurar email corporativo** (Outlook/Gmail)
- [ ] **Configurar Slack** (desktop + mobile)
  - Agregar foto de perfil
  - Configurar notificaciones
  - Unirse a canales relevantes
- [ ] **Setup de laptop** (según rol):
  - Desarrollador: Ver [PROCEDURE_DEV_ENVIRONMENT_SETUP.md](../procedures/PROCEDURE_DEV_ENVIRONMENT_SETUP.md)
  - Otros roles: Herramientas específicas del rol
- [ ] **Acceso a documentación**:
  - Google Drive (si aplica)
  - Notion/Confluence (si aplica)
  - GitHub (repos y documentación)

#### Hora 5-6: Documentación y Contexto

- [ ] **Leer documentación inicial**:
  - README.md del proyecto
  - Guía de su rol específico (`/docs/roles/`)
  - Manual Operativo Microsyst (`/docs/MANUAL_OPERATIVO_MICROSYST.md`)
- [ ] **Explorar repositorio** (si es rol técnico)

#### Hora 7: Check-in y Planificación

- [ ] **Primera sesión 1:1 con Mentor/Manager** (30-45 min)
  - ¿Cómo te fue hoy?
  - ¿Algo que no funcionó?
  - ¿Dudas iniciales?
  - Plan para el resto de la semana
- [ ] **Agregar a Daily Standup** (si aplica, desde mañana)

---

### Primera Semana (Todos los Roles)

- [ ] **Participar en Daily Standup** (si aplica, 10:00)
- [ ] **Leer toda la documentación relevante**:
  - Guías de roles
  - Procedimientos técnicos (si aplica)
  - Manual operativo
  - Documentación de producto
- [ ] **Conocer al equipo**:
  - 1:1s informales con cada miembro (15-30 min c/u)
  - Entender qué hace cada persona
- [ ] **Primera contribución pequeña** (según rol):
  - Desarrollador: Fix de typo o mejora de docs
  - PM: Refinar 2-3 User Stories
  - QA: Ejecutar casos de prueba existentes
  - DevOps: Revisar runbooks y sugerir mejoras
- [ ] **Participar en ceremonias del equipo**:
  - Planning (lunes)
  - Demo (viernes)
  - Retrospectiva (viernes)

---

## 📊 Evaluación de Onboarding (Semana 4)

### Checklist de Evaluación (Para Manager/Tech Lead)

#### Skills del Rol (Varía según rol)
- [ ] Puede ejecutar responsabilidades básicas del rol sin supervisión
- [ ] Conoce herramientas y procesos del equipo
- [ ] Calidad de trabajo cumple estándares del equipo

#### Skills Blandas (Universal)
- [ ] Comunicación clara y proactiva
- [ ] Colaboración efectiva con el equipo
- [ ] Proactividad para aprender y pedir ayuda
- [ ] Ownership de sus tareas
- [ ] Puntualidad y cumplimiento de compromisos

#### Integración al Equipo (Universal)
- [ ] Conoce al equipo y sus roles
- [ ] Conoce el proyecto/producto
- [ ] Conoce procesos y flujos de trabajo
- [ ] Fit cultural con valores del equipo

#### Evaluación General
```
⭐⭐⭐⭐⭐ Excelente - Superó expectativas
⭐⭐⭐⭐   Muy bien - Cumplió expectativas
⭐⭐⭐     Bien - Necesita un poco más de tiempo
⭐⭐       Preocupante - Requiere plan de mejora
⭐         Crítico - Revisar fit en el rol
```

---

## 💡 Mejores Prácticas de Onboarding

### Para Managers/Tech Leads

1. **Preparar antes del día 1**: Todo listo (accesos, hardware, documentación)
2. **Asignar mentor/buddy**: No dejar solo al nuevo miembro
3. **First win rápido**: Tarea pequeña completada en primera semana
4. **Check-ins frecuentes**: Diarios primera semana, luego semanales
5. **Feedback continuo**: No esperar a evaluación formal
6. **Celebrar hitos**: Primera PR, primera feature, primera semana completa

### Para Nuevos Miembros

1. **Hacer muchas preguntas**: No hay preguntas tontas
2. **Tomar notas**: Documenta lo que aprendes
3. **Pedir ayuda proactivamente**: Si bloqueado > 30 min (Day 1) o > 2h (Week 2+)
4. **Participar activamente**: En meetings, Slack, ceremonias
5. **Dar feedback**: Si algo del onboarding no está claro, reportarlo
6. **Ser paciente contigo mismo**: Aprender lleva tiempo

---

## 📚 Recursos de Referencia

### Documentación del Proyecto
- **[README Principal](../../README.md)** - Overview del proyecto
- **[Manual Operativo](../MANUAL_OPERATIVO_MICROSYST.md)** - Procesos y flujos
- **[Guías de Roles](../roles/README.md)** - Responsabilidades por rol
- **[Procedimientos](../procedures/README.md)** - Procedimientos técnicos

### Herramientas y Accesos
- **Slack**: https://microsyst.slack.com
- **GitHub**: https://github.com/sergiobleynat1969/monorepo-bca
- **Jira/Linear**: [URL de tu instancia]
- **1Password**: [URL de tu vault]
- **Sentry**: [URL de tu proyecto]
- **Uptime Kuma**: [URL de tu instancia]

---

## 📝 Plantilla de Feedback de Onboarding

Al finalizar el onboarding (Semana 4), el nuevo miembro debe completar este feedback:

```markdown
## Feedback de Onboarding - [Nombre] - [Rol]

**Fecha**: [Fecha]
**Duración real**: [X semanas]

### ¿Qué fue bien?
- 
- 

### ¿Qué se podría mejorar?
- 
- 

### ¿Algo que faltó?
- 
- 

### ¿Documentación más útil?
- 

### ¿Documentación menos útil / confusa?
- 

### Rating general del onboarding (1-5): ⭐⭐⭐⭐⭐

### Comentarios adicionales:
```

**Enviar a**: Tech Lead y HR (para mejorar proceso)

---

## 📊 Métricas de Onboarding (Equipo)

### Objetivos
- **Tiempo hasta primera contribución**: < 3 días
- **Tiempo hasta productividad completa**: < 4 semanas
- **Satisfacción de onboarding**: ≥ 4/5 estrellas
- **Retención a 3 meses**: 100%
- **Retención a 6 meses**: ≥ 90%

### Tracking
- Registrar en spreadsheet:
  - Nombre, Rol, Fecha inicio
  - Tiempo hasta primera PR
  - Tiempo hasta autonomía
  - Rating de onboarding
  - Feedback cualitativo

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: HR + Tech Lead  
**Feedback**: Si tienes sugerencias, abre un PR o reporta en Slack #tech

