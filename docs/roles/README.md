# Guías de Roles - Monorepo BCA

> **Alineado con**: Manual Operativo Microsyst (Startup + Staging)  
> **Equipo**: 3 devs jr + 1 DevOps/Back ssr + 1 PM/Analista jr-ssr + Founder/Lead  
> **Última actualización**: 8 Octubre 2025

Este directorio contiene guías detalladas y procedimientos paso a paso para cada rol del equipo en el proyecto Monorepo BCA, siguiendo las mejores prácticas del Manual Operativo Microsyst.

## 📚 Guías Disponibles

### 1. [Desarrollador Junior](./01_DESARROLLADOR.md)
**Para**: Desarrolladores Junior (equipo de 3 colaborando)

**Contenido**:
- Flujo completo de desarrollo (desde recibir issue hasta merge)
- PRs chicos (≤300 líneas) con pasos de prueba
- Peer review entre desarrolladores (1 aprobación)
- Quality gates: lint/test/build antes de PR
- Documentación: README y .env.example
- Soporte a PM/Analista en datos de prueba

**Responsabilidades clave**: Implementar, revisar código entre pares, ejecutar quality gates, actualizar docs

**Tiempo estimado de lectura**: 45 minutos

---

### 2. [Founder/Lead](./02_TECH_LEAD.md)
**Para**: Tech Lead / Founder con responsabilidades técnicas y de negocio

**Contenido**:
- Priorización de sprint (top 10 de 5-15 tareas propuestas)
- Aprobación de deploys a Producción
- Revisión exhaustiva de Pull Requests
- Definición de estándares técnicos
- Mentoría y enseñanza del equipo
- Gestión de deuda técnica
- Decisiones arquitectónicas (ADRs)
- Gestión de incidentes y excepciones (hotfixes)

**Responsabilidades clave**: Definir prioridades, aprobar producción, alinear objetivos, destrabar bloqueos

**Tiempo estimado de lectura**: 60 minutos

---

### 3. [PM/Analista de Calidad](./03_QA_ANALISTA_CALIDAD.md)
**Para**: PM/Analista jr-ssr (rol dual: Product Management + QA)

**Contenido**:
- Redacción de User Stories con Criterios de Aceptación
- Gestión de tablero (Trello/Jira/Linear)
- Preparación de datos de prueba
- QA en DEV (CHECKLIST_QA_DEV)
- Smoke/E2E en Staging (manual + Playwright)
- Documentación mínima (README, CHECKLISTS, INCIDENTES)

**Responsabilidades clave**: Escribir historias, mantener tablero, ejecutar QA DEV/Staging, documentar

**Cadencia**: Planificación lunes, deploy Staging miércoles 11:00, deploy Prod jueves 11:00

**Tiempo estimado de lectura**: 50 minutos

---

### 4. [DevOps/Back (SSR)](./04_DEVOPS_SRE.md)
**Para**: DevOps/Backend Semi-Senior a Senior

**Contenido**:
- CI/CD: GitHub Actions (ci.yml, deploy-staging.yml, deploy-prod.yml)
- Deploys: Staging miércoles 11:00, Producción jueves 11:00
- Infraestructura: Docker, docker-compose, Nginx Proxy Manager
- Monitoreo: Sentry (errores), Uptime Kuma (health checks)
- Backups: Diarios automatizados + restore mensual documentado
- Seguridad: SSH keys, ufw, fail2ban, GitHub Secrets
- Rollback y procedimientos de emergencia

**Responsabilidades clave**: CI/CD, deploys, infraestructura, monitoreo, backups, seguridad básica

**Cadencia**: Deploy Staging miércoles 11:00, Producción jueves 11:00 (con aprobación Lead)

**Tiempo estimado de lectura**: 70 minutos

---

### 5. [Product Owner / Stakeholder](./05_PRODUCT_OWNER.md)
**Para**: Referencia complementaria para stakeholders externos

**Contenido**:
- Definición de requerimientos (User Stories)
- Priorización del backlog (RICE, matriz valor/esfuerzo)
- Aceptación de entregables (UAT, demos)
- Gestión de stakeholders
- Medición de éxito (framework HEART, métricas)

**Nota**: En el equipo Microsyst, estas responsabilidades son compartidas entre **PM/Analista** (operativo) y **Founder/Lead** (estratégico).

**Tiempo estimado de lectura**: 55 minutos

---

## 🎯 Cómo Usar Estas Guías

### Para Nuevos Miembros del Equipo (Onboarding)
1. **Día 1-3**: Lee tu guía completa en profundidad
2. **Semana 1**: Sigue los procedimientos paso a paso en un entorno de prueba
3. **Semana 2-4**: Aplica los procedimientos en tareas reales con supervisión
4. **Mes 2+**: Consulta la guía como referencia cuando tengas dudas

### Para Miembros Experimentados
- **Consulta rápida**: Usa el índice para encontrar procedimientos específicos
- **Estandarización**: Sigue los templates y checklists proporcionados
- **Mejora continua**: Propone actualizaciones si encuentras mejores prácticas

### Para Líderes de Equipo
- **Capacitación**: Usa estas guías como material de training
- **Evaluación**: Verifica que los procedimientos se sigan consistentemente
- **Evolución**: Actualiza las guías cuando cambien procesos o herramientas

---

## 📋 Checklist de Onboarding por Rol

### ✅ Desarrollador Junior
- [ ] Leí la guía completa del Desarrollador
- [ ] Configuré mi entorno local (Node, Docker, Git)
- [ ] Tengo acceso a repositorio GitHub
- [ ] Completé mi primer PR de prueba (con peer review)
- [ ] Entiendo el flujo de Git y branches (feat/*, fix/*, chore/*)
- [ ] Sé ejecutar: `npm ci && npm run lint && npm test && npm run build`
- [ ] Conozco a mi Founder/Lead y compañeros desarrolladores
- [ ] Entiendo restricción de PRs ≤300 líneas

### ✅ Founder/Lead
- [ ] Leí la guía completa del Founder/Lead
- [ ] Entiendo mi doble rol: técnico + priorización de negocio
- [ ] Revisé al menos 3 PRs siguiendo el checklist
- [ ] Tengo acceso a todos los repositorios y ambientes
- [ ] Conozco la arquitectura actual del sistema
- [ ] Participé en Planificación (lunes): prioricé top 10 tareas
- [ ] Aprobé mi primer deploy a Producción (jueves 11:00)
- [ ] Agendé 1:1s con cada miembro del equipo (3 devs, PM, DevOps)

### ✅ PM/Analista
- [ ] Leí la guía completa de PM/Analista
- [ ] Entiendo mi doble rol: escribir User Stories + ejecutar QA
- [ ] Redacté mi primera historia con CA y datos de prueba
- [ ] Tengo acceso a tablero (Trello/Jira) y lo actualizo diariamente
- [ ] Tengo acceso a ambientes DEV, STAGING y PROD
- [ ] Instalé Postman y tengo credenciales de usuarios de prueba
- [ ] Ejecuté CHECKLIST_QA_DEV y smoke test en Staging
- [ ] Participé en planificación (lunes): propuse 5-15 tareas chicas

### ✅ DevOps/Back (SSR)
- [ ] Leí la guía completa de DevOps/Back
- [ ] Tengo acceso SSH a servidores (con keys, no password)
- [ ] Revisé arquitectura: Docker, Nginx Proxy Manager, Portainer
- [ ] Ejecuté deploy manual a Staging (miércoles 11:00)
- [ ] Verifiqué acceso a Sentry (errores) y Uptime Kuma (health)
- [ ] Validé que backups diarios funcionan y probé restore
- [ ] Entiendo procedimiento de rollback
- [ ] Configuré ufw, fail2ban y verifiqué GitHub Secrets

---

## 🔄 Actualización y Mantenimiento

### Frecuencia de Revisión
- **Trimestral**: Revisión general de todas las guías
- **Después de incidentes**: Actualizar procedimientos basados en learnings
- **Nuevas herramientas**: Actualizar cuando se adopten nuevas tecnologías

### Proceso de Actualización
1. Identificar necesidad de cambio (feedback, incidente, nueva herramienta)
2. Crear Issue con label `documentation`
3. Proponer cambios en PR
4. Revisión por al menos 2 personas del rol afectado
5. Merge y comunicar cambios al equipo

### Proponer Mejoras
Si encuentras:
- ❌ Información desactualizada
- ❌ Procedimientos confusos o incompletos
- ❌ Mejores prácticas que no están documentadas
- ✅ Ejemplos que pueden ayudar a otros

**Crea un Issue**:
```markdown
Título: [DOCS] Actualizar procedimiento de X en guía de Y

**Sección afectada**: docs/roles/02_TECH_LEAD.md - Sección 2.3

**Problema**: El procedimiento describe usar herramienta A, pero ahora usamos herramienta B

**Propuesta**: Actualizar a herramienta B con ejemplos

**Beneficio**: Evitar confusión en nuevos Tech Leads
```

---

## 📞 Soporte y Preguntas

### Si tienes dudas sobre tu rol:
1. **Consulta primero la guía** (la respuesta probablemente está ahí)
2. **Pregunta a tu líder directo** (Tech Lead, QA Lead, etc)
3. **Pregunta en Slack** en el canal de tu equipo
4. **Agenda 15 min** con alguien experimentado en ese rol

### Si la guía no cubre tu caso:
1. **Documenta tu situación** (qué estabas tratando de hacer, qué pasó)
2. **Pregunta al equipo** cómo lo han resuelto antes
3. **Una vez resuelto**, propón agregar ese caso a la guía

---

## 📊 Métricas de Adopción

Medimos la efectividad de estas guías con:
- **Tiempo de onboarding**: Días hasta que nuevo miembro es productivo
- **Incidentes**: Reducción de errores por desconocimiento de procesos
- **Consistencia**: Todos siguen los mismos estándares
- **Satisfacción**: Encuestas trimestrales sobre utilidad de las guías

---

## 🚀 Principios Guía

Todas estas guías siguen los principios establecidos por el usuario:

1. **Simplicidad**: Código y procesos simples, profesionales, eficientes
2. **Calidad**: Soluciones óptimas basadas en mejores prácticas
3. **Integridad**: Código mantenible, sin shortcuts ni simulaciones
4. **Profesionalismo**: Estándares altos en todo lo que hacemos
5. **Aprendizaje continuo**: Siempre hay espacio para mejorar

---

## 📖 Documentos Relacionados

- [Manual Operativo Microsyst](../MANUAL_OPERATIVO_MICROSYST.md) - Manual operativo completo (base de estos roles)
- [CI/CD Pipeline](../CICD_PIPELINE_3_SERVICES.md) - Flujo completo de CI/CD para 3 servicios
- [Arquitectura](../ARCHITECTURE.md) - Arquitectura del monorepo
- [Ambientes](../ENVIRONMENTS.md) - Descripción de ambientes (DEV, STAGING, PROD)
- [README Principal](../../README.md) - Información general del proyecto

---

## 🎯 Cadencia Semanal del Equipo (Manual Operativo)

**Sprints semanales** con reuniones clave:

| Día | Hora | Actividad | Participantes | Duración |
|-----|------|-----------|---------------|----------|
| **Lunes** | - | **Planificación** | PM propone 5-15 tareas, Lead prioriza top 10 | 30 min |
| **Diario** | - | **Daily** | Todos: qué haré hoy, bloqueos | 10 min |
| **Miércoles** | 11:00 | **Deploy Staging** | DevOps ejecuta, PM valida smoke+E2E | - |
| **Jueves** | 11:00 | **Deploy Producción** | DevOps ejecuta (si Lead aprueba), PM valida | - |
| **Viernes** | - | **Demo/Cierre** | Todos: entregado, aprendizajes, próximos pasos | 30 min |

**Regla de oro**: Nada llega a **Producción** sin pasar por **Staging** (E2E + smoke OK + 30 min sin errores en Sentry).

---

## 📝 Notas Finales

Estas guías son **documentos vivos**. Evolucionan con el equipo y el proyecto. Tu feedback es valioso para mantenerlas actualizadas y útiles.

**Principios del Manual Operativo Microsyst**:
- ✅ Entregar valor cada semana con cambios pequeños y seguros
- ✅ Staging como red de seguridad (todo pasa por Staging antes de Prod)
- ✅ Automatizar lo que ahorre tiempo (CI/CD, pruebas E2E, backups)
- ✅ Documentación mínima y viva en el repo, sin burocracia

Trabajamos como profesionales, aprendemos continuamente, y compartimos conocimiento generosamente.

---

**Última actualización**: 2025-10-08  
**Alineado con**: Manual Operativo Microsyst (Startup + Staging)  
**Mantenido por**: Founder/Lead + PM/Analista  
**Versión**: 2.0 (actualizado según Manual Operativo)

