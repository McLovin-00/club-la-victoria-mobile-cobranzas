# Registro de Incidentes

> **Propósito**: Documentar incidentes de producción para aprendizaje y mejora continua  
> **Responsable**: DevOps/Back + Founder/Lead  
> **Frecuencia de revisión**: Mensual

**Definición**: Un incidente es cualquier evento que degrada o interrumpe el servicio en Producción.

---

## 📊 Resumen Ejecutivo

**Año 2025**:
- Total incidentes: 0
- Downtime total: 0 minutos
- MTTR promedio: N/A
- Incidentes críticos: 0

---

## 🚨 Registro de Incidentes

### Plantilla de Incidente

Copiar esta plantilla para cada nuevo incidente:

```markdown
### [YYYY-MM-DD] - Breve descripción del incidente

**Severidad**: 🔴 Crítico / 🟡 Alto / 🟢 Medio / 🔵 Bajo

**Timeline**:
- Inicio: YYYY-MM-DD HH:mm
- Detección: YYYY-MM-DD HH:mm
- Resolución: YYYY-MM-DD HH:mm
- **Duración total**: XX minutos
- **MTTD**: XX minutos (tiempo hasta detectar)
- **MTTR**: XX minutos (tiempo hasta resolver)

**Servicio(s) afectado(s)**: Backend / Frontend / Documentos / Infraestructura

**Síntomas**:
- [Descripción de qué observaron los usuarios o el equipo]
- [Errores específicos, comportamiento anómalo]

**Causa raíz**:
- [Explicación técnica detallada de QUÉ causó el problema]
- [Categoría: Bug de código / Error de config / Infra / Proceso / Externo]

**Impacto**:
- Usuarios afectados: [Todos / Parcial / Estimación]
- Funcionalidad afectada: [Descripción]
- Pérdida de datos: Sí / No
- Impacto en negocio: [Alto / Medio / Bajo]

**Acción tomada (resolución)**:
- [Rollback / Hotfix / Mitigación temporal / Otra]
- [Descripción específica de qué se hizo]
- [Link a PR del hotfix si aplica]

**Prevención (qué haremos para que no vuelva a pasar)**:
1. [Acción específica 1] - Responsable: [Nombre] - Fecha: [YYYY-MM-DD]
2. [Acción específica 2] - Responsable: [Nombre] - Fecha: [YYYY-MM-DD]

**Acciones completadas**:
- [ ] Tests agregados: [Link a PR]
- [ ] Monitoreo/Alertas configuradas: [Descripción]
- [ ] Documentación actualizada: [Link]
- [ ] Runbook creado/actualizado: [Link]

**Responsable de resolución**: [Nombre]

**Lecciones aprendidas**:
- [Qué salió bien en la respuesta]
- [Qué se puede mejorar en el proceso]

**Referencias**:
- Issue: #XXX
- PR hotfix: #YYY
- Sentry event: [Link]
- Post-mortem (si aplica): [Link a docs]

---
```

---

## 📅 Historial de Incidentes

<!-- Agregar nuevos incidentes al inicio (orden cronológico inverso) -->

### [2025-10-08] - Sistema operativo, sin incidentes registrados

**Estado**: ✅ Sistema estable

**Notas**:
- Inicio de registro formal de incidentes
- Implementación de checklists operativos
- Configuración de Sentry y Uptime Kuma en progreso

---

<!-- TEMPLATE - ELIMINAR AL AGREGAR PRIMER INCIDENTE REAL -->

### [Ejemplo] [2025-XX-XX] - Timeout en API de documentos

**Severidad**: 🟡 Alto

**Timeline**:
- Inicio: 2025-XX-XX 14:30
- Detección: 2025-XX-XX 14:35
- Resolución: 2025-XX-XX 15:10
- **Duración total**: 40 minutos
- **MTTD**: 5 minutos
- **MTTR**: 35 minutos

**Servicio(s) afectado(s)**: Documentos

**Síntomas**:
- Upload de documentos fallaba con timeout
- Usuarios reportaban error "Request timed out" en la interfaz
- Sentry mostraba pico de errores 504 Gateway Timeout

**Causa raíz**:
- Query sin índice en tabla `documentos` causaba full table scan
- Con 50K+ registros, query tardaba > 30 segundos
- Categoría: Performance / Falta de optimización de BD

**Impacto**:
- Usuarios afectados: ~15 usuarios activos en ese momento
- Funcionalidad afectada: Upload y listado de documentos
- Pérdida de datos: No
- Impacto en negocio: Medio (funcionalidad secundaria)

**Acción tomada (resolución)**:
- Hotfix: Agregado índice en columna `transportista_id` y `fecha_creacion`
- PR #123: Migración de Prisma con índice
- Deploy directo a Producción tras testing en Staging

**Prevención**:
1. Agregar test de performance para queries > 1000 registros - Responsable: Dev Backend - Fecha: 2025-XX-XX
2. Revisar y optimizar todas las queries en módulo documentos - Responsable: DevOps/Back - Fecha: 2025-XX-XX
3. Configurar alerta en Sentry para latencia > 10s - Responsable: DevOps/Back - Fecha: 2025-XX-XX

**Acciones completadas**:
- [x] Tests agregados: PR #124 (test de performance)
- [x] Monitoreo/Alertas configuradas: Sentry alerta para slow queries
- [x] Documentación actualizada: ARCHITECTURE.md sección de performance
- [ ] Runbook creado: Pendiente

**Responsable de resolución**: Juan DevOps

**Lecciones aprendidas**:
- ✅ Detección rápida gracias a Sentry
- ✅ Hotfix implementado y testeado eficientemente
- ⚠️ Faltó testing de performance antes de llegar a producción
- ⚠️ Debemos tener plan de indexación desde diseño de BD

**Referencias**:
- Issue: #122
- PR hotfix: #123
- Sentry event: [Link]

---

<!-- FIN EJEMPLO -->

---

## 📈 Análisis de Tendencias

**Actualizar mensualmente**:

### Por Categoría (2025)
- Bugs de código: 0
- Errores de configuración: 0
- Infraestructura: 0
- Proceso: 0
- Externo: 0

### Por Servicio (2025)
- Backend: 0
- Frontend: 0
- Documentos: 0
- Infraestructura: 0

### Por Severidad (2025)
- 🔴 Crítico: 0
- 🟡 Alto: 0
- 🟢 Medio: 0
- 🔵 Bajo: 0

---

## 🎯 Objetivos SLA (indicativos)

| Métrica | Objetivo | Real 2025 |
|---------|----------|-----------|
| **Uptime** | > 99.5% | 100% |
| **MTTR** | < 60 min | N/A |
| **MTTD** | < 10 min | N/A |
| **Incidentes críticos/mes** | < 1 | 0 |

---

## 📝 Notas de Uso

### Cómo registrar un incidente:

1. **Durante el incidente**: Usar `CHECKLIST_INCIDENTE.md` como guía
2. **Post-incidente** (dentro de 24h): Copiar template y completar todos los campos
3. **Seguimiento** (dentro de 1 semana): Completar acciones preventivas
4. **Revisión mensual**: Analizar tendencias y actualizar métricas

### Severidad:

- 🔴 **Crítico**: Servicio caído completamente, pérdida de datos, imposibilidad de operar
- 🟡 **Alto**: Funcionalidad principal degradada, afecta a mayoría de usuarios
- 🟢 **Medio**: Funcionalidad secundaria afectada, workaround disponible
- 🔵 **Bajo**: Cosmético, sin impacto funcional significativo

### Responsabilidades:

- **DevOps/Back**: Responsable primario de registro y seguimiento
- **Founder/Lead**: Aprueba acciones preventivas, participa en post-mortems críticos
- **PM/Analista**: Documenta impacto en usuarios, participa en prevención de proceso
- **Desarrolladores**: Implementan fixes y acciones preventivas

---

**Última actualización**: 8 Octubre 2025  
**Próxima revisión**: 8 Noviembre 2025  
**Alineado con**: Manual Operativo Microsyst

