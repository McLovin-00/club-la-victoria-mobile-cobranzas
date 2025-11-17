## Plan detallado: significado y alcance de cada punto

Este documento define, con precisión operativa, el significado, el alcance, los entregables, criterios de aceptación, dependencias y riesgos de cada línea de trabajo necesaria para planificar e implementar la solución empresa–cliente, alineado con lo relevado en `ANALISIS_PRE_IMPLEMENTACION.me`.

### Convenciones
- “Alcance” detalla qué incluye y qué excluye el punto.
- “Criterios de aceptación” son verificables y mapeables a evidencia.
- Se asume stack: React 18 + TypeScript; Node ≥20 + Express; JWT RS256; validación con Zod; ESLint+Prettier; Jest; Docker; CI/CD con gates; observabilidad con métricas y logging estructurado.

## 1. Objetivos y gobernanza
- Propósito: alinear negocio, tecnología y éxito del proyecto.
- Alcance: definición de problema, objetivos, KPIs, SLI/SLO, criterios de Done, cadencia de decisiones.
- Fuera de alcance: diseño técnico profundo (se aborda en puntos específicos).
- Entregables: Statement of Work (SoW), KPIs, SLI/SLO, criterios de éxito, agenda de gobernanza.
- Criterios de aceptación: KPIs cuantificados; SLOs firmados; acta de aprobación por stakeholders.
- Dependencias: disponibilidad de negocio, regulación aplicable.
- Riesgos y mitigación: ambigüedad de objetivos → talleres de descubrimiento y validación escrita.

## 2. Stakeholders, RACI y comunicación
- Propósito: clarificar roles/decisiones y evitar cuellos de botella.
- Alcance: identificación de stakeholders, matriz RACI, rituales y canales.
- Fuera de alcance: gestión contractual/legal.
- Entregables: mapa de stakeholders, RACI, plan de comunicación (rituales y SLAs de respuesta).
- Criterios de aceptación: RACI aprobado; calendario de ceremonias en vigor.
- Dependencias: disponibilidad de áreas (Negocio, Seguridad, QA, DevOps, Datos).
- Riesgos: rotación de responsables → suplencias definidas en RACI.

## 3. Alcance y priorización
- Propósito: reducir riesgo con entregas incrementales de valor.
- Alcance: MVP, fases, supuestos, exclusiones, priorización (impacto/esfuerzo/riesgo).
- Fuera de alcance: estimaciones de ejecución diarias (propias del plan de sprinting).
- Entregables: roadmap por releases, backlog priorizado, documento de supuestos y No-goals.
- Criterios de aceptación: MVP con objetivos medibles; hitos por release y Definition of Done.
- Dependencias: disponibilidad de dependencias externas e integraciones.
- Riesgos: creep de alcance → control de cambios y aprobaciones formales.

## 4. Requisitos funcionales
- Propósito: describir el comportamiento esperado por rol y flujo.
- Alcance: flujos de documentos (subida→clasificación→aprobación), renovación/versionado, ZIP masivo, vencimientos, notificaciones; RBAC y tenant scoping.
- Fuera de alcance: diseño gráfico final (cubierto en UX).
- Entregables: user stories con criterios de aceptación, wireflows por rol, matriz RBAC.
- Criterios de aceptación: historias INVEST, criterios verificables, prototipos/wireflows validados.
- Dependencias: equipos de negocio y compliance.
- Riesgos: requisitos implícitos → sesiones de refinamiento y pruebas de concepto acotadas.

## 5. Requisitos no funcionales
- Propósito: asegurar calidad de servicio.
- Alcance: performance (p95 por flujo), límites operativos (tamaño/tiempo/concurrencia), disponibilidad, resiliencia, escalabilidad, compatibilidad.
- Fuera de alcance: tuning específico de infraestructura (se detalla en DevOps).
- Entregables: NFR spec con presupuestos y límites (“guardrails”).
- Criterios de aceptación: métricas objetivo definidas por endpoint y job; límites en configs.
- Dependencias: monitoreo y APM para medición continua.
- Riesgos: metas no realistas → piloto y benchmark temprano.

## 6. Modelo de dominio y bounded contexts
- Propósito: reducir acoplamiento y hacer explícitas invariantes.
- Alcance: agregados, invariantes, eventos, ownership por servicio; contextos (Documentos, Identidad, Notificaciones, Observabilidad).
- Fuera de alcance: implementación de bajo nivel.
- Entregables: diagrama de dominio, invariantes, catálogo de eventos.
- Criterios de aceptación: invariantes testeables; eventos con contratos claros.
- Dependencias: consenso de equipos consumidores.
- Riesgos: “anémico”/sobre-normalización → revisiones técnicas y ejemplos de uso.

## 7. Contratos de API y errores (contract‑first)
- Propósito: minimizar retrabajo entre equipos.
- Alcance: endpoints, versionado, validación con Zod, idempotencia, paginación/filtros, taxonomía de errores, ejemplos de happy/sad path.
- Fuera de alcance: SDKs cliente (si se requieren, se planifican aparte).
- Entregables: OpenAPI/JSON Schema, ejemplos, tabla de errores estables.
- Criterios de aceptación: validadores generados; contract tests verdes; versiones y deprecaciones documentadas.
- Dependencias: consumidores internos/externos.
- Riesgos: breaking changes → versionado semántico y ventanas de deprecación.

## 8. Diseño de datos, integridad e índices
- Propósito: garantizar consistencia y performance de lectura/escritura.
- Alcance: ERD, FKs/cascadas, unicidades normalizadas, índices calientes, plan de verificación con EXPLAIN/ANALYZE.
- Fuera de alcance: selección de motor no aprobado por arquitectura.
- Entregables: modelo relacional, migraciones, plan de índices.
- Criterios de aceptación: consultas top con planes eficientes; unicidades e invariantes aplicadas.
- Dependencias: carga esperada, patrones de acceso.
- Riesgos: N+1 o consultas sin índice → revisiones y pruebas con datasets realistas.

## 9. Seguridad y cumplimiento
- Propósito: proteger activos y cumplir normativas.
- Alcance: threat model (abuso, IDOR, ZIP bombing, exfiltración, uploads), autenticación JWT RS256, hashing con bcrypt ≥12, rate‑limit, CORS por entorno, secreto por variables, masking de PII.
- Fuera de alcance: auditorías formales de terceros (se coordinan aparte).
- Entregables: threat model, checklist OWASP, configuraciones seguras por entorno.
- Criterios de aceptación: escaneos sin hallazgos críticos; pruebas negativas aprobadas; rate‑limit ejerciendo.
- Dependencias: equipo de seguridad; KMS/secret manager.
- Riesgos: exposición de datos → pruebas de autorización y revisiones de código.

## 10. Arquitectura y componentes
- Propósito: estructurar el sistema para evolución y operabilidad.
- Alcance: servicios (Documentos, Identidad), almacenamiento (S3/MinIO), colas y jobs, caché, cron de vencimientos, generación de ZIP/Excel, feature flags y límites de responsabilidad.
- Fuera de alcance: compra de herramientas no aprobadas.
- Entregables: diagramas C4, ADRs, catálogo de dependencias e interfaces.
- Criterios de aceptación: ADRs consensuadas; prototipos de riesgo alto probados.
- Dependencias: infraestructura y seguridad.
- Riesgos: sobre‑ingeniería → KISS, evitar premature optimization.

## 11. Observabilidad y auditoría
- Propósito: visibilidad y trazabilidad sin PII.
- Alcance: logging estructurado (Winston), traceId, métricas (/health, /metrics Prometheus), KPIs, auditoría de acciones.
- Fuera de alcance: SIEM corporativo (si aplica, se integra con interfaz común).
- Entregables: catálogo de métricas/KPIs, formato de logs, tableros iniciales, esquema de auditoría.
- Criterios de aceptación: métricas expuestas; dashboards con KPIs; auditoría consultable.
- Dependencias: stack de observabilidad y permisos.
- Riesgos: ruido/exceso de logs → muestreo, niveles por entorno, redactado.

## 12. Estrategia de testing y datasets
- Propósito: prevenir regresiones y validar calidad.
- Alcance: unitarias en reglas (aprobación, semáforo, ZIP, notificaciones), contract tests, integración de flujos, E2E por rol; fixtures/seeds realistas.
- Fuera de alcance: pruebas manuales exhaustivas (cubiertas por QA en planes específicos).
- Entregables: pirámide de pruebas, umbrales de cobertura, plan de datos de prueba.
- Criterios de aceptación: cobertura mínima por módulo; contratos verificados; E2E críticos verdes.
- Dependencias: entornos y datos de prueba.
- Riesgos: datos frágiles → fixtures aislados y repetibles; mocks de dependencias.

## 13. Calidad de código y Developer Experience
- Propósito: mantenibilidad y consistencia entre equipos.
- Alcance: TypeScript strict, ESLint+Prettier, styleguides, Conventional Commits, ganchos pre‑commit, guía de contribución.
- Fuera de alcance: imposición de IDEs.
- Entregables: configs de lint/format, husky (si aplica), CONTRIBUTING.md.
- Criterios de aceptación: pipeline de lint/format sin warnings; convenciones aplicadas.
- Dependencias: CI y repositorios.
- Riesgos: desviaciones → templates y validación en CI.

## 14. DevOps y CI/CD
- Propósito: entrega confiable y repetible.
- Alcance: Dockerfiles y docker‑compose, healthchecks/readiness, pipeline con gates (lint, typecheck, tests, cobertura, build, seguridad, deploy), PM2 en prod, manejo de variables y secretos.
- Fuera de alcance: costos cloud (cubiertos en Costos).
- Entregables: pipelines y artefactos versionados, checklist de release.
- Criterios de aceptación: pipeline verde; despliegue reproducible; rollback probado.
- Dependencias: infraestructura, registro de contenedores, secreto manager.
- Riesgos: fallas en gates → bloqueo hasta corregir; no se omiten.

## 15. UX y accesibilidad
- Propósito: usabilidad efectiva para cada rol.
- Alcance: wireframes/wireflows, estados vacíos/errores, ARIA y contraste, mobile‑first.
- Fuera de alcance: diseño visual final pixel‑perfect (si aplica, se planifica).
- Entregables: prototipos navegables, checklist de accesibilidad, guías de contenido.
- Criterios de aceptación: tareas clave completables; AA de accesibilidad en pantallas críticas.
- Dependencias: research con usuarios y negocio.
- Riesgos: deuda de accesibilidad → controles nativos y revisión temprana.

## 16. Lifecycle de datos y retención
- Propósito: cumplir normativas y minimizar exposición.
- Alcance: ciclo de documentos (vigencia→renovación→deprecación→archivo/purga), políticas de retención DB/S3, minimización de PII.
- Fuera de alcance: gobernanza de datos corporativa global.
- Entregables: políticas de retención y lifecycle rules, tabla de retención por entidad.
- Criterios de aceptación: reglas aplicadas y verificadas en entornos; evidencias de purga/archivo.
- Dependencias: legal/compliance y almacenamiento.
- Riesgos: retenciones excesivas → revisión legal y automatización reversible.

## 17. Backups, restore y continuidad (DR)
- Propósito: asegurar RPO/RTO acordados.
- Alcance: backups full+incrementales, pruebas periódicas de restore, runbooks, monitoreo y alertas.
- Fuera de alcance: DR multi‑región si no está en alcance empresarial.
- Entregables: runbooks, evidencias de restore, políticas y alertas.
- Criterios de aceptación: restauración dentro de RTO; integridad validada; alertas efectivas.
- Dependencias: infraestructura/DBA.
- Riesgos: backups corruptos → validación periódica e informes.

## 18. Costos y capacidad
- Propósito: sostenibilidad económica.
- Alcance: estimaciones de almacenamiento/transferencia/procesamiento, límites y alertas de costos, optimizaciones (caché, compresión, lifecycle).
- Fuera de alcance: contratos de compra.
- Entregables: modelo de costos, presupuestos y límites, plan de optimización.
- Criterios de aceptación: alertas configuradas; costos dentro de presupuesto en pruebas.
- Dependencias: finanzas/infraestructura.
- Riesgos: subestimación → márgenes de seguridad y medición temprana.

## 19. Gestión de riesgos y compliance
- Propósito: visibilidad temprana y controlados.
- Alcance: registro de riesgos, severidad y dueños, mitigaciones, revisiones periódicas; cumplimiento normativo aplicable.
- Fuera de alcance: certificaciones externas (se tratan aparte).
- Entregables: risk register, plan de mitigación, calendario de revisión.
- Criterios de aceptación: sin riesgos críticos sin plan; evidencias de revisión.
- Dependencias: seguridad/legal.
- Riesgos: “unknown unknowns” → spikes y canary releases.

## 20. Plan de entregas y estrategia de despliegue
- Propósito: liberar valor con seguridad.
- Alcance: dark launch/feature flags, canary, rollback/roll‑forward, migraciones reversibles con backup previo, ventanas de mantenimiento.
- Fuera de alcance: cambios de infraestructura globales.
- Entregables: plan de release, plan de reversión, checklist Go/No‑Go.
- Criterios de aceptación: simulacro de rollback; flags gobernados; migraciones con plan back/forward.
- Dependencias: DevOps, negocio para ventanas.
- Riesgos: downtime prolongado → pruebas en staging con datasets realistas.

## 21. Adopción, capacitación y soporte
- Propósito: asegurar uso efectivo y satisfacción.
- Alcance: manuales, entrenamientos por rol, SLAs de soporte, catálogo de solicitudes, feedback loop.
- Fuera de alcance: BPO/mesa de ayuda externa.
- Entregables: manuales/FAQs, plan de formación, catálogo de soporte.
- Criterios de aceptación: sesiones realizadas; NPS/satisfacción mínima; tiempos de respuesta medidos.
- Dependencias: áreas de operaciones y comunicaciones.
- Riesgos: baja adopción → champions y comunicación dirigida.

## 22. Documentación y trazabilidad
- Propósito: memoria técnica y auditabilidad.
- Alcance: README, ADRs, API docs, runbooks, CHANGELOG, registro de decisiones y cambios.
- Fuera de alcance: documentación comercial/marketing.
- Entregables: repositorio de documentación versionado y actualizado.
- Criterios de aceptación: ADRs por decisiones clave; CHANGELOG por release; docs enlazadas desde CI.
- Dependencias: disciplina de PRs y CI.
- Riesgos: desactualización → verificación en pipeline y dueños por documento.

## 23. Criterios de “listo para implementar”
- Propósito: gate objetivo para iniciar construcción.
- Alcance: contratos cerrados, reglas del semáforo definidas y testeables, RBAC aclarado, presupuestos p95 acordados, plan de pruebas/observabilidad listo, riesgos priorizados con reversión.
- Fuera de alcance: aprobación de presupuesto (ya definido en Costos).
- Entregables: checklist de readiness firmada por stakeholders.
- Criterios de aceptación: checklist completa sin excepciones abiertas.
- Dependencias: aprobaciones de negocio, seguridad y arquitectura.
- Riesgos: iniciar sin criterios → congelar build hasta cumplir checklist.

---

Referencias: ver `ANALISIS_PRE_IMPLEMENTACION.me` para el contexto de dominio, flujos, contratos y presupuestos definidos.
*** End Patch

