# Guía del PM/Analista de Calidad

> **Rol según Manual Operativo Microsyst**: Redacta historias con Criterios de Aceptación y datos de prueba. Mantiene el tablero al día. Ejecuta QA en DEV y smoke/E2E en Staging (con soporte de devs). Escribe/actualiza documentación mínima.

## 1. Características del Rol

### Perfil
- **Responsabilidad**: Garantizar calidad funcional + redactar requerimientos claros + mantener documentación
- **Nivel**: Junior a Semi-Senior
- **Herramientas**: Navegadores, Postman, Jira/Linear/Trello, Playwright, herramientas de testing
- **Conocimientos requeridos**: Testing manual y E2E, redacción de User Stories, Criterios de Aceptación, conceptos de API, documentación técnica básica

### Competencias Clave
- ✅ Pensamiento crítico (encontrar escenarios que rompen el sistema)
- ✅ Atención al detalle (detectar inconsistencias UI/UX)
- ✅ Comunicación clara de bugs (pasos reproducibles)
- ✅ Comprensión de flujos de negocio
- ✅ Conocimientos básicos de SQL (verificar datos en BD)
- ✅ Nociones de testing automatizado E2E (Playwright)
- ✅ Redacción de User Stories y Criterios de Aceptación
- ✅ Gestión de tablero (estados, responsables, fechas)
- ✅ Preparación de datos de prueba

### Responsabilidades Core (Manual Operativo)
1. **Redacción de Historias**: Escribe User Stories con CA claros y datos de prueba
2. **Gestión de Tablero**: Mantiene Trello/Jira actualizado (estados, responsables, fechas)
3. **QA en DEV**: Ejecuta CHECKLIST_QA_DEV (criterios + smoke básico)
4. **QA en Staging**: Smoke/E2E manual + Playwright (3-5 pruebas críticas)
5. **Documentación**: Actualiza README, CHECKLISTS, INCIDENTES cuando corresponde

### Cadencia Semanal
- **Lunes 30min**: Planificación - Propone 5-15 tareas chicas (≤1 día), Lead prioriza
- **Miércoles 11:00**: Valida deploy a Staging (smoke + E2E)
- **Jueves 11:00**: Valida deploy a Producción (si Staging OK)
- **Viernes 30min**: Participa en Demo/Cierre del sprint

---

## 2. Flujo de Trabajo

### 2.1 Preparación para Testing

#### Paso 1: Entender el Requerimiento

**Cuando se te asigna un ticket para testear:**

1. **Lee el Issue completo** en GitHub/Jira
2. **Identifica**:
   - ¿Qué funcionalidad se implementó?
   - ¿Qué problema resuelve?
   - ¿Cuáles son los criterios de aceptación?
   - ¿Qué flujos de usuario afecta?

**Ejemplo de Issue:**
```markdown
## Issue #142: Agregar filtro por fecha en listado de órdenes

### Descripción
Los usuarios necesitan filtrar órdenes por rango de fechas (desde/hasta)

### Criterios de Aceptación
- [ ] Campo "Fecha Desde" y "Fecha Hasta" en el filtro
- [ ] Validación: "Fecha Desde" no puede ser posterior a "Fecha Hasta"
- [ ] Botón "Aplicar Filtro" y "Limpiar Filtros"
- [ ] Resultados se actualizan sin recargar página
- [ ] Mostrar "No hay resultados" si no hay órdenes en ese rango
- [ ] Filtro persiste al navegar a otra página y volver
```

#### Paso 2: Acceder al Ambiente de DEV

**Credenciales y URLs**: Ver `/docs/Accesos a plataforma`

```bash
# Ambientes disponibles
- **DEV**: https://dev.monorepo-bca.com (testing continuo)
- **STAGING**: https://staging.monorepo-bca.com (testing pre-producción)
- **PRODUCCIÓN**: https://monorepo-bca.com (solo smoke tests post-deploy)
```

**Usuarios de prueba**:
```markdown
### SUPERADMIN
- Email: superadmin@monorepo-bca.com
- Password: (ver documento de accesos)

### ADMIN
- Email: admin@monorepo-bca.com
- Password: (ver documento de accesos)

### USER (chofer)
- Email: chofer@monorepo-bca.com
- Password: (ver documento de accesos)

### CLIENTE
- Email: cliente@monorepo-bca.com
- Password: (ver documento de accesos)
```

#### Paso 3: Preparar Casos de Prueba

**Template de caso de prueba:**

```markdown
## Caso de Prueba: CP-142-01

### Título
Filtrar órdenes por rango de fechas válido

### Precondiciones
- Usuario autenticado con rol ADMIN
- Existen al menos 10 órdenes con diferentes fechas

### Pasos
1. Ir a "Órdenes" → "Listado"
2. Click en "Filtros"
3. Ingresar "Fecha Desde": 01/01/2025
4. Ingresar "Fecha Hasta": 31/01/2025
5. Click en "Aplicar Filtro"

### Resultado Esperado
- Se muestran solo órdenes creadas entre 01/01/2025 y 31/01/2025
- Tabla se actualiza sin recargar página
- Indicador de filtro activo visible
- Contador muestra "X resultados"

### Resultado Obtenido
[Completar durante la ejecución]

### Estado
[ ] Pass  [ ] Fail  [ ] Blocked

### Evidencia
[Captura de pantalla o video]
```

**Tipos de casos de prueba a crear:**

1. **Casos Felices** (happy path)
   - Usuario hace todo correctamente
   - Sistema funciona como esperado

2. **Casos de Error** (negative testing)
   - Fecha "Desde" posterior a "Hasta"
   - Campos vacíos
   - Fechas futuras
   - Caracteres especiales en campos de fecha

3. **Casos de Borde** (edge cases)
   - Rango de fechas de 1 día
   - Rango de fechas de 10 años
   - Sin resultados en el rango
   - Miles de resultados en el rango

4. **Casos de Regresión**
   - Otros filtros siguen funcionando
   - Paginación con filtro activo
   - Exportación con filtro activo

---

### 2.2 Ejecución de Pruebas en DEV

#### Paso 4: Testing Funcional

**Checklist general para cualquier feature:**

```markdown
### Funcionalidad
- [ ] La feature hace lo que dice el ticket
- [ ] Todos los criterios de aceptación se cumplen
- [ ] Los flujos principales funcionan correctamente
- [ ] Los flujos alternativos (cancelar, volver) funcionan

### Validaciones
- [ ] Campos requeridos no permiten envío si están vacíos
- [ ] Mensajes de error son claros y útiles
- [ ] Validaciones de formato funcionan (email, teléfono, etc)
- [ ] Límites de caracteres se respetan

### UI/UX
- [ ] Botones tienen labels descriptivos
- [ ] Loading spinners aparecen en operaciones largas
- [ ] Mensajes de éxito/error son visibles
- [ ] Layout no se rompe en pantallas pequeñas
- [ ] No hay elementos superpuestos
- [ ] Colores y tipografía consistentes con el resto de la app

### Navegación
- [ ] Breadcrumbs correctos
- [ ] Botón "Volver" funciona
- [ ] Links llevan a donde dicen
- [ ] Menú de navegación se actualiza correctamente

### Performance
- [ ] Carga inicial < 3 segundos
- [ ] Operaciones (guardar, buscar) < 2 segundos
- [ ] No hay pantallazos blancos
- [ ] Animaciones fluidas

### Datos
- [ ] Datos se guardan correctamente
- [ ] Datos se actualizan en tiempo real (si aplica)
- [ ] Datos persistentes después de recargar página
- [ ] No se pierden datos al navegar y volver
```

#### Paso 5: Testing de APIs (con Postman)

**Para features que exponen APIs:**

1. **Importar colección** (si existe en `/docs/postman/`)
2. **O crear requests manualmente:**

```markdown
## Request: Filtrar Órdenes por Fecha

**Method**: GET
**URL**: https://dev-api.monorepo-bca.com/api/orders

**Headers**:
```
Authorization: Bearer <token_de_dev>
Content-Type: application/json
```

**Query Params**:
```
fechaDesde: 2025-01-01
fechaHasta: 2025-01-31
page: 1
limit: 20
```

**Test Scripts** (en Postman):
```javascript
pm.test("Status code es 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response tiene estructura correcta", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Todas las órdenes están en el rango", function () {
    const jsonData = pm.response.json();
    const desde = new Date('2025-01-01');
    const hasta = new Date('2025-01-31');
    
    jsonData.data.forEach(order => {
        const orderDate = new Date(order.createdAt);
        pm.expect(orderDate >= desde && orderDate <= hasta).to.be.true;
    });
});
```
```

3. **Ejecutar y verificar:**
   - Status code correcto (200, 201, 400, 404, etc)
   - Response tiene estructura esperada
   - Datos son correctos
   - Tiempos de respuesta aceptables

#### Paso 6: Testing de Base de Datos (opcional, para Senior QA)

**Verificar datos directamente en BD:**

```sql
-- Conectar a BD de DEV
-- Ver credenciales en .env del servidor dev

-- Ejemplo: Verificar que filtro funciona correctamente
SELECT id, fecha_creacion, cliente_id, total
FROM orders
WHERE fecha_creacion BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY fecha_creacion DESC;

-- Verificar que no se guardaron datos inválidos
SELECT *
FROM orders
WHERE fecha_creacion IS NULL
   OR cliente_id IS NULL
   OR total < 0;
```

**Cuándo hacer testing de BD:**
- Migraciones de datos
- Imports masivos
- Cálculos complejos (verificar que fórmulas sean correctas)
- Integridad referencial

---

### 2.3 Documentación de Bugs

#### Paso 7: Reportar Bugs Efectivamente

**Anatomía de un buen reporte de bug:**

```markdown
## Bug #234: Filtro de fecha permite seleccionar fecha futura

### Severidad
🔴 Alta | 🟠 Media | 🟡 Baja | 🔵 Cosmética

**Asignada**: 🟠 Media

### Prioridad
🔴 Crítica | 🟠 Alta | 🟡 Media | 🔵 Baja

**Asignada**: 🟡 Media

### Ambiente
- **URL**: https://dev.monorepo-bca.com/orders
- **Navegador**: Chrome 120.0.6099.129 (Linux)
- **Usuario**: admin@monorepo-bca.com
- **Fecha**: 2025-01-15 14:35

### Descripción
El filtro de fecha permite seleccionar fechas futuras, lo que no tiene sentido
de negocio ya que no pueden existir órdenes futuras. El sistema debería limitar
la selección hasta la fecha actual.

### Pasos para Reproducir
1. Login como ADMIN
2. Ir a "Órdenes" → "Listado"
3. Click en "Filtros"
4. Click en campo "Fecha Desde"
5. Seleccionar fecha 01/12/2026 (fecha futura)
6. Click en "Aplicar Filtro"

### Resultado Actual
- El sistema permite seleccionar la fecha futura
- No hay órdenes (correcto, pero no debería permitir la selección)
- No muestra mensaje de error

### Resultado Esperado
- El calendario no debe permitir seleccionar fechas posteriores a HOY
- O, si permite la selección, debe mostrar mensaje:
  "La fecha no puede ser posterior a hoy (DD/MM/YYYY)"

### Impacto
- Usuarios pueden confundirse
- Pierde tiempo seleccionando fechas inválidas
- No hay feedback de por qué no hay resultados

### Evidencia
![Screenshot del bug](https://...)
![Video del flujo](https://...)

### Consola del Navegador (si hay errores)
```
No hay errores en consola
```

### Request/Response (si aplica)
```
GET /api/orders?fechaDesde=2026-12-01&fechaHasta=2026-12-31
Response: {"success": true, "data": []}
```

### Sugerencias de Fix
- Agregar prop `maxDate={new Date()}` al componente DatePicker
- O validar en backend y retornar error 400 con mensaje claro

### Relacionado
- Similar a bug #189 (validación de fechas en formulario de orden)
```

**Matriz de Severidad vs Prioridad:**

| Severidad | Descripción | Prioridad Sugerida |
|-----------|-------------|-------------------|
| 🔴 **Crítica** | Sistema no funciona, pérdida de datos, brecha de seguridad | 🔴 Crítica (hotfix) |
| 🟠 **Alta** | Funcionalidad principal rota, workaround difícil | 🟠 Alta (fix en sprint actual) |
| 🟡 **Media** | Funcionalidad secundaria rota, hay workaround | 🟡 Media (fix en próximo sprint) |
| 🔵 **Baja** | Cosmético, typos, inconsistencias menores | 🔵 Baja (backlog) |

#### Paso 8: Seguimiento de Bugs

**Tu responsabilidad:**

1. **Crear Issue en GitHub** con el template de bug
2. **Asignar labels**: `bug`, `needs-triage`, severidad
3. **Asignar al Tech Lead** para triaje
4. **Notificar en Slack** si es crítico/alto
5. **Verificar fix**: Cuando el desarrollador marque como resuelto, re-testear
6. **Cerrar Issue**: Solo cuando verificaste que está resuelto
7. **Reabrir**: Si el bug persiste o se introdujo regresión

---

### 2.4 Testing en Staging (Pre-Producción)

#### Paso 9: Smoke Tests

**Después de cada deploy a Staging:**

**Tiempo estimado**: 30-45 minutos

**Checklist:**

```markdown
## Smoke Test - Staging - Deploy 2025-01-15

### Autenticación
- [ ] Login con cada rol (SUPERADMIN, ADMIN, USER, CLIENTE)
- [ ] Logout funciona
- [ ] Recuperación de contraseña funciona

### Flujos Críticos (CLIENTE)
- [ ] Ver listado de órdenes
- [ ] Crear nueva orden
- [ ] Ver detalle de orden
- [ ] Cancelar orden
- [ ] Exportar órdenes a CSV

### Flujos Críticos (CHOFER)
- [ ] Ver órdenes asignadas
- [ ] Actualizar estado de orden (en tránsito, entregado)
- [ ] Subir foto de entrega
- [ ] Ver historial de entregas

### Flujos Críticos (ADMIN)
- [ ] Dashboard carga correctamente
- [ ] Crear usuario
- [ ] Asignar roles
- [ ] Ver reportes
- [ ] Configuración general

### Integraciones
- [ ] WhatsApp (enviar mensaje de prueba)
- [ ] Email (verificar inbox de prueba)
- [ ] PDFs se generan correctamente

### Performance
- [ ] Dashboard carga en < 3 segundos
- [ ] Listados con 100+ items son fluidos
- [ ] Sin errores en consola del navegador

### Datos
- [ ] Datos de producción están anonimizados (si aplica)
- [ ] No hay datos de prueba mezclados con reales

### Resultado Final
- [ ] ✅ PASS - Staging listo para producción
- [ ] ❌ FAIL - Bloquear deploy, bugs críticos encontrados
```

**Si encuentras bugs críticos:**
```markdown
🚨 **BLOQUEANTE - No aprobar pase a producción**

Notificar inmediatamente a Tech Lead y DevOps:

"@tech-lead @devops 
SMOKE TEST FAILED - Staging

Bugs críticos encontrados:
1. #345 - Login no funciona para clientes (SEV: Crítica)
2. #346 - PDF de órdenes muestra datos incorrectos (SEV: Alta)

Recomendación: NO DESPLEGAR a producción hasta resolver.

Detalles: [link a bugs]"
```

#### Paso 10: Suite de Regresión Completa

**Antes de deploy a producción (una vez por sprint):**

**Tiempo estimado**: 4-8 horas

1. **Ejecutar todos los casos de prueba documentados**
2. **Verificar features agregadas en últimos 3 sprints**
3. **Probar integraciones con sistemas externos**
4. **Testing cross-browser** (Chrome, Firefox, Safari, Edge)
5. **Testing responsive** (Desktop, Tablet, Mobile)
6. **Testing de carga** (abrir 20+ tabs con sesiones diferentes)

**Documentar resultados:**
```markdown
## Suite de Regresión - Sprint 12 - 2025-01-15

### Resumen
- **Casos ejecutados**: 156
- **Pass**: 148 (95%)
- **Fail**: 5 (3%)
- **Blocked**: 3 (2%)

### Bugs Nuevos Encontrados
1. #347 - Export CSV no funciona con > 1000 registros (SEV: Media)
2. #348 - Botón "Guardar" deshabilitado tras error de validación (SEV: Media)
3. #349 - Tooltip se corta en pantallas < 1280px (SEV: Baja)

### Bugs Bloqueantes
- Ninguno

### Recomendación
✅ **APROBAR** deploy a producción

Los bugs encontrados son de severidad media/baja y no bloquean flujos críticos.
Pueden corregirse en el próximo sprint.

Firma: [Tu nombre] - QA Lead
Fecha: 2025-01-15
```

---

### 2.5 Validación en Producción

#### Paso 11: Post-Deploy Verification

**Inmediatamente después de deploy a producción:**

**Tiempo**: 15-20 minutos

```markdown
## Post-Deploy Checklist - Producción

### Salud del Sistema
- [ ] https://monorepo-bca.com carga correctamente
- [ ] /health endpoint retorna 200
- [ ] Logs de aplicación sin errores críticos
- [ ] Métricas de Sentry/monitoring normales

### Flows Críticos (con DATOS REALES)
⚠️ **IMPORTANTE**: Usar cuenta de prueba, NO cuentas de clientes reales

- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Crear orden (pero NO confirmar, o eliminar después)
- [ ] Ver listado de órdenes
- [ ] WhatsApp funciona (enviar a número de prueba)

### Rollback Plan
Si algo falla:
1. Notificar inmediatamente a @devops y @tech-lead
2. No intentar "arreglar" en producción
3. DevOps ejecutará rollback
4. Documentar el problema para investigación

### Resultado
- [ ] ✅ Deploy exitoso, todo funciona
- [ ] ❌ Problemas detectados, rollback necesario
```

**Si todo está bien:**
```markdown
✅ **Post-Deploy Verification PASS**

Deploy a producción completado exitosamente.
Todas las validaciones pasaron.

Próximos pasos:
- Monitorear durante próximas 2 horas
- Revisar Sentry para errores nuevos
- Estar disponible para reportes de usuarios

Firma: [Tu nombre] - QA
Fecha: 2025-01-15 16:45
```

---

## 3. Herramientas y Recursos

### 3.1 Herramientas Esenciales

#### Navegadores y DevTools
```markdown
**Navegadores a tener instalados:**
- Chrome (principal)
- Firefox
- Edge
- Safari (si tienes Mac)

**DevTools - Atajos útiles:**
- F12: Abrir DevTools
- Ctrl+Shift+C: Inspeccionar elemento
- Ctrl+Shift+M: Toggle responsive mode
- Ctrl+Shift+I: Abrir consola

**Consola - Qué buscar:**
- ❌ Errores rojos: Funcionalidad rota
- ⚠️ Warnings amarillos: Posibles problemas
- 🔵 Info azul: Solo informativo (ignorar)
```

#### Postman
```markdown
**Instalación**:
https://www.postman.com/downloads/

**Colecciones del proyecto**:
Ver `/docs/postman/` para importar

**Conceptos básicos**:
- **Request**: Una llamada a un endpoint
- **Collection**: Grupo de requests relacionados
- **Environment**: Variables (DEV, STAGING, PROD)
- **Tests**: Scripts para validar responses automáticamente

**Variables de ambiente**:
- {{base_url}}: https://dev-api.monorepo-bca.com
- {{token}}: Bearer token de autenticación
- {{userId}}: ID de usuario de prueba
```

#### Herramientas de Captura
```markdown
**Screenshots**:
- Linux: Flameshot, Shutter
- Windows: Snipping Tool, ShareX
- Mac: Cmd+Shift+4

**Videos**:
- OBS Studio (todas las plataformas)
- Loom (extensión de Chrome)
- Kazam (Linux)

**GIFs animados**:
- ScreenToGif (Windows)
- Peek (Linux)
- LICEcap (Mac)

**Tip**: Los videos cortos (10-30 seg) son MUY útiles para bugs complejos
```

### 3.2 Templates y Documentos

#### Template de Plan de Testing
```markdown
# Plan de Testing - Feature: [Nombre]

## Objetivo
Validar que [descripción de feature] funciona correctamente y cumple los
criterios de aceptación del Issue #XXX.

## Alcance

### En Scope
- Funcionalidad principal de [feature]
- Validaciones de entrada
- Mensajes de error
- Integración con [otros módulos]

### Fuera de Scope
- Performance bajo carga extrema (lo hará DevOps)
- Testing automatizado (lo hará el desarrollador)

## Ambientes
- **DEV**: Testing funcional inicial
- **STAGING**: Regresión completa pre-producción

## Datos de Prueba
- 10 usuarios de diferentes roles
- 50 órdenes con diferentes estados
- Casos edge: órdenes sin cliente, órdenes antiguas (> 1 año)

## Casos de Prueba
Ver archivo adjunto: `CP-XXX-feature-name.xlsx`

Total: 23 casos de prueba
- Happy path: 8
- Negative: 10
- Edge cases: 5

## Criterios de Salida
- 100% de casos ejecutados
- 95% de casos PASS
- 0 bugs críticos/altos sin resolver
- Aprobación de Product Owner

## Cronograma
- Día 1-2: Testing funcional en DEV
- Día 3: Retest de bugs corregidos
- Día 4: Smoke test en STAGING
- Día 5: Regresión completa en STAGING

## Riesgos
- Si encontramos bugs críticos en día 4, no habrá tiempo de fix antes del sprint
- Dependencia de datos de producción anonimizados (en progreso)

## Responsable
[Tu nombre] - QA Lead

## Fecha
2025-01-15
```

---

## 4. Comunicación y Reportes

### 4.1 Reportes Diarios (Daily Standup)

**Template**:
```markdown
## QA Update - 2025-01-15

### Ayer
- ✅ Completé testing de Feature #142 (filtro de fechas)
- ✅ Encontré y documenté 3 bugs (1 medio, 2 bajos)
- ✅ Re-testeé bugs #201, #203 (ambos resueltos)

### Hoy
- 🎯 Smoke test de Staging (deploy 14:00)
- 🎯 Continuar suite de regresión (día 2 de 3)
- 🎯 Validar fix de bug #205

### Bloqueantes
- ❌ Bug #199 (crítico) bloquea testing de módulo de pagos
- ⏳ Esperando acceso a ambiente de Staging (pendiente con DevOps)
```

### 4.2 Reporte Semanal

**Template**:
```markdown
# Reporte QA - Semana 2025-W03

## Resumen Ejecutivo
- **Casos ejecutados**: 234
- **Bugs encontrados**: 12 (2 altos, 6 medios, 4 bajos)
- **Bugs resueltos**: 9
- **Bugs pendientes**: 3
- **Regresiones**: 1 (bug #189 reapareció)

## Cobertura de Testing
| Módulo | Casos | Pass | Fail | Cobertura |
|--------|-------|------|------|-----------|
| Autenticación | 15 | 15 | 0 | 100% |
| Órdenes | 45 | 42 | 3 | 93% |
| Usuarios | 30 | 29 | 1 | 97% |
| Reportes | 20 | 18 | 2 | 90% |
| Documentos | 25 | 24 | 1 | 96% |

## Bugs Críticos/Altos Abiertos
1. **#199** - Pago con tarjeta falla en 30% de intentos (CRÍTICO)
   - Impacto: Pérdida de ventas
   - Asignado: @dev-senior
   - ETA: 2025-01-16

2. **#206** - Export de reportes > 5000 filas da timeout (ALTO)
   - Impacto: Usuarios no pueden exportar reportes grandes
   - Asignado: @dev-backend
   - ETA: 2025-01-18

## Métricas de Calidad
- **Escape Rate**: 2% (2 bugs llegaron a staging sin detectar)
- **Reopen Rate**: 8% (1 de 12 bugs debió reabrirse)
- **Avg Time to Test**: 1.2 días (objetivo: < 2 días)

## Riesgos
- ⚠️ Módulo de pagos con alta tasa de bugs (20% de casos fail)
- ⚠️ Falta documentación técnica actualizada

## Recomendaciones
1. Reforzar testing de integración con pasarela de pagos
2. Solicitar actualización de documentación de APIs
3. Implementar testing automatizado de regresión

Preparado por: [Tu nombre]
Fecha: 2025-01-17
```

---

## 5. Checklist de Mejores Prácticas

### Antes de Empezar a Testear
- [ ] Leí y entendí completamente el Issue
- [ ] Identifiqué criterios de aceptación
- [ ] Preparé datos de prueba necesarios
- [ ] Tengo acceso a los ambientes (DEV, STAGING)
- [ ] Identifiqué flujos de regresión que podrían afectarse

### Durante el Testing
- [ ] Testeo con diferentes roles de usuario
- [ ] Pruebo en diferentes navegadores
- [ ] Valido en diferentes resoluciones (responsive)
- [ ] Verifico consola del navegador por errores
- [ ] Tomo screenshots/videos de bugs
- [ ] Anoto pasos exactos para reproducir problemas
- [ ] Verifico que fixes previos no se rompieron (regresión)

### Al Reportar Bugs
- [ ] Título claro y descriptivo
- [ ] Pasos para reproducir son detallados y ordenados
- [ ] Incluyo evidencia (screenshot/video)
- [ ] Especifico ambiente, navegador, usuario
- [ ] Asigno severidad y prioridad apropiadas
- [ ] Sugiero posible causa/fix (si la sé)
- [ ] Verifico que no es bug duplicado

### Al Aprobar Feature
- [ ] Todos los criterios de aceptación se cumplen
- [ ] No hay bugs críticos/altos abiertos
- [ ] Testing de regresión pasó
- [ ] Documenté casos de prueba ejecutados
- [ ] Product Owner revisó y aprobó
- [ ] Actualicé estado en Jira/GitHub

---

## 6. Escenarios Comunes

### Escenario 1: Encontré un Bug Crítico en Producción

```markdown
## Procedimiento de Emergencia

1. **Verificar** (2 minutos):
   - ¿Es realmente crítico? (sistema caído, pérdida de datos, brecha seguridad)
   - ¿Afecta a muchos usuarios?
   - ¿Hay workaround?

2. **Documentar rápidamente** (5 minutos):
   - Pasos mínimos para reproducir
   - Screenshot del error
   - Copiar errores de consola

3. **Notificar INMEDIATAMENTE**:
   - Slack #incidents: "@tech-lead @devops CRITICAL BUG en producción"
   - Crear Issue con label "critical" y "production"
   - Llamar por teléfono si no responden en 5 min

4. **Colaborar**:
   - Quedarte disponible para proveer info adicional
   - Testear hotfix en staging cuando esté listo
   - Validar fix en producción post-deploy

5. **Post-mortem**:
   - Participar en análisis de por qué no se detectó antes
   - Actualizar casos de prueba para cubrir este escenario
```

### Escenario 2: Desarrollador Dice que "Funciona en mi Máquina"

```markdown
## Procedimiento

1. **Recopilar información**:
   - Tu ambiente: OS, navegador, versión
   - Ambiente del dev: OS, Node version, branch

2. **Reproducir juntos** (pair testing):
   - Screen share con el desarrollador
   - Ejecutar pasos exactos mientras él observa
   - Él reproduce en su máquina al mismo tiempo

3. **Identificar diferencia**:
   - ¿Datos diferentes? (él usa datos mock, tú datos reales)
   - ¿Configuración diferente? (.env local vs staging)
   - ¿Versión diferente del código?

4. **Documentar**:
   - Agregar al bug: "Reproducible en DEV (ambiente X), no reproducible en local"
   - Especificar configuración exacta que causa el bug
   - Desarrollador debe testear en DEV antes de dar por resuelto

5. **Prevención**:
   - Solicitar que developers testeen en DEV, no solo local
   - Proponer docker-compose para igualar ambientes
```

### Escenario 3: No Tengo Tiempo de Testear Todo

```markdown
## Priorización Basada en Riesgo

Cuando el tiempo es limitado, prioriza:

### ALTA Prioridad (siempre testear):
- 🔴 Autenticación y autorización
- 🔴 Flujos de dinero/pagos
- 🔴 Creación/modificación de datos críticos
- 🔴 Integraciones con sistemas externos

### MEDIA Prioridad (testear si hay tiempo):
- 🟡 Listados y búsquedas
- 🟡 Exportaciones
- 🟡 Notificaciones
- 🟡 Configuraciones

### BAJA Prioridad (diferir si es necesario):
- 🔵 Tooltips y help text
- 🔵 Ordenamiento de columnas
- 🔵 Features usadas por < 5% usuarios
- 🔵 Ajustes cosméticos

### Estrategia de Smoke Test Rápido (30 min):
1. Login con cada rol (5 min)
2. CRUD de entidad principal (10 min)
3. Integración crítica (WhatsApp, email) (5 min)
4. Verificar consola sin errores (5 min)
5. Navegar por todas las secciones principales (5 min)

**Comunicar riesgo**:
"@tech-lead debido a limitaciones de tiempo, hice smoke test en lugar de
regresión completa. Riesgo: bugs menores pueden pasar a producción.
Recomendación: monitoreo activo post-deploy."
```

---

## 7. Crecimiento Profesional

### 7.1 De QA Manual a QA Automation

**Ruta de aprendizaje**:

```markdown
### Nivel 1: Fundamentos (1-2 meses)
- [ ] JavaScript básico (variables, funciones, arrays, objetos)
- [ ] Introducción a Node.js
- [ ] Git básico (clone, commit, push)
- [ ] Selenium WebDriver conceptos

### Nivel 2: Testing Automatizado (2-3 meses)
- [ ] Playwright o Cypress (elige uno)
- [ ] Escribir tests E2E simples
- [ ] Page Object Model pattern
- [ ] Ejecutar tests en CI/CD

### Nivel 3: Avanzado (3-6 meses)
- [ ] Testing de APIs con Jest + Supertest
- [ ] Testing de performance (K6, Artillery)
- [ ] Testing visual (Percy, Chromatic)
- [ ] Integración de tests en pipeline

### Proyecto Práctico
"Automatiza 10 casos de prueba del módulo de órdenes con Playwright"
```

### 7.2 Skills Complementarios

```markdown
**SQL**:
- Útil para verificar datos directamente en BD
- Detectar inconsistencias que no son visibles en UI
- Curso recomendado: SQLBolt, LeetCode SQL

**APIs y HTTP**:
- Entender requests/responses
- Status codes (200, 404, 500)
- Autenticación (JWT, OAuth)

**Docker básico**:
- Levantar ambientes locales
- Entender containers
- Debugging de servicios

**UX/UI**:
- Principios de usabilidad
- Accesibilidad (WCAG)
- Feedback efectivo sobre UX
```

---

**Recuerda**: Tu rol no es solo "encontrar bugs", es ser el **defensor de la calidad** y la **voz del usuario final**. Piensa como usuario, testea como hacker, reporta como profesional.

