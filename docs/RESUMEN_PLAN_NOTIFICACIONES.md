# Resumen Ejecutivo: Sistema de Notificaciones Interno

**Fecha:** 2026-01-14  
**Versión:** 1.0 (Actualizada - Sin WhatsApp)

---

## 🎯 OBJETIVO

Implementar un **sistema completo de notificaciones internas** para la plataforma, comenzando con notificaciones de rechazo de documentos, más vista de documentos rechazados.

---

## 📦 COMPONENTES PRINCIPALES

### 1. **Base de Datos** ✨ NUEVO
- Tabla `internal_notifications` en PostgreSQL
- Campos: user_id, type, title, message, link, priority, read, deleted
- Índices optimizados para performance

### 2. **Backend API** ✨ NUEVO
- `InternalNotificationService` - CRUD de notificaciones
- `DocumentStakeholdersService` - Identificar responsables
- `RejectionNotificationService` - Notificaciones de rechazo
- `NotificationsController` - 6 endpoints REST
- Integración en `ApprovalService.rejectDocument`

### 3. **WebSocket en Tiempo Real** ✨ MEJORADO
- Método `notifyUser(userId, data)` agregado
- Rooms por usuario (`user_${userId}`)
- Notificaciones push instantáneas

### 4. **Frontend - Componente de Campana** ✨ NUEVO
- `NotificationBell` - Icono con badge de contador
- Dropdown con últimas 10 notificaciones
- Marcado automático como leída al abrir
- Botón para borrar individual
- Botón "Marcar todas como leídas"
- Auto-refresh cada 30 segundos

### 5. **Frontend - Página de Historial** ✨ NUEVO
- Vista completa de todas las notificaciones
- Filtro: No leídas / Todas
- Paginación
- Opciones: Borrar todas las leídas

### 6. **Frontend - Vista de Rechazados** ✨ NUEVO
- Lista paginada de documentos rechazados
- Filtros por tipo de entidad
- Estadísticas de rechazos
- Link directo al documento

---

## 🔔 FLUJO DE NOTIFICACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario RECHAZA documento                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ApprovalService.rejectDocument()                          │
│     - Actualiza documento (status = RECHAZADO)               │
│     - Llama RejectionNotificationService                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. DocumentStakeholdersService.getStakeholders()            │
│     - Identifica todos los responsables (usuarios):          │
│       * Admins / SuperAdmins                                 │
│       * Admin Interno                                        │
│       * Usuarios del Dador de Carga                          │
│       * Usuarios de Empresa Transportista                    │
│       * Usuarios asociados al Chofer                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. InternalNotificationService.createMany()                 │
│     - Crea notificación en BD para cada stakeholder          │
│     - Datos: title, message, link, priority=high            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  5. WebSocket: notifyUser()                                   │
│     - Envía notificación en tiempo real a cada usuario       │
│     - Evento: 'notification'                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Frontend: Icono de campana se actualiza                  │
│     - Badge muestra contador de no leídas                    │
│     - Usuario ve popup con nueva notificación                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Usuario HACE CLIC en notificación                        │
│     - Se marca como leída automáticamente                    │
│     - Navega al link del documento                           │
│     - Badge se actualiza (- 1)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 ENDPOINTS NUEVOS

### Backend API

```
GET    /api/docs/notifications                    - Listar notificaciones del usuario
GET    /api/docs/notifications/unread-count       - Contador de no leídas
PATCH  /api/docs/notifications/:id/read           - Marcar como leída
POST   /api/docs/notifications/mark-all-read      - Marcar todas como leídas
DELETE /api/docs/notifications/:id                - Borrar notificación
POST   /api/docs/notifications/delete-all-read    - Borrar todas las leídas

GET    /api/docs/dashboard/rejected               - Listar documentos rechazados
GET    /api/docs/dashboard/rejected/stats         - Estadísticas de rechazos
```

---

## ⏱️ CRONOGRAMA ACTUALIZADO

**Total: 12 días**

### Semana 1
- **Días 1-2:** Endpoints de documentos rechazados (backend)
- **Días 3-6:** Sistema de notificaciones interno completo (backend)
  - Migración BD
  - Servicios
  - Controller y rutas
  - Integración en flujo de rechazo

### Semana 2
- **Días 7-9:** Frontend completo
  - Campana de notificaciones
  - Página de historial
  - Vista de rechazados
  - Integración WebSocket
- **Día 10:** Testing integral
- **Día 11:** Documentación y deploy staging
- **Día 12:** Validación y producción

---

## ✅ CARACTERÍSTICAS CLAVE

### Notificaciones Internas
✅ **Persistentes** - Se guardan en BD, no se pierden  
✅ **Tiempo real** - WebSocket para notificación instantánea  
✅ **Icono con badge** - Contador visual de no leídas  
✅ **Marcado automático** - Se marca leída al visualizar  
✅ **Historial completo** - El usuario controla qué borrar  
✅ **Prioridades** - low, normal, high, urgent (con colores)  
✅ **Links directos** - Click para navegar al documento  
✅ **Tipos de evento** - Extensible para otros eventos  

### Documentos Rechazados
✅ **Vista dedicada** - Página con lista completa  
✅ **Filtros** - Por tipo de entidad  
✅ **Estadísticas** - Rechazados hoy, últimos 7 días, top motivos  
✅ **Paginación** - Para grandes volúmenes  
✅ **Motivo visible** - Razón de rechazo clara  
✅ **Acceso rápido** - Desde dashboard principal  

---

## 🚀 VENTAJAS DEL SISTEMA INTERNO

### vs WhatsApp
1. ✅ **No depende de servicios externos** (Evolution API)
2. ✅ **No requiere números de teléfono**
3. ✅ **Totalmente controlado** por la plataforma
4. ✅ **Historial persistente** dentro de la app
5. ✅ **Más económico** (sin costos de API externa)
6. ✅ **Mejor UX** - usuario no sale de la plataforma

### Performance
- ⚡ **Notificaciones en < 100ms** (WebSocket)
- ⚡ **Carga de dropdown < 200ms**
- ⚡ **Base de datos indexada** para consultas rápidas
- ⚡ **Polling cada 30s** como fallback si WebSocket falla

### Escalabilidad
- 📈 **Rooms por usuario** (eficiente en WebSocket)
- 📈 **Paginación** en todas las listas
- 📈 **Limpieza automática** de notificaciones antiguas
- 📈 **Índices BD optimizados**

---

## 🎨 DISEÑO UI/UX

### Icono de Campana
```
┌──────────────────────┐
│     🔔  (5)          │  <- Badge rojo con contador
│                       │
│  [Dropdown abierto]   │
│  ┌─────────────────┐ │
│  │ 🚫 Doc Rechazado│ │
│  │ Licencia...      │ │  <- Notificación no leída (fondo azul)
│  │ hace 2 min   [X] │ │
│  ├─────────────────┤ │
│  │ ✅ Doc Aprobado │ │
│  │ VTV...           │ │  <- Notificación leída
│  │ hace 1 hora  [X] │ │
│  └─────────────────┘ │
│  [Ver todas...]      │
└──────────────────────┘
```

### Estados Visuales
- 🔴 **No leída**: Fondo azul claro + punto azul
- ⚪ **Leída**: Fondo blanco
- 🚫 **Urgente**: Borde rojo
- ⚠️ **Alta prioridad**: Borde naranja
- ℹ️ **Normal**: Borde azul

---

## 🔒 SEGURIDAD

1. **Autorización** - Solo el usuario propietario ve sus notificaciones
2. **Autenticación** - Middleware `authenticate` en todas las rutas
3. **Validación** - Solo el usuario puede marcar/borrar sus notificaciones
4. **WebSocket** - Rooms segregadas por usuario
5. **Sanitización** - Mensajes escapados en frontend

---

## 📈 MÉTRICAS DE ÉXITO

### Técnicas
- ✅ 100% de notificaciones creadas correctamente
- ✅ > 95% de notificaciones WebSocket entregadas
- ✅ Tiempo de respuesta < 300ms
- ✅ 0 errores en producción

### Usuario
- ✅ 100% de usuarios notificados al rechazo
- ✅ Tiempo promedio de visualización < 5 minutos
- ✅ Reducción del 80% en consultas "¿dónde está mi documento?"
- ✅ Satisfacción > 8/10

---

## 🛠️ STACK TECNOLÓGICO

- **BD**: PostgreSQL + Prisma ORM
- **Backend**: Node.js + TypeScript + Express
- **WebSocket**: Socket.IO
- **Frontend**: React 18 + TypeScript
- **Estado**: Redux Toolkit + RTK Query
- **UI**: Tailwind CSS + Shadcn/UI + Heroicons
- **Real-time**: Socket.IO Client

---

## 📝 PRÓXIMOS PASOS

1. ✅ Revisar y aprobar el plan
2. ⏸️ Crear rama `feature/internal-notifications`
3. ⏸️ Implementar FASE 1 (endpoints rechazados)
4. ⏸️ Implementar FASE 2 (sistema de notificaciones)
5. ⏸️ Implementar FASE 3 (frontend completo)
6. ⏸️ Testing integral
7. ⏸️ Deploy a staging
8. ⏸️ Validación con usuarios
9. ⏸️ Deploy a producción
10. ⏸️ Monitoreo y ajustes

---

## 💡 EXTENSIBILIDAD FUTURA

Este sistema de notificaciones es **extensible** para otros eventos:

- ✨ Documento próximo a vencer (`DOCUMENT_EXPIRING`)
- ✨ Documento vencido (`DOCUMENT_EXPIRED`)
- ✨ Documento aprobado (`DOCUMENT_APPROVED`)
- ✨ Equipo incompleto (`EQUIPO_INCOMPLETE`)
- ✨ Remito aprobado/rechazado
- ✨ Alertas del sistema (`SYSTEM_ALERT`)
- ✨ **Cualquier evento futuro** - solo agregar tipo en enum

---

**Documento completo:** `/home/administrador/monorepo-bca/docs/PLAN_DOCUMENTOS_RECHAZADOS_NOTIFICACIONES.md`

**Estado:** ✅ LISTO PARA IMPLEMENTACIÓN
