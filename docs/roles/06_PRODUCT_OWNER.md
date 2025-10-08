# Guía del Product Owner / Stakeholder

## 1. Características del Rol

### Perfil
- **Responsabilidad**: Definir qué se construye, priorizar el backlog, asegurar valor de negocio
- **Nivel**: Mid a Senior (conocimiento profundo del negocio)
- **Autoridad**: Decisión final sobre features, priorización del roadmap, aprobación de releases
- **Alcance**: Visión de producto, requerimientos, aceptación de entregables

### Competencias Clave
- ✅ Conocimiento profundo del negocio y usuarios finales
- ✅ Capacidad de traducir necesidades de negocio a requerimientos técnicos
- ✅ Priorización basada en ROI (Return on Investment)
- ✅ Comunicación efectiva con stakeholders técnicos y no técnicos
- ✅ Gestión de expectativas
- ✅ Toma de decisiones bajo incertidumbre
- ✅ Nociones básicas de metodologías ágiles (Scrum, Kanban)

---

## 2. Responsabilidades Principales

### 2.1 Definición de Requerimientos

#### Paso 1: Identificar Necesidad

**Fuentes de necesidades**:
- 📋 Feedback de usuarios (encuestas, entrevistas, soporte)
- 📊 Análisis de métricas (¿dónde se atascan los usuarios?)
- 💡 Visión estratégica del negocio
- 🐛 Bugs o limitaciones actuales
- 🔄 Competencia (¿qué hacen otros?)
- ⚖️ Regulaciones o compliance

**Preguntas clave**:
```markdown
### Validación de Necesidad

1. **¿Qué problema estamos resolviendo?**
   - Descripción clara del pain point
   - ¿Cuántos usuarios afecta? (1, 10, 100, 1000+)
   - ¿Cuál es el costo actual de NO tener esto?

2. **¿Para quién lo estamos resolviendo?**
   - Persona/rol específico (chofer, cliente, admin)
   - ¿Es un user frecuente o esporádico?
   - ¿Cuál es su nivel de expertise técnico?

3. **¿Cuál es el valor esperado?**
   - Reducción de tiempo/costos
   - Aumento de ventas/conversión
   - Mejora en satisfacción del usuario
   - Cumplimiento regulatorio

4. **¿Hay alternativas?**
   - ¿Cómo lo resuelven hoy? (workaround)
   - ¿Podemos mejorar el proceso existente?
   - ¿Es necesario construir o podemos comprar/integrar?

5. **¿Cuál es la urgencia?**
   - ¿Puede esperar al próximo sprint?
   - ¿Es crítico para el negocio?
   - ¿Hay deadline externo (legal, contractual)?
```

#### Paso 2: Escribir User Story

**Formato estándar**:

```markdown
## User Story: [Título Descriptivo]

### Como [rol de usuario]
### Quiero [acción/funcionalidad]
### Para [beneficio/valor de negocio]

**Ejemplo**:
Como **cliente**
Quiero **filtrar mis órdenes por rango de fechas**
Para **encontrar rápidamente órdenes de un período específico sin scroll infinito**

---

### Contexto
Los clientes que tienen > 50 órdenes reportan que es difícil encontrar órdenes
antiguas. Actualmente deben hacer scroll o usar búsqueda por ID (que no siempre recuerdan).

Esto genera:
- ~15 tickets de soporte por semana
- Frustración de usuarios (NPS bajó de 8.5 a 7.2 en último trimestre)
- Pérdida de tiempo (5 min promedio para encontrar una orden)

---

### Criterios de Aceptación

#### Funcionales
- [ ] Existe un campo "Fecha Desde" (date picker)
- [ ] Existe un campo "Fecha Hasta" (date picker)
- [ ] Validación: "Fecha Desde" no puede ser posterior a "Fecha Hasta"
- [ ] Validación: No se pueden seleccionar fechas futuras
- [ ] Botón "Aplicar Filtro" ejecuta búsqueda
- [ ] Botón "Limpiar Filtros" resetea fechas y muestra todas las órdenes
- [ ] Resultados se actualizan sin recargar página completa
- [ ] Si no hay resultados, mostrar mensaje: "No hay órdenes en este rango de fechas"
- [ ] Filtro persiste al navegar a detalle de orden y volver al listado
- [ ] Compatible con otros filtros (estado, cliente, etc)

#### No Funcionales
- [ ] Búsqueda debe completarse en < 2 segundos (con hasta 10,000 órdenes)
- [ ] Funciona en Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- [ ] Responsive (funciona en mobile, tablet, desktop)
- [ ] Accesible (teclado navegable, lectores de pantalla)
- [ ] Logs de búsquedas para analytics

---

### Fuera de Alcance (Out of Scope)
- ❌ Exportar resultados filtrados a PDF (será Issue separado)
- ❌ Búsqueda avanzada (múltiples rangos, wildcards)
- ❌ Filtros guardados/favoritos
- ❌ Integración con calendario externo

---

### Diseño / Mockups
[Adjuntar diseño en Figma, screenshot o wireframe]

---

### Casos de Uso

#### Caso 1: Usuario busca órdenes de Enero 2025
1. Usuario va a "Mis Órdenes"
2. Click en "Filtros"
3. Selecciona "Fecha Desde": 01/01/2025
4. Selecciona "Fecha Hasta": 31/01/2025
5. Click en "Aplicar"
6. Sistema muestra 12 órdenes de Enero
7. Usuario ve la orden que buscaba (ID 1234)

#### Caso 2: Usuario intenta buscar con fechas inválidas
1. Usuario va a "Mis Órdenes"
2. Click en "Filtros"
3. Selecciona "Fecha Desde": 31/01/2025
4. Selecciona "Fecha Hasta": 01/01/2025 (anterior a "Desde")
5. Click en "Aplicar"
6. Sistema muestra error: "La fecha Hasta no puede ser anterior a la fecha Desde"
7. Botón "Aplicar" permanece deshabilitado hasta corregir

---

### Prioridad
🔴 Alta - Afecta a 60% de usuarios activos

### Estimación
TBD (a definir por equipo técnico en refinamiento)

### Dependencias
- Ninguna (feature independiente)

### Métricas de Éxito
- Reducción de 80% en tickets de soporte relacionados a "no encuentro mi orden"
- Aumento de NPS a > 8.0
- 50%+ de usuarios con > 20 órdenes usan el filtro en primer mes

---

### Notas Técnicas (completar con Tech Lead)
- API endpoint: GET /api/orders?fechaDesde=&fechaHasta=
- Índice en BD en campo `created_at` requerido
- Caché de resultados durante 5 minutos
```

#### Paso 3: Refinamiento con Equipo Técnico

**Reunión de Refinamiento** (1 hora, semanal):

**Agenda**:
```markdown
1. **Presentación de User Story** (10 min)
   - PO presenta el contexto y necesidad
   - Muestra diseño/mockups
   - Explica criterios de aceptación

2. **Preguntas y Clarificaciones** (20 min)
   - Equipo hace preguntas
   - Se identifican ambigüedades
   - Se definen edge cases

3. **Estimación** (20 min)
   - Equipo estima complejidad (Fibonacci: 1, 2, 3, 5, 8, 13)
   - Planning Poker o votación
   - Consenso o discusión si hay diferencias grandes

4. **División de Tareas** (10 min)
   - Si es muy grande (> 8 puntos), dividir en sub-tareas
   - Identificar dependencias técnicas
   - Asignar a sprint actual o backlog
```

**Salida de la reunión**:
- ✅ Story refinada y clara
- ✅ Estimación acordada
- ✅ Ready para incluir en sprint planning

---

### 2.2 Priorización del Backlog

#### Matriz de Priorización

**Modelo: Valor vs Esfuerzo**

```
Alto │  3. Revisar     │  1. HACER YA    │
Valor│     después     │     (Quick Wins)│
     │─────────────────┼─────────────────│
     │  4. Eliminar    │  2. Planificar  │
Bajo │     (No hacer)  │     (Largo plazo│
     └─────────────────┴─────────────────┘
       Bajo          Alto
            Esfuerzo
```

**Ejemplo práctico**:

```markdown
### Cuadrante 1: HACER YA (Alto Valor, Bajo Esfuerzo)
- ✅ Filtro de fechas en órdenes (8 puntos, 60% usuarios)
- ✅ Exportar órdenes a CSV (5 puntos, 40% usuarios)
- ✅ Notificaciones push (3 puntos, 80% usuarios)

### Cuadrante 2: PLANIFICAR (Alto Valor, Alto Esfuerzo)
- 🟡 Sistema de pagos integrado (34 puntos, 100% usuarios)
- 🟡 App móvil nativa (55 puntos, 70% usuarios)
- 🟡 Inteligencia artificial para matching (21 puntos, 50% usuarios)

### Cuadrante 3: REVISAR (Bajo Valor, Bajo Esfuerzo)
- 🔵 Dark mode (5 puntos, 10% usuarios)
- 🔵 Personalización de colores (3 puntos, 5% usuarios)

### Cuadrante 4: ELIMINAR (Bajo Valor, Alto Esfuerzo)
- ❌ Chat interno (13 puntos, 2% usuarios, WhatsApp funciona bien)
- ❌ Editor de documentos en línea (21 puntos, 1% usuarios)
```

#### Criterios de Priorización

**RICE Score** (Reach, Impact, Confidence, Effort):

```
RICE Score = (Reach × Impact × Confidence) / Effort

- Reach: ¿Cuántos usuarios afecta por trimestre?
- Impact: ¿Cuánto mejora su experiencia? (0.25=bajo, 0.5=medio, 1=alto, 2=muy alto, 3=masivo)
- Confidence: ¿Qué tan seguros estamos? (50%=baja, 80%=media, 100%=alta)
- Effort: Persona-meses de trabajo
```

**Ejemplo**:

```markdown
### Feature: Filtro de fechas en órdenes

- **Reach**: 1200 usuarios/trimestre (60% de 2000 usuarios activos)
- **Impact**: 1 (alto - resuelve un pain point significativo)
- **Confidence**: 100% (tenemos data de soporte + feedback directo)
- **Effort**: 0.5 persona-mes (1 dev por 2 semanas)

**RICE Score** = (1200 × 1 × 100%) / 0.5 = **2400**

---

### Feature: Dark Mode

- **Reach**: 200 usuarios/trimestre (10% de usuarios)
- **Impact**: 0.25 (bajo - es estético, no funcional)
- **Confidence**: 50% (solo 3 usuarios lo pidieron en encuesta)
- **Effort**: 0.75 persona-mes (ajustar todos los componentes)

**RICE Score** = (200 × 0.25 × 50%) / 0.75 = **33**

---

**Conclusión**: Filtro de fechas (2400) tiene 73x más impacto que Dark Mode (33)
```

#### Comunicación de Prioridades

**Template de Roadmap Trimestral**:

```markdown
# Roadmap Q1 2025 - Monorepo BCA

## Objetivos del Trimestre
1. 🎯 Mejorar experiencia de búsqueda y gestión de órdenes (reducir tiempo 50%)
2. 🎯 Aumentar conversión de clientes nuevos (10% → 15%)
3. 🎯 Reducir carga operativa de administradores (30% menos tiempo)

---

## Sprint 10 (Ene 1-14)
### Comprometido
- ✅ Filtro de fechas en órdenes (8 pts)
- ✅ Exportar órdenes a CSV (5 pts)
- ✅ Fix de bugs críticos (3 pts)

### Stretch Goal (si hay tiempo)
- 🔵 Mejorar performance de dashboard (5 pts)

---

## Sprint 11 (Ene 15-28)
### Comprometido
- ✅ Notificaciones push para choferes (8 pts)
- ✅ Búsqueda por múltiples campos (8 pts)

---

## Sprint 12 (Ene 29 - Feb 11)
### Comprometido
- ✅ Sistema de rating de choferes (13 pts)
- ✅ Dashboard de métricas para admins (8 pts)

---

## Icebox (Backlog Futuro)
Ideas que consideraremos en Q2 o posterior:
- App móvil nativa
- Integración con sistema de pagos
- Automatización de matching órdenes-choferes
- Dark mode
```

---

### 2.3 Aceptación de Entregables

#### Paso 1: Revisión de Demo

**Cuándo**: Al finalizar desarrollo, antes de deploy a staging

**Procedimiento**:
```markdown
### Demo Checklist

**Preparación** (por desarrollador):
- [ ] Feature desplegada en ambiente de DEV
- [ ] Datos de prueba listos (casos felices y edge cases)
- [ ] Lista de cambios respecto a diseño original (si hay)

**Durante la Demo** (15-30 min):
1. Desarrollador muestra funcionalidad en vivo
2. Recorre cada criterio de aceptación
3. Muestra casos de error y validaciones
4. PO hace preguntas y pide ver escenarios específicos

**Preguntas clave del PO**:
- ¿Esto resuelve el problema que planteamos?
- ¿Puedo usar esto como usuario final sin problemas?
- ¿Hay algo que no está como esperaba?
- ¿Qué pasa si el usuario hace X? (casos edge)
```

#### Paso 2: Testing de Aceptación (UAT - User Acceptance Testing)

**Cuándo**: En ambiente de STAGING, después de QA

**Procedimiento**:
```markdown
### UAT Checklist

**Preparación**:
- [ ] QA ha completado smoke test en staging
- [ ] PO tiene acceso a staging con usuario de prueba
- [ ] Casos de uso documentados están disponibles

**Ejecución** (1-2 horas):
1. PO ejecuta flujos principales como usuario final
2. Valida que se cumplen criterios de aceptación
3. Verifica que la experiencia de usuario es intuitiva
4. Prueba en diferentes dispositivos (desktop, mobile)

**Template de Reporte**:
```markdown
## UAT Report - Feature: Filtro de Fechas

**Fecha**: 2025-01-15
**Ambiente**: Staging
**Tester**: [Product Owner nombre]

### Criterios de Aceptación

| # | Criterio | Status | Notas |
|---|----------|--------|-------|
| 1 | Campo "Fecha Desde" presente | ✅ PASS | Funciona correctamente |
| 2 | Campo "Fecha Hasta" presente | ✅ PASS | Funciona correctamente |
| 3 | Validación fechas coherentes | ✅ PASS | Mensaje de error claro |
| 4 | No permite fechas futuras | ⚠️ MINOR | Permite, pero muestra "0 resultados". Preferible deshabilitar. |
| 5 | Botón "Aplicar Filtro" | ✅ PASS | - |
| 6 | Botón "Limpiar" | ✅ PASS | - |
| 7 | Actualización sin reload | ✅ PASS | Muy fluido |
| 8 | Mensaje "no hay resultados" | ✅ PASS | - |
| 9 | Filtro persiste | ✅ PASS | Funciona al navegar y volver |

### Experiencia de Usuario
- 👍 **Muy intuitivo**, no necesité instrucciones
- 👍 **Rápido**, búsqueda es instantánea
- ⚠️ **Sugerencia**: El calendario podría abrir en el mes actual en lugar de Enero 1900

### Bugs Encontrados
- 🐛 **Menor**: Permite seleccionar fechas futuras (debería deshabilitar)
- 🐛 **Cosmético**: Tooltip del campo "Fecha Desde" tiene typo ("Seleecione")

### Decisión
- ✅ **APROBAR** con cambios menores
- Bugs encontrados son de baja prioridad, no bloquean release
- Crear issues para bugs menores (#345, #346)
- Re-validar en próximo sprint

**Firma**: [PO]
```
```

#### Paso 3: Aprobación de Deploy a Producción

**Checklist final**:

```markdown
## Pre-Deploy Approval Checklist

### Validaciones Técnicas
- [ ] UAT completado por PO (✅ aprobado)
- [ ] QA completó suite de regresión (95%+ pass rate)
- [ ] Code review aprobado por 2+ seniors
- [ ] Tests automatizados pasando (coverage ≥ 80%)
- [ ] Performance testing aprobado (si aplica)
- [ ] Security review completado (si maneja datos sensibles)

### Validaciones de Negocio
- [ ] Feature alineada con objetivos del sprint/trimestre
- [ ] Métricas de éxito definidas y tracking implementado
- [ ] Documentación de usuario actualizada (si es necesario)
- [ ] Plan de comunicación a usuarios preparado (si es cambio grande)
- [ ] Training de equipo de soporte completado (si es necesario)

### Riesgos y Mitigación
- [ ] Se identificaron riesgos potenciales
- [ ] Plan de rollback documentado
- [ ] Ventana de deploy apropiada (bajo tráfico)
- [ ] Equipo técnico disponible para monitoreo post-deploy

### Aprobación Final
- [ ] Product Owner aprueba ✅
- [ ] Tech Lead aprueba ✅
- [ ] DevOps confirma ready ✅

**Deploy programado para**: [Fecha y hora]
**Responsable del deploy**: @devops
**Responsable de monitoreo**: @tech-lead
```

**Comunicación de Aprobación**:

```markdown
Mensaje en Slack #deployments:

"✅ **Deploy APROBADO - Sprint 10**

Feature: Filtro de fechas en listado de órdenes
Issue: #142
Deploy programado: 2025-01-15 22:00 (horario bajo tráfico)

**Valor de negocio**:
- Mejora experiencia de 60% de usuarios activos
- Reduce tickets de soporte ~80%
- Esperamos aumento en NPS de 7.2 → 8.0

**Monitoreo post-deploy**:
- Métricas clave: % uso del filtro, tiempo promedio de búsqueda
- Seguimiento en próximos 7 días
- Revisión de resultados en Sprint Review

Gracias al equipo por el excelente trabajo! 🚀

cc: @tech-lead @devops @qa-lead"
```

---

### 2.4 Gestión de Stakeholders

#### Tipos de Stakeholders

```markdown
### Internos
- **Usuarios Finales** (clientes, choferes, dadores de carga)
  - Expectativa: Funcionalidad que les facilite el trabajo
  - Frecuencia de comunicación: Mediante encuestas, feedback, beta testing

- **Equipo de Soporte**
  - Expectativa: Menos bugs, mejor documentación, features que reduzcan tickets
  - Frecuencia: Semanal (revisar tickets más frecuentes)

- **Equipo de Ventas**
  - Expectativa: Features que ayuden a cerrar ventas, demos atractivas
  - Frecuencia: Quincenal (roadmap updates)

- **Directores/C-Level**
  - Expectativa: ROI, métricas de negocio, alineación estratégica
  - Frecuencia: Mensual (reporte ejecutivo)

### Externos
- **Clientes Enterprise** (si hay contratos B2B)
  - Expectativa: Features customizadas, SLAs, roadmap predecible
  - Frecuencia: Trimestral (QBR - Quarterly Business Review)

- **Partners/Integraciones**
  - Expectativa: APIs estables, documentación actualizada
  - Frecuencia: Según necesidad
```

#### Comunicación Efectiva

**Template de Update Semanal** (email/Slack):

```markdown
## Producto Update - Semana 2025-W03

### 🎯 Esta Semana
- ✅ Completado: Filtro de fechas en órdenes (Deploy jueves)
- ✅ Completado: Exportar órdenes a CSV
- 🏗️ En progreso: Notificaciones push para choferes (70% completo)

### 📊 Métricas Clave (vs semana anterior)
- Usuarios activos: 2,145 (↑ 5%)
- Órdenes creadas: 856 (↑ 12%)
- NPS: 7.4 (↑ 0.2)
- Tickets de soporte: 23 (↓ 30% 🎉)

### 🐛 Bugs Resueltos
- #234: Login lento resuelto (tiempo 5s → 1s)
- #245: Export CSV con acentos corregido

### 📅 Próxima Semana
- 🎯 Completar notificaciones push
- 🎯 Iniciar sistema de rating de choferes
- 🎯 UAT de búsqueda avanzada

### ⚠️ Riesgos
- Integración con API de WhatsApp tiene delays intermitentes (investigando con proveedor)

### 💡 Feedback Destacado
"El nuevo filtro de fechas es EXCELENTE! Ahora encuentro mis órdenes en segundos" 
- Cliente María G. (25 órdenes/mes)

---

Preguntas o sugerencias? Responde este thread o agenda 15 min conmigo.
```

**Template de Reporte Mensual Ejecutivo**:

```markdown
# Producto Report - Enero 2025

## Executive Summary
Enero fue un mes de consolidación y mejoras de UX. Lanzamos 8 features nuevas
enfocadas en reducir fricción en gestión de órdenes. Como resultado:
- ✅ Reducción de 40% en tickets de soporte
- ✅ Aumento de 15% en órdenes completadas
- ✅ NPS aumentó de 7.0 → 7.6

---

## Logros del Mes

### Features Lanzadas
1. **Filtro de fechas en órdenes** - 60% de usuarios lo usan semanalmente
2. **Exportar órdenes a CSV** - 250 exports en primera semana
3. **Notificaciones push** - 85% de choferes las activaron
4. **Búsqueda avanzada** - Reduce tiempo de búsqueda 70%

### Métricas de Producto
| Métrica | Dic 2024 | Ene 2025 | Cambio |
|---------|----------|----------|--------|
| Usuarios activos | 1,950 | 2,145 | +10% |
| Órdenes/mes | 3,420 | 3,933 | +15% |
| NPS | 7.0 | 7.6 | +8.5% |
| Tickets soporte | 195 | 117 | -40% |
| Tiempo prom. orden | 8.5 min | 6.2 min | -27% |

---

## Roadmap Próximos 3 Meses

### Febrero
- Sistema de rating de choferes
- Dashboard de métricas para admins
- Optimización de performance

### Marzo
- Integración con sistema de pagos (fase 1)
- App móvil (MVP - iOS y Android)
- Automatización de matching órdenes-choferes

### Abril
- Sistema de pagos (fase 2 - producción)
- Mejoras basadas en feedback de app móvil
- Analytics avanzados

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Delay en integración de pagos | Media | Alto | Contratamos consultor especialista, buffer de 2 semanas |
| Adopción baja de app móvil | Baja | Medio | Plan de incentivos para early adopters |
| Escalabilidad con 10x usuarios | Baja | Alto | Migración a Kubernetes planificada para Q2 |

---

## Budget y Recursos

**Gasto Enero 2025**: $15,000
- Desarrollo: $10,000 (2 devs + 1 senior)
- Infraestructura: $2,500 (AWS, servicios)
- Herramientas: $1,500 (GitHub, Figma, monitoring)
- Marketing/UX: $1,000 (research, testing)

**Proyección Q1**: $47,000
**ROI estimado**: $120,000 (incremento en órdenes + reducción de costos operativos)

---

## Solicitudes y Decisiones Requeridas

1. **Aprobación de budget adicional**: $8,000 para consultor de pagos (Febrero-Marzo)
2. **Priorización**: ¿App móvil en Marzo o posponer a Abril? (depende de recursos)
3. **Partnership**: Evaluar integración con plataforma X (reunión propuesta 15-Feb)

---

Preparado por: [Product Owner]
Fecha: 2025-02-01
```

---

### 2.5 Medición de Éxito

#### Definir Métricas de Producto

**Framework HEART** (Google):

```markdown
H - Happiness (Felicidad)
E - Engagement (Compromiso)
A - Adoption (Adopción)
R - Retention (Retención)
T - Task Success (Éxito de tarea)
```

**Ejemplo para Feature: Filtro de Fechas**:

```markdown
### Métricas de Éxito - Filtro de Fechas

**Happiness**
- Métrica: NPS de usuarios que usan el filtro
- Objetivo: ≥ 8.0 (baseline: 7.2)
- Medición: Encuesta in-app después de usar filtro 3 veces

**Engagement**
- Métrica: % de usuarios activos que usan filtro semanalmente
- Objetivo: ≥ 50% (de usuarios con > 20 órdenes)
- Medición: Analytics event tracking

**Adoption**
- Métrica: % de usuarios elegibles que probaron el filtro
- Objetivo: ≥ 70% en primer mes
- Medición: Analytics (usuarios que hicieron ≥ 1 búsqueda filtrada)

**Retention**
- Métrica: % de usuarios que vuelven a usar el filtro
- Objetivo: ≥ 80% retention semanal
- Medición: Cohort analysis (usuarios que lo usaron semana 1 → semana 2)

**Task Success**
- Métrica: % de búsquedas que resultan en click en orden
- Objetivo: ≥ 85% (indica que encontraron lo que buscaban)
- Medición: Analytics (búsqueda → click en resultado)
- Métrica secundaria: Tiempo promedio para encontrar orden
- Objetivo: < 30 segundos (baseline: 2-5 minutos)
```

#### Tracking e Implementación

**Implementación de tracking**:

```typescript
// Ejemplo de eventos a trackear
analytics.track('search_filter_used', {
  filter_type: 'date_range',
  date_from: '2025-01-01',
  date_to: '2025-01-31',
  results_count: 12,
  user_id: 'user_123',
  timestamp: new Date()
});

analytics.track('search_result_clicked', {
  filter_active: true,
  order_id: 'order_456',
  position_in_results: 3,
  time_to_click: 15 // segundos desde que aplicó filtro
});
```

**Dashboard de métricas** (Herramientas: Google Analytics, Mixpanel, Amplitude):

```markdown
### Dashboard: Filtro de Fechas

**Resumen (últimos 30 días)**
- 👥 Usuarios únicos: 728 / 1,200 (60.6%)
- 🔍 Búsquedas totales: 3,450
- ⏱️ Tiempo promedio: 18 segundos
- 📈 Click-through rate: 89%
- ⭐ NPS: 8.2

**Tendencia**
[Gráfico de línea: Uso diario del filtro en últimos 30 días]

**Cohortes**
| Semana | Nuevos Usuarios | Retention W2 | Retention W3 | Retention W4 |
|--------|-----------------|--------------|--------------|--------------|
| W1     | 245             | 87%          | 82%          | 78%          |
| W2     | 312             | 91%          | 84%          | -            |
| W3     | 389             | 88%          | -            | -            |

**Top Rangos Buscados**
1. Último mes: 42%
2. Última semana: 28%
3. Último año: 15%
4. Custom: 15%

**Insights**
- ✅ Objetivo de adopción SUPERADO (70% objetivo, 60.6% alcanzado en semana 2)
- ✅ Task success SUPERADO (85% objetivo, 89% alcanzado)
- ⚠️ NPS aún no llega a 8.0 en usuarios que NO usan filtro (6.8)
  → Acción: Agregar tooltip para descubribilidad
```

#### Revisión y Iteración

**Cadencia de revisión**:

```markdown
### Sprint Review (cada 2 semanas)
- Demostración de features completadas
- Revisión de métricas de features lanzadas hace 1-2 sprints
- Decisiones de iteración basadas en data

### Retrospectiva de Producto (mensual)
- ¿Qué features tuvieron más impacto?
- ¿Qué no funcionó como esperábamos?
- ¿Qué aprendimos sobre nuestros usuarios?
- Ajustes al roadmap

### QBR - Quarterly Business Review (trimestral)
- Revisión de OKRs del trimestre
- ROI de inversión en producto
- Planeación estratégica de próximo trimestre
```

---

## 3. Gestión de Cambios y Solicitudes

### Proceso de Cambio de Prioridad

```markdown
## Procedimiento: Solicitud de Cambio de Prioridad

### Escenario
Stakeholder solicita que Feature X (planeada para Sprint 15) se mueva a Sprint 12

### Paso 1: Evaluar Solicitud (15 min)
- **¿Quién solicita?** (CEO vs un usuario)
- **¿Por qué ahora?** (urgencia real vs impaciencia)
- **¿Cuál es el costo de esperar?** (pérdida de ventas, multa, reputación)

### Paso 2: Análisis de Trade-offs (30 min)
Si movemos Feature X a Sprint 12, ¿qué sale del sprint?
- Feature Y (ya comprometida)
- Feature Z (ya comprometida)
- Buffer para bugs

**Trade-off Matrix**:
| Opción | Feature X Ahora | Feature Y Ahora | Feature X + Y (scope creep) |
|--------|-----------------|-----------------|----------------------------|
| Valor | Alto | Muy Alto | Muy Alto |
| Riesgo | Bajo | Bajo | MUY ALTO (burnout, bugs) |
| Costo | $5K | $8K | $15K (overtime, calidad) |

### Paso 3: Negociación
Template de respuesta a stakeholder:

"Entiendo que Feature X es importante para ti por [razón].

**Contexto**:
El equipo tiene comprometido para Sprint 12:
- Feature Y (solicitud de CEO, impacta 80% usuarios)
- Feature Z (bloqueante para lanzamiento)
- Buffer para bugs críticos

**Opciones**:
1. **Mantener plan actual**: Feature X en Sprint 15 (6 semanas)
   - Pro: Sin riesgo, calidad garantizada
   - Contra: Esperar 6 semanas

2. **Intercambiar**: Feature X en Sprint 12, Feature Z pasa a Sprint 15
   - Pro: Feature X más rápido
   - Contra: Feature Z se retrasa (impacta lanzamiento)

3. **Scope reducido**: Versión MVP de Feature X en Sprint 12
   - Pro: Algo de funcionalidad ya
   - Contra: No tendrá todo lo especificado

4. **Agregar recursos**: Contratar dev temporal para Sprint 12
   - Pro: Ambas features
   - Contra: $5K adicional, riesgo de calidad

**Recomendación**: Opción 3 (MVP en Sprint 12, completar en Sprint 13)

¿Qué opción prefieres? Podemos discutirlo en una llamada de 15 min."
```

### Gestión de Scope Creep

**Señales de alerta**:
- ❌ "Ya que estamos, ¿podrían agregar también...?"
- ❌ "Es solo un botoncito más, no debe tomar mucho tiempo"
- ❌ "En la demo vi que faltaba [feature no especificada]"

**Respuesta**:
```markdown
"Esa es una excelente idea y la agradezco.

Para mantener la calidad y el timeline comprometido, propongo:

**Opción A**: Lo agregamos como User Story separado en el Backlog
- Lo estimamos en próximo refinamiento
- Lo priorizamos según RICE score
- Podría entrar en Sprint 13 o 14

**Opción B**: Lo incluimos en este sprint
- Requiere re-estimación (puede aumentar de 8 → 13 pts)
- Algo más debe salir del sprint para dar espacio
- Riesgo de delay en entrega

**Opción C**: Lo lanzamos como iteración V2 de esta feature
- Lanzamos V1 esta semana como planeado
- V2 con tu sugerencia en 2-3 semanas

Mi recomendación es **Opción A**. ¿Te parece bien?"
```

---

## 4. Herramientas y Templates

### Herramientas Recomendadas

```markdown
### Gestión de Producto
- **Jira / Linear**: Backlog, sprints, tracking
- **Productboard / Aha!**: Roadmap, priorización
- **Miro / FigJam**: Workshops, brainstorming

### Research y Feedback
- **Typeform / Google Forms**: Encuestas
- **Hotjar / FullStory**: Session recordings, heatmaps
- **Intercom / Zendesk**: Feedback de soporte

### Analytics
- **Google Analytics**: Web analytics básico
- **Mixpanel / Amplitude**: Product analytics avanzado
- **Looker / Metabase**: Dashboards custom

### Diseño
- **Figma**: Diseño UI/UX, prototipos
- **Maze / UsabilityHub**: User testing remoto

### Comunicación
- **Slack**: Comunicación diaria
- **Confluence / Notion**: Documentación
- **Loom**: Video updates asíncronos
```

### Templates Descargables

**Crear en** `/docs/templates/`:

1. `user_story_template.md`
2. `uat_report_template.md`
3. `sprint_review_template.md`
4. `product_update_template.md`
5. `roadmap_template.md`

---

## 5. Checklist de Mejores Prácticas

### Al Crear User Story
- [ ] Escrita desde perspectiva del usuario (no "El sistema debe...")
- [ ] Tiene valor de negocio claro
- [ ] Criterios de aceptación específicos y testeables
- [ ] Incluye mockups o diseño (si aplica)
- [ ] Out of scope claramente definido
- [ ] Métricas de éxito identificadas

### Al Priorizar
- [ ] Evalué con framework objetivo (RICE, Valor vs Esfuerzo)
- [ ] Consulté con stakeholders clave
- [ ] Consideré dependencias técnicas
- [ ] Balanceé features vs deuda técnica vs bugs
- [ ] Comuniqué decisión y razonamiento

### Al Aprobar Release
- [ ] UAT completado personalmente
- [ ] QA dio visto bueno
- [ ] Métricas de tracking implementadas
- [ ] Documentación actualizada (si es necesario)
- [ ] Plan de comunicación a usuarios preparado
- [ ] Rollback plan entendido

### Comunicación con Stakeholders
- [ ] Updates regulares y predecibles
- [ ] Lenguaje no técnico (cuando corresponde)
- [ ] Transparencia sobre riesgos y delays
- [ ] Celebración de logros del equipo
- [ ] Solicitud de feedback proactiva

---

## 6. Escenarios Comunes

### Escenario 1: CEO Quiere Feature "Urgente" No Planificada

```markdown
**Situación**: CEO vio un demo de competencia y quiere feature similar ASAP

**Respuesta**:
1. **Escuchar activamente**: Entender el *por qué* detrás del pedido
   - ¿Es presión de cliente específico?
   - ¿Es una ventaja competitiva crítica?
   - ¿O es excitación momentánea?

2. **Investigar rápidamente** (1-2 días):
   - Hablar con usuarios: ¿Realmente lo necesitan?
   - Consultar con Tech Lead: ¿Cuál es el esfuerzo real?
   - Analizar analytics: ¿Hay evidencia de esta necesidad?

3. **Presentar opciones** (reunión 30 min):
   "Investigué tu solicitud. Entiendo que esto es importante porque [razón].

   **Esfuerzo estimado**: 3-4 semanas (13-21 puntos)

   **Opciones**:
   - A) MVP en 1 semana (5 pts) - 70% de funcionalidad
   - B) Feature completa en Sprint 14 (4 semanas)
   - C) Feature completa AHORA, pero retrasamos lanzamiento planeado

   **Mi recomendación**: Opción A (MVP)
   - Validamos si usuarios realmente lo usan antes de invertir más
   - No retrasamos otros compromisos
   - Si tiene éxito, lo completamos en siguientes 2 semanas

   **Necesito tu decisión** porque afecta al sprint en curso."

4. **Ejecutar con excelencia** sea cual sea la decisión
```

### Escenario 2: Feature Lanzada Tiene Baja Adopción

```markdown
**Situación**: Invertimos 2 sprints en Feature X, pero solo 5% de usuarios la usan

**Procedimiento**:

1. **Investigar causas** (1 semana):
   - [ ] ¿Los usuarios saben que existe? (awareness)
   - [ ] ¿Es fácil de encontrar? (discoverability)
   - [ ] ¿Es difícil de usar? (usability)
   - [ ] ¿Resuelve el problema real? (product-market fit)

2. **Recopilar data**:
   - Encuesta a usuarios: "¿Por qué no usas Feature X?"
   - Session recordings: Observar comportamiento
   - A/B test: Cambiar ubicación/diseño

3. **Decisión estratégica**:
   - **Si es awareness/discoverability**: Marketing, onboarding, tooltips
   - **Si es usability**: Iteraciones de UX (2-3 sprints más)
   - **Si es product-market fit**: Considerar deprecar y aprender la lección

4. **Comunicar transparentemente**:
   "Feature X no tuvo la adopción esperada (5% vs 40% objetivo).

   **Learnings**:
   - Los usuarios prefieren el flujo actual (más rápido)
   - El problema que intentamos resolver no era tan crítico
   - Subestimamos la curva de aprendizaje

   **Decisión**: Deprecaremos Feature X en próximo release.
   **Impacto**: Recuperamos recursos para Feature Y (mayor demanda)
   **Takeaway**: Próximas features harán beta testing con 20 usuarios antes de desarrollo completo"

   Fallar rápido y aprender es parte del proceso.
```

### Escenario 3: Conflicto Entre Stakeholders

```markdown
**Situación**: VP Ventas quiere Feature A, VP Operaciones quiere Feature B, recursos solo para 1

**Procedimiento**:

1. **Entender posiciones**:
   - Reunión individual con cada VP (30 min c/u)
   - "¿Cuál es el impacto si NO hacemos esto?"
   - "¿Cuál es el costo de esperar 1 mes más?"

2. **Análisis objetivo**:
   | Criterio | Feature A (Ventas) | Feature B (Operaciones) |
   |----------|-------------------|------------------------|
   | Usuarios impactados | 50 (clientes nuevos) | 500 (todos los admins) |
   | Revenue impact | $20K/mes (proyectado) | $0 (eficiencia interna) |
   | Cost savings | $0 | $15K/mes (reducción hrs admin) |
   | Urgencia | Alta (demo con cliente grande en 2 sem) | Media (workaround funciona) |
   | Esfuerzo | 21 puntos (4 semanas) | 13 puntos (2.5 semanas) |

3. **Proponer solución**:
   Reunión conjunta (1 hora):

   "Ambas features son valiosas. Basado en análisis objetivo:

   **Propuesta**: Feature B primero (2.5 sem), luego Feature A (4 sem)
   **Razonamiento**:
   - B es más rápido → resultados antes
   - B genera savings inmediatos ($15K/mes)
   - Demo con cliente grande es en 2 sem → muy arriesgado prometerles algo
   - A estará listo en 6-7 semanas, a tiempo para Q2 pipeline

   **Alternativa**: Feature A primero, pero solo si cliente confirma contrato (no solo demo)

   ¿Están de acuerdo?"

4. **Escalación** (si no hay acuerdo):
   "No llegamos a consenso. Necesito decisión de CEO/CTO para desbloquear al equipo.
   Prepararé presentación con trade-offs para reunión de 30 min."
```

---

**Recuerda**: Tu rol es ser la **voz del usuario** dentro de la organización, balancear **valor de negocio** con **viabilidad técnica**, y tomar **decisiones basadas en datos** cuando hay ambigüedad. No puedes complacer a todos, pero sí puedes ser transparente y justo en tus decisiones.

