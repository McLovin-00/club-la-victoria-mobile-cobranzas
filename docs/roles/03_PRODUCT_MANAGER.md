# Product Manager (PM)

> **Última actualización**: 8 Octubre 2025  
> **Rol**: Gestión de producto y requerimientos  
> **Dedicación**: 60-100% (según tamaño del equipo)  
> **Reporta a**: Founder/CEO

---

## 🎯 Visión General

El Product Manager es responsable de **definir QUÉ construir** y **por qué**. Traduce necesidades de negocio en requerimientos claros, prioriza el backlog, y valida que las features entregadas resuelven problemas reales de usuarios.

**Separación clave**: PM define el "qué" y "por qué". Tech Lead define el "cómo" técnico. QA valida el "qué tan bien funciona".

---

## 👤 Perfil

### Requisitos
- **Experiencia**: 3-5 años en gestión de producto
- **Skills técnicas**: Entendimiento de desarrollo de software (sin necesidad de programar)
- **Skills de negocio**: Análisis de datos, priorización, comunicación con stakeholders
- **Metodologías**: Agile/Scrum, Lean, Jobs to be Done
- **Herramientas**: Jira/Linear, Figma, Google Analytics/Mixpanel

### Nivel
- **Mid-Senior**: Capaz de gestionar producto end-to-end con autonomía
- **Crecimiento**: Puede evolucionar a Head of Product o CPO

---

## 📋 Responsabilidades ÚNICAS (No Delegables)

### R1: Definición de Producto

#### User Stories y Criterios de Aceptación
- Redactar User Stories con formato estándar:
  ```
  Como [tipo de usuario]
  Quiero [acción/feature]
  Para [beneficio/objetivo]
  
  Criterios de Aceptación:
  - [ ] CA1: Descripción verificable
  - [ ] CA2: Descripción verificable
  - [ ] CA3: Descripción verificable
  ```
- Incluir ejemplos, mockups, o wireframes cuando sea necesario
- Validar que la US es completa antes de asignarla al sprint

#### Roadmap de Producto
- Definir roadmap a 3-6 meses (con aprobación de Founder)
- Alinear roadmap con objetivos de negocio (OKRs)
- Comunicar roadmap a stakeholders internos y externos
- Actualizar roadmap según aprendizajes y cambios de prioridades

#### Priorización de Backlog
- Usar método **RICE** (Reach, Impact, Confidence, Effort) o **Valor/Esfuerzo**
- Mantener backlog limpio (máximo 50-100 items)
- Etiquetar items con prioridad (P0/P1/P2/P3)
- Grooming semanal (refinamiento de backlog)

#### Métricas de Éxito
- Definir KPIs de producto (ej: adoption rate, engagement, retention)
- Definir métricas específicas por feature (ej: "80% de usuarios usan filtro avanzado")
- Implementar tracking con devs (eventos, analytics)

---

### R2: Gestión de Requerimientos

#### Recolección de Feedback
- Entrevistas con usuarios (mínimo 5 por mes)
- Encuestas (NPS, satisfacción, feature requests)
- Análisis de support tickets (identificar pain points)
- Monitoreo de competencia (qué features tienen, qué podemos aprender)

#### Traducción a Requerimientos Técnicos
- Convertir feedback cualitativo en User Stories accionables
- Priorizar según impacto vs esfuerzo
- Validar viabilidad técnica con Tech Lead antes de comprometer
- Documentar decisiones de producto (por qué dijimos "no" a ciertas features)

#### Documentación de Producto
- Mantener wiki de producto actualizada (Notion/Confluence)
- Documentar flujos de usuario (diagramas, mockups)
- Mantener changelog de releases (qué cambió en cada versión)
- Documentar features deprecadas y plan de sunset

---

### R3: Priorización y Planificación

#### Planificación de Sprint (Lunes, 30 min)
- Proponer 5-15 tareas para el sprint (según capacidad del equipo)
- Priorizar con Tech Lead (negociar trade-offs entre valor y esfuerzo)
- Asegurar que cada tarea tiene US clara y CA verificables
- Definir goal del sprint (objetivo principal de la semana)

#### Gestión de Trade-offs
- **Alcance vs Tiempo**: ¿Reducimos features o extendemos timeline?
- **Calidad vs Velocidad**: ¿MVP rápido o solución robusta?
- **Usuario vs Negocio**: ¿Feature que pide usuario o que genera revenue?

#### Gestión de Expectativas
- Comunicar a stakeholders qué SÍ entra y qué NO entra en sprint
- Explicar el "por qué" de las decisiones de priorización
- Manejar presión de features urgentes (evaluar si realmente son P0)

---

### R4: Aceptación de Entregables

#### User Acceptance Testing (UAT) en Staging
- **Miércoles (1h, post-deploy staging)**: Validar features completadas
- Verificar que cumplen todos los Criterios de Aceptación
- Testear flujo completo end-to-end (no solo feature aislada)
- Dar feedback claro: "Aprobado" o "Devolver a DEV con comentarios"

#### Aprobación para Producción
- Aprobar features para deploy a producción (junto con Tech Lead)
- Validar que no hay cambios de última hora sin revisar
- **Jueves (1h, post-deploy prod)**: Validar que feature funciona en producción

#### Demo de Features
- **Viernes (30 min)**: Demo de features completadas a stakeholders
- Mostrar valor entregado en el sprint
- Recolectar feedback inmediato
- Celebrar wins del equipo

---

### R5: Comunicación de Producto

#### Release Notes
- Redactar release notes para usuarios finales (lenguaje no técnico)
- Destacar mejoras, nuevas features, bug fixes
- Publicar en canal apropiado (email, in-app, blog)

#### Updates a Stakeholders
- **Semanal**: Update breve de progreso (email/Slack)
- **Mensual**: Reporte detallado (features deployed, métricas, aprendizajes)
- **Trimestral**: Presentación de roadmap y OKRs

#### Comunicación con Soporte
- Informar a equipo de soporte sobre cambios en producto
- Proveer FAQs de nuevas features
- Coordinar rollout de features (¿gradual o full?)

---

### R6: Análisis y Métricas

#### Tracking de Métricas
- Revisar dashboards de producto (diario/semanal)
- Analizar adoption de nuevas features (primeros 7/14/30 días)
- Identificar drop-offs en funnels
- Monitorear NPS y satisfacción de usuarios

#### Análisis de Valor de Features
- ¿Qué features se usan más? ¿Cuáles menos?
- ¿Qué features generan más valor (engagement, revenue)?
- Identificar features "zombie" (bajo uso, alto costo de mantenimiento)
- Proponer deprecación de features de bajo valor

#### Reportes
- **Semanal**: Progreso de sprint, blockers, decisiones pendientes
- **Mensual**: Adoption, engagement, retention, NPS, features deployed
- **Trimestral**: OKRs, roadmap actualizado, learning

---

## ❌ Funciones que NO Debe Hacer (Delegar)

### ❌ Testing Funcional Exhaustivo
- **Por qué**: Eso es responsabilidad de QA Analyst
- **Qué SÍ hace PM**: UAT de alto nivel (validar que cumple CA)

### ❌ Code Review o Decisiones Técnicas
- **Por qué**: Eso es responsabilidad de Tech Lead
- **Qué SÍ hace PM**: Validar viabilidad técnica a alto nivel, negociar esfuerzo

### ❌ Ejecutar Deploys
- **Por qué**: Eso es responsabilidad de DevOps
- **Qué SÍ hace PM**: Aprobar que feature está lista para deploy

### ❌ Implementar Features
- **Por qué**: Eso es responsabilidad de Desarrolladores
- **Qué SÍ hace PM**: Definir QUÉ implementar y validar el resultado

---

## 📅 Cadencia Semanal

### Lunes
- **9:00-9:30**: Planificación de sprint con Tech Lead
  - Revisar backlog
  - Proponer 5-15 tareas priorizadas
  - Negociar trade-offs
  - Definir goal del sprint

### Diario
- **10:00-10:10**: Daily standup (escuchar, desbloquear, ajustar prioridades)

### Miércoles
- **11:30-12:30**: UAT en Staging (validar features completadas)
- **Feedback inmediato** a devs si hay que ajustar algo

### Jueves
- **11:30-12:30**: Validación post-deploy en Producción
- **Monitoreo de métricas** primeras horas post-deploy

### Viernes
- **16:00-16:30**: Sprint Review & Demo
  - Mostrar features completadas
  - Recolectar feedback de stakeholders
  - Celebrar logros del equipo

### Mensual
- **Primera semana del mes (2h)**: Roadmap review con Founder
  - Revisar progreso del roadmap
  - Ajustar prioridades según aprendizajes
  - Aprobar nuevas features para roadmap

---

## 📊 KPIs y Métricas de Éxito

### KPIs del Rol

| KPI | Target | Medición |
|-----|--------|----------|
| Claridad de User Stories | ≥ 4/5 | Encuesta a devs en retrospectiva |
| Features deployed on time | ≥ 80% | Tracking en Jira/Linear |
| Adoption de features nuevas | ≥ 50% en 1er mes | Analytics |
| NPS de producto | ≥ 8.0 | Encuesta trimestral |
| Tiempo de ciclo (idea → prod) | < 4 semanas | Promedio de features |

### Métricas de Producto (Ejemplos)

- **Engagement**: DAU (Daily Active Users), sesiones/usuario, tiempo en app
- **Retention**: D1/D7/D30 retention rate
- **Adoption**: % usuarios que usan feature X en primeros 30 días
- **Revenue**: ARR, MRR, conversión de trial a pago
- **Satisfacción**: NPS, CSAT, support tickets

---

## 🛠️ Herramientas

### Gestión de Backlog y Sprints
- **Jira / Linear / Trello**: Backlog, sprints, tracking de features
- **Shortcut / Asana**: Alternativas válidas

### Diseño y Wireframes
- **Figma**: Wireframes, mockups, prototipos interactivos
- **Balsamiq / Whimsical**: Alternativas para wireframes rápidos

### Análisis y Métricas
- **Google Analytics**: Web analytics
- **Mixpanel / Amplitude**: Product analytics (eventos, funnels, cohorts)
- **Hotjar**: Heatmaps, session recordings
- **Typeform / SurveyMonkey**: Encuestas a usuarios

### Documentación
- **Notion / Confluence**: Wiki de producto, documentación de features
- **Google Docs**: Colaboración en documentos

### Comunicación
- **Slack**: Comunicación diaria con equipo
- **Loom**: Videos de demos o explicaciones de features
- **Email**: Comunicación formal con stakeholders

---

## 🚀 Escenarios de Dedicación

### Escenario 1: PM 60% / QA 40% (Equipo Pequeño)
- **Contexto**: Equipo de 3-5 devs, PM hace también QA
- **PM (60%)**: 24h/semana
  - Lunes: Planificación (2h)
  - Martes-Jueves: Redacción US, roadmap, stakeholders (6h/día = 18h)
  - Viernes: Demo (1h), revisión métricas (2h)
  - Mensual: Roadmap review (2h)
- **QA (40%)**: Ver guía de QA Analyst

### Escenario 2: PM 100% (Equipo Mediano/Grande)
- **Contexto**: Equipo de 6+ devs, PM dedicado full time
- **PM (100%)**: 40h/semana
  - Planificación y grooming: 6h
  - Redacción de US y documentación: 10h
  - UAT y validación: 5h
  - Stakeholders y comunicación: 6h
  - Análisis de métricas y strategy: 8h
  - Investigación de usuarios: 5h

---

## 📈 Path de Crecimiento

### PM Junior → PM Mid (1-2 años)
- Aprende a redactar US claras
- Aprende a priorizar con frameworks (RICE, etc)
- Aprende a usar herramientas de analytics

### PM Mid → PM Senior (2-3 años)
- Gestiona producto end-to-end con autonomía
- Negocia trade-offs complejos
- Mentoriza a PM Junior

### PM Senior → Head of Product / CPO (3+ años)
- Gestiona múltiples productos
- Define estrategia de producto a 1-2 años
- Lidera equipo de PMs

---

## 📚 Recursos Recomendados

### Libros
- **"Inspired"** de Marty Cagan (gestión de producto)
- **"The Lean Startup"** de Eric Ries (validación de ideas)
- **"Sprint"** de Jake Knapp (design sprints)
- **"User Story Mapping"** de Jeff Patton (backlog management)

### Cursos
- **Product School**: Certificación de Product Manager
- **Reforge**: Cursos avanzados de producto (growth, retention, etc)
- **Udemy**: Cursos de Product Management

### Comunidades
- **Product Hunt**: Descubrir nuevos productos y tendencias
- **Mind the Product**: Comunidad global de PMs
- **r/ProductManagement**: Subreddit activo

---

## 🤝 Colaboración con Otros Roles

### Con Tech Lead
- **Planificación de sprint**: Negociar viabilidad técnica y esfuerzo
- **Validación de features**: Alinearse en definición de "done"
- **Gestión de deuda técnica**: Balancear features nuevas vs mejoras técnicas

### Con QA Analyst
- **Definición de Criterios de Aceptación**: Asegurar que son verificables
- **Priorización de bugs**: Decidir qué bugs son P0/P1/P2
- **UAT**: Coordinar testing en staging

### Con DevOps
- **Rollout de features**: ¿Full rollout o gradual (feature flags)?
- **Monitoreo de métricas**: Validar que tracking funciona post-deploy

### Con Desarrolladores
- **Clarificación de US**: Responder dudas sobre requerimientos
- **Demo de features**: Validar que feature cumple expectativa

### Con Founder/CEO
- **Roadmap**: Alinearse en prioridades de negocio
- **Reportes**: Comunicar progreso y aprendizajes

---

## 🎓 Checklist de Onboarding (Primer Mes)

### Semana 1: Contexto
- [ ] Entender visión y estrategia de la empresa
- [ ] Revisar roadmap actual y backlog
- [ ] Conocer a stakeholders clave (Founder, Tech Lead, usuarios)
- [ ] Acceso a herramientas (Jira, Figma, Analytics)

### Semana 2: Inmersión
- [ ] Participar en daily standups y sprint planning
- [ ] Observar UAT y demo de sprint
- [ ] Revisar documentación de producto existente
- [ ] Entrevistar a 3-5 usuarios

### Semana 3: Práctica
- [ ] Redactar primeras 3-5 User Stories
- [ ] Participar en priorización de backlog
- [ ] Hacer UAT de features en staging

### Semana 4: Autonomía
- [ ] Liderar planificación de sprint
- [ ] Presentar demo de features
- [ ] Proponer mejoras al roadmap

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 2.0 (Atomizada - PM separado de QA)  
**Mantenido por**: Founder + Tech Lead

