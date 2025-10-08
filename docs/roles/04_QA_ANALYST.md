# QA Analyst (Analista de Calidad)

> **Última actualización**: 8 Octubre 2025  
> **Rol**: Aseguramiento de calidad y testing  
> **Dedicación**: 40-100% (según tamaño del equipo)  
> **Reporta a**: Tech Lead (técnico) y PM (funcional)

---

## 🎯 Visión General

El QA Analyst es responsable de **asegurar la calidad** del software antes de que llegue a usuarios. Valida que las features cumplen los Criterios de Aceptación, encuentra bugs antes de producción, y mantiene la suite de tests automatizados.

**Separación clave**: PM define "qué construir". QA valida "qué tan bien funciona".

---

## 👤 Perfil

### Requisitos
- **Experiencia**: 1-3 años en testing de software (puede ser Junior)
- **Skills técnicas**: Testing manual, testing de APIs, E2E automation (Playwright)
- **Skills analíticas**: Atención al detalle, pensamiento crítico, capacidad de reproducir bugs
- **Metodologías**: Agile/Scrum, testing ágil, shift-left testing
- **Herramientas**: Navegadores, DevTools, Postman, Playwright, Jira/Linear

### Nivel
- **Junior-Mid**: Ejecuta testing con supervisión inicial, luego autonomía
- **Crecimiento**: Puede evolucionar a QA Lead o QA Automation Engineer

---

## 📋 Responsabilidades ÚNICAS (No Delegables)

### R1: Testing Funcional en DEV

#### Ejecución de Checklist QA_DEV
- Para cada feature completada (PR mergeado), ejecutar `CHECKLIST_QA_DEV.md`
- Validar **todos** los Criterios de Aceptación definidos por PM
- Testear flujo completo end-to-end (no solo "happy path")
- Testear casos edge (límites, errores, datos vacíos, etc)

#### Testing Exploratorio
- Más allá de los CA, explorar la feature buscando bugs no especificados
- Probar interacciones con otras features existentes (regresión)
- Probar en diferentes navegadores (Chrome, Firefox, Safari, Edge)
- Probar en diferentes tamaños de pantalla (responsive)

#### Reporte de Bugs
- Documentar bugs con:
  - **Título claro**: "Al crear usuario sin email, sistema crashea"
  - **Pasos para reproducir**: 1, 2, 3, ... (detallados)
  - **Resultado esperado**: "Debería mostrar error 'Email requerido'"
  - **Resultado actual**: "Página blanca, error 500 en consola"
  - **Evidencia**: Screenshot, video (Loom), logs de consola
  - **Severidad**: Crítico / Alto / Medio / Bajo
  - **Prioridad**: P0 / P1 / P2 / P3 (coordinado con PM)
- Etiquetar bug con label `qa` en Jira/Linear
- Asignar a desarrollador correspondiente

---

### R2: Testing en Staging (Pre-Producción)

#### Smoke Testing (Miércoles 11:30, post-deploy)
- **Objetivo**: Verificar que lo básico funciona (no es testing exhaustivo)
- **Duración**: 15-30 minutos
- **Qué testear**: Flujo crítico del sistema
  - Login/Logout
  - Navegación principal
  - 1-2 flujos core (ej: crear documento, asignar tarea)
- **Criterio de éxito**: Si smoke test pasa → OK para seguir. Si falla → rollback inmediato.

#### Suite de Regresión
- **Objetivo**: Asegurar que features viejas siguen funcionando
- **Casos de prueba**: Documentados en wiki de QA (Notion/Confluence)
- **Frecuencia**: Semanal (post-deploy staging) o antes de deploy a producción
- **Duración**: 1-2 horas (depende de tamaño del sistema)

#### Testing Cross-Browser y Responsive
- **Navegadores**: Chrome, Firefox, Safari, Edge (mínimo)
- **Dispositivos**: Desktop, Tablet, Mobile
- **Herramientas**: BrowserStack (si hay presupuesto) o navegadores locales

#### Validación de Integraciones
- Si hay integraciones con sistemas externos (APIs de terceros), validar:
  - ¿La integración funciona?
  - ¿Manejo de errores (timeout, API caída, datos inválidos)?

---

### R3: Automatización de Testing (E2E)

#### Suite de Playwright (3-5 Pruebas Críticas)
- **Objetivo**: Automatizar los 3-5 flujos más críticos del sistema
- **Ejemplos de pruebas**:
  1. Login completo (username/password → dashboard)
  2. Crear y subir documento completo
  3. Asignar tarea a usuario y validar notificación
  4. Flujo de pago (si aplica)
  5. Logout y validar sesión cerrada
- **Ubicación**: `apps/frontend/tests/e2e/` (Playwright)

#### Ejecución Post-Deploy Staging
- **Cuándo**: Automáticamente en CI (GitHub Actions) post-deploy staging
- **Si falla**: Alertar inmediatamente a equipo (Slack)
- **Si pasa**: OK para continuar a producción

#### Expansión Progresiva
- **Meta**: Agregar 1 prueba E2E nueva por sprint
- **Prioridad**: Flujos que se rompen frecuentemente o son muy críticos

#### Mantenimiento de Tests
- **Flaky tests**: Si un test falla intermitentemente, investigar y estabilizar
- **Tests obsoletos**: Si una feature se depreca, eliminar su test
- **Actualización**: Si UI cambia, actualizar selectores en tests

---

### R4: Gestión de Bugs

#### Triage Inicial
- Para cada bug encontrado, hacer triage inicial:
  - **Severidad**:
    - **Crítico**: Sistema no funciona, pérdida de datos, seguridad
    - **Alto**: Feature principal no funciona, workaround difícil
    - **Medio**: Feature secundaria no funciona, hay workaround
    - **Bajo**: Issue cosmético, typo, mejora de UX
  - **Prioridad** (sugerencia, decisión final es PM + Tech Lead):
    - **P0**: Fix inmediato (blocker para deploy)
    - **P1**: Fix en este sprint
    - **P2**: Fix en próximo sprint
    - **P3**: Backlog (fix cuando haya tiempo)

#### Re-Testing de Bugs Resueltos
- Cuando dev marca bug como "Resuelto", QA debe:
  - Verificar que el bug ya no existe
  - Testear casos relacionados (regresión)
  - Cerrar bug si está OK, o reabrir con comentarios si persiste

#### Registro de Bugs Recurrentes
- Si el mismo tipo de bug aparece repetidamente, documentar el patrón
- Reportar a Tech Lead para identificar root cause (ej: falta de validación, problema de arquitectura)

---

### R5: Documentación de Calidad

#### Casos de Prueba
- Documentar casos de prueba estándar (formato tabular):
  | ID | Título | Precondición | Pasos | Resultado Esperado |
  |----|--------|--------------|-------|-------------------|
  | TC-001 | Login exitoso | Usuario creado | 1. Ir a /login<br>2. Ingresar user/pass<br>3. Click "Login" | Dashboard visible |
  | TC-002 | Login fallido | - | 1. Ir a /login<br>2. Ingresar pass incorrecta<br>3. Click "Login" | Error "Credenciales inválidas" |
- **Ubicación**: Wiki de QA (Notion/Confluence)

#### Checklists
- Mantener `CHECKLIST_QA_DEV.md` y `CHECKLIST_STAGING.md` actualizados
- Si cambia un flujo crítico, actualizar checklist

#### Registro de Incidentes
- Cuando hay incidente en producción, QA documenta en `INCIDENTES.md`:
  - ¿Qué falló?
  - ¿Por qué no lo detectamos en testing?
  - ¿Qué haremos para evitarlo en el futuro? (mejora de proceso)

---

### R6: Preparación de Datos de Prueba

#### Datasets de Prueba
- Crear y mantener usuarios/datos de prueba para cada ambiente:
  - **DEV**: `test-user-1@example.com`, `test-admin@example.com`, etc.
  - **Staging**: Igual que DEV
  - **Producción**: NO usar datos de prueba (solo real users)
- Documentar credenciales en 1Password/Bitwarden

#### Seeds de Base de Datos
- Coordinar con devs para crear seeds (datos iniciales de BD)
- Ejemplos: usuarios de prueba, documentos ejemplo, configuración base

#### Anonimización de Datos en Staging
- Si staging usa copia de BD de producción, validar que datos sensibles están anonimizados
- Coordinar con DevOps/Back

---

## ❌ Funciones que NO Debe Hacer (Delegar)

### ❌ Definir Criterios de Aceptación
- **Por qué**: Eso es responsabilidad del PM
- **Qué SÍ hace QA**: Validar que los CA son verificables y claros (feedback al PM)

### ❌ Decidir Prioridades de Bugs (Decisión Final)
- **Por qué**: Decisión final es PM + Tech Lead
- **Qué SÍ hace QA**: Hacer triage inicial (severidad y sugerencia de prioridad)

### ❌ Code Review
- **Por qué**: Eso es responsabilidad de Tech Lead / Desarrolladores
- **Qué SÍ hace QA**: Testear que el código funciona como se espera

### ❌ Ejecutar Deploys
- **Por qué**: Eso es responsabilidad de DevOps
- **Qué SÍ hace QA**: Dar OK para deploy (smoke test pasó, sin bugs P0)

---

## 📅 Cadencia Semanal

### Lunes
- **9:30-10:00**: Planificación de testing del sprint
  - Revisar features a testear esta semana
  - Estimar tiempo de testing por feature
  - Coordinar con PM y Tech Lead

### Diario (Martes a Jueves)
- **9:00-17:00**: Testing continuo en DEV
  - Por cada PR mergeado, testear feature
  - Reportar bugs inmediatamente
  - Re-testear bugs resueltos

### Miércoles
- **11:30-12:00**: Smoke test + E2E en Staging (post-deploy)
  - Ejecutar smoke test manual
  - Revisar resultado de E2E automatizado (CI)
  - Dar OK o reportar blockers

### Jueves
- **11:30-12:00**: Smoke test rápido en Producción (post-deploy)
  - Validar que deploy fue exitoso
  - Verificar flujo crítico funciona
  - Monitorear primeras horas post-deploy

### Viernes
- **16:00-16:30**: Reporte de calidad del sprint
  - ¿Cuántas features testeadas?
  - ¿Cuántos bugs encontrados? (por severidad)
  - ¿Bugs pendientes de re-testing?
  - ¿Mejoras propuestas para próximo sprint?

### Semanal (Viernes o Lunes)
- **2 horas**: Mantenimiento de tests automatizados
  - Agregar 1 prueba E2E nueva
  - Fix flaky tests
  - Actualizar tests obsoletos

---

## 📊 KPIs y Métricas de Éxito

### KPIs del Rol

| KPI | Target | Medición |
|-----|--------|----------|
| Bugs en DEV vs Staging vs Prod | 70% / 25% / 5% | Tracking en Jira/Linear |
| Cobertura de casos de prueba | ≥ 80% de features | Documentación de casos |
| Flaky tests en E2E | < 10% | CI metrics |
| Tiempo de testing por feature | < 2h | Tracking manual |
| Escape rate (bugs en prod) | < 5% | Post-mortems |

### Métricas de Calidad

- **Bug Detection Rate**: ¿Cuántos bugs encuentra QA vs cuántos llegan a prod?
- **Bug Reopen Rate**: ¿Cuántos bugs se reabren? (objetivo: < 10%)
- **Test Coverage**: ¿Qué % de features tiene casos de prueba documentados?

---

## 🛠️ Herramientas

### Testing Manual
- **Navegadores**: Chrome, Firefox, Safari, Edge
- **DevTools**: Inspector, Console, Network tab
- **Loom**: Grabar videos de bugs
- **Snagit / Greenshot**: Screenshots anotados

### Testing de APIs
- **Postman**: Testing de endpoints REST
- **cURL**: Testing rápido desde terminal
- **Insomnia**: Alternativa a Postman

### Testing Automatizado
- **Playwright**: E2E tests para web
- **Jest**: Tests unitarios (si QA contribuye)

### Gestión de Bugs
- **Jira / Linear**: Tracking de bugs
- **Notion / Confluence**: Documentación de casos de prueba

### Ambientes
- **DEV**: http://localhost:8550 (local)
- **Staging**: https://staging.example.com
- **Producción**: https://example.com

---

## 🚀 Escenarios de Dedicación

### Escenario 1: QA 40% / PM 60% (Equipo Pequeño)
- **Contexto**: Equipo de 3-5 devs, misma persona hace PM y QA
- **QA (40%)**: 16h/semana
  - Testing diario en DEV: 8h
  - Smoke staging: 1h
  - Smoke prod: 1h
  - Mantenimiento E2E: 2h
  - Documentación: 2h
  - Reporte semanal: 1h

### Escenario 2: QA 100% (Equipo Mediano/Grande)
- **Contexto**: Equipo de 6+ devs, QA dedicado full time
- **QA (100%)**: 40h/semana
  - Testing en DEV: 20h
  - Suite de regresión: 5h
  - Smoke staging/prod: 3h
  - Automatización E2E: 6h
  - Documentación de casos: 3h
  - Reuniones y coordinación: 3h

---

## 📈 Path de Crecimiento

### QA Junior → QA Mid (1-2 años)
- Aprende testing manual exhaustivo
- Aprende testing de APIs (Postman)
- Aprende E2E básico (Playwright)
- Autonomía en triage de bugs

### QA Mid → QA Senior (2-3 años)
- Domina Playwright (tests complejos, mantenimiento)
- Implementa estrategia de testing (qué testear, qué automatizar)
- Mentoriza a QA Junior

### QA Senior → QA Lead / QA Automation Engineer
- Lidera equipo de QA (si crece)
- Define infraestructura de testing (CI/CD, parallelization)
- Implementa testing de performance, seguridad

---

## 📚 Recursos Recomendados

### Libros
- **"Agile Testing"** de Lisa Crispin y Janet Gregory
- **"Lessons Learned in Software Testing"** de Cem Kaner
- **"The Art of Software Testing"** de Glenford Myers

### Cursos
- **ISTQB Foundation Level**: Certificación de testing
- **Udemy**: Cursos de Playwright, Postman, testing
- **Test Automation University**: Cursos gratis de Applitools

### Comunidades
- **Ministry of Testing**: Comunidad global de testers
- **r/QualityAssurance**: Subreddit activo
- **Software Testing Help**: Blog y tutoriales

---

## 🤝 Colaboración con Otros Roles

### Con PM
- **Revisión de CA**: Validar que son claros y verificables
- **Triage de bugs**: Decidir prioridades
- **UAT**: Coordinar testing en staging

### Con Tech Lead
- **Bugs técnicos**: Explicar cómo reproducir bugs complejos
- **E2E**: Coordinar mantenimiento de tests automatizados
- **Mejoras de calidad**: Proponer mejoras de proceso

### Con Desarrolladores
- **Reporte de bugs**: Proveer detalles claros para fix rápido
- **Re-testing**: Validar fixes
- **Pair testing**: Hacer testing colaborativo en features complejas

### Con DevOps
- **CI/CD**: Integrar E2E en pipeline
- **Ambientes**: Validar que staging replica producción
- **Incidentes**: Documentar post-mortems

---

## 🎓 Checklist de Onboarding (Primer Mes)

### Semana 1: Contexto
- [ ] Entender arquitectura del sistema (Backend, Frontend, Documentos)
- [ ] Acceso a ambientes (DEV, Staging, Producción)
- [ ] Acceso a herramientas (Jira, Postman, Playwright)
- [ ] Credenciales de usuarios de prueba (1Password)

### Semana 2: Inmersión
- [ ] Observar testing de sprint actual (shadow QA existente o PM)
- [ ] Revisar casos de prueba existentes
- [ ] Ejecutar smoke test en staging (con supervisión)
- [ ] Reportar primeros bugs

### Semana 3: Práctica
- [ ] Testear 3-5 features en DEV de forma autónoma
- [ ] Ejecutar smoke test en staging sin supervisión
- [ ] Escribir primeros casos de prueba

### Semana 4: Automatización
- [ ] Configurar Playwright local
- [ ] Ejecutar E2E existentes
- [ ] Contribuir a primer test E2E nuevo (con ayuda)

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 2.0 (Atomizada - QA separado de PM)  
**Mantenido por**: Tech Lead + QA Lead

