# Plan de Acción: Documentos Rechazados y Notificaciones

**Fecha:** 2026-01-14  
**Versión:** 1.0  
**Prioridad:** ALTA  

---

## 📋 RESUMEN EJECUTIVO

### Problemas Identificados

#### 1. **Problema: Documentos rechazados no aparecen en el tablero**
**Impacto:** ALTO - Los usuarios no pueden visualizar ni gestionar documentos rechazados  
**Causa Raíz:** 
- ✅ El backend SÍ registra correctamente los documentos rechazados (status = `RECHAZADO`)
- ✅ El contador de rechazados existe en el dashboard (`getAdminStats`, línea 19)
- ❌ **NO existe un endpoint específico para listar documentos rechazados en el dashboard principal**
- ❌ El frontend no tiene una vista dedicada para mostrar documentos rechazados

#### 2. **Requerimiento: Notificaciones de rechazo a toda la cadena**
**Impacto:** ALTO - Falta comunicación crítica en el flujo de aprobación  
**Causa Raíz:**
- ✅ Infraestructura de notificaciones WebSocket existe
- ❌ **NO existe un sistema de notificaciones interno persistente** en la base de datos
- ❌ **El flujo de rechazo NO envía notificaciones** (`ApprovalService.rejectDocument`, línea 460-500)
- ❌ No hay componente frontend de notificaciones (campana/icono con badge)
- ❌ No se notifica a todos los responsables en la cadena

---

## 🎯 OBJETIVOS

### Objetivo 1: Tablero de Documentos Rechazados
Crear una vista completa y funcional de documentos rechazados que permita:
- ✅ Ver lista paginada de documentos rechazados
- ✅ Filtrar por entidad (Chofer, Camión, Acoplado, Transportista, Dador)
- ✅ Ver motivo de rechazo y detalles
- ✅ Permitir resubir documentos rechazados
- ✅ Estadísticas y métricas de rechazos

### Objetivo 2: Sistema de Notificaciones Interno Completo
Implementar sistema de notificaciones interno a la plataforma con:
- ✅ **Base de datos** para persistir notificaciones
- ✅ **Backend API** para crear, listar, marcar como leídas y borrar notificaciones
- ✅ **Notificaciones automáticas** de rechazo a todos los responsables:
  - Admin/SuperAdmin (siempre)
  - Admin Interno (siempre)
  - Dador de Carga (empresa propietaria)
  - Empresa Transportista (si aplica)
  - Chofer (si el documento le pertenece)
- ✅ **Frontend completo**:
  - Icono de campana/alarma con badge de cantidad
  - Popup/dropdown con lista de notificaciones
  - Marcado automático como "leída" al visualizar
  - Opción para borrar notificaciones
  - Historial persistente de notificaciones
- ✅ **Notificaciones en tiempo real** vía WebSocket

---

## 📊 ANÁLISIS TÉCNICO

### Estado Actual del Código

#### Backend - Microservicio Documentos

**Archivos clave identificados:**

1. **`apps/documentos/src/services/approval.service.ts`** (líneas 460-500)
   - ✅ Método `rejectDocument` actualiza correctamente el documento
   - ❌ NO envía notificaciones
   - ❌ NO llama a `AlertService.processDocumentRejected`

2. **`apps/documentos/src/controllers/approval.controller.ts`** (líneas 167-212)
   - ✅ Endpoint `POST /api/docs/approval/pending/:id/reject` funciona
   - ✅ Registra auditoría
   - ❌ NO desencadena notificaciones

3. **`apps/documentos/src/services/alert.service.ts`** (líneas 44-84)
   - ✅ Método `processDocumentRejected` existe y está bien implementado
   - ❌ Nunca se llama desde el flujo de rechazo

4. **Schema de Base de Datos**
   - ❌ **NO existe tabla de notificaciones internas** para usuarios de la plataforma
   - ⚠️ Existe `NotificationLog` pero es solo para notificaciones WhatsApp externas

5. **`apps/documentos/src/services/websocket.service.ts`** (líneas 110-142)
   - ✅ Método `notifyDocumentStatusChange` para WebSocket
   - ✅ Envía a empresa y superadmins
   - ❌ Solo se usa desde el worker de validación IA, no desde rechazo manual

6. **`apps/documentos/src/controllers/dashboard.controller.ts`** (líneas 13-22)
   - ✅ Función `getAdminStats` cuenta rechazados
   - ❌ No existe endpoint para listar documentos rechazados

#### Frontend

**Archivos clave identificados:**

1. **`apps/frontend/src/features/documentos/api/documentosApiSlice.ts`** (líneas 1099-1103)
   - ✅ Endpoint `getPortalTransportistaDocumentosRechazados` existe
   - ⚠️ Solo para portal de transportistas
   - ❌ No existe endpoint general para dashboard principal

2. **`apps/frontend/src/features/documentos/pages/DocumentosMainPage.tsx`**
   - ✅ Muestra dashboard con semáforos
   - ❌ No tiene vista de documentos rechazados

3. **`apps/frontend/src/services/websocket.service.ts`**
   - ✅ Escucha eventos WebSocket
   - ✅ Muestra toasts para notificaciones
   - ⚠️ Podría mejorar el manejo de notificaciones de rechazo

---

## 🏗️ SOLUCIÓN PROPUESTA

### FASE 1: Backend - Endpoint de Documentos Rechazados (2-3 días)

#### 1.1 Crear endpoint para listar documentos rechazados
**Archivo:** `apps/documentos/src/controllers/dashboard.controller.ts`

```typescript
/**
 * GET /api/docs/dashboard/rejected - Lista de documentos rechazados
 */
static async getRejectedDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prisma = (await import('../config/database')).db.getClient();
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const entityType = req.query.entityType as string | undefined;
    const skip = (page - 1) * limit;

    // Filtros base
    const whereBase: any = {
      tenantEmpresaId: req.tenantId!,
      status: 'RECHAZADO' as any,
      archived: false,
    };

    // Filtro por tipo de entidad
    if (entityType) {
      whereBase.entityType = entityType;
    }

    // Filtro por empresa según rol
    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN_INTERNO) {
      whereBase.dadorCargaId = user.empresaId!;
    }

    // Consultar documentos rechazados con paginación
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: whereBase,
        include: {
          template: { select: { id: true, name: true, entityType: true } },
        },
        orderBy: [
          { rejectedAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.document.count({ where: whereBase }),
    ]);

    // Enriquecer con nombres de entidad
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        const entityNaturalId = await getEntityNaturalId(doc.entityType, doc.entityId);
        return {
          ...doc,
          entityNaturalId,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedDocs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    AppLogger.error('💥 Error obteniendo documentos rechazados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno',
      code: 'REJECTED_DOCUMENTS_ERROR',
    });
  }
}
```

#### 1.2 Agregar ruta en `dashboard.routes.ts`
```typescript
router.get('/rejected', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), 
  DashboardController.getRejectedDocuments
);
```

#### 1.3 Crear endpoint de estadísticas de rechazos
**Archivo:** `apps/documentos/src/controllers/dashboard.controller.ts`

```typescript
/**
 * GET /api/docs/dashboard/rejected/stats - Estadísticas de documentos rechazados
 */
static async getRejectedStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const prisma = (await import('../config/database')).db.getClient();
    const user = req.user!;
    const tenantEmpresaId = req.tenantId!;

    // Filtros base
    const whereBase: any = {
      tenantEmpresaId,
      status: 'RECHAZADO' as any,
      archived: false,
    };

    // Filtro por empresa según rol
    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN_INTERNO) {
      whereBase.dadorCargaId = user.empresaId!;
    }

    // Estadísticas por tipo de entidad
    const byEntityType = await prisma.document.groupBy({
      by: ['entityType'],
      where: whereBase,
      _count: { entityType: true },
    });

    // Estadísticas por template
    const byTemplate = await prisma.document.groupBy({
      by: ['templateId'],
      where: whereBase,
      _count: { templateId: true },
      orderBy: { _count: { templateId: 'desc' } },
      take: 10,
    });

    // Obtener nombres de templates
    const templateIds = byTemplate.map((t: any) => t.templateId);
    const templates = await prisma.documentTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true },
    });

    // Top motivos de rechazo
    const rejectedDocs = await prisma.document.findMany({
      where: whereBase,
      select: { rejectionReason: true },
      take: 100,
    });

    const reasonCounts: Record<string, number> = {};
    rejectedDocs.forEach((doc) => {
      if (doc.rejectionReason) {
        const key = doc.rejectionReason.substring(0, 100); // Truncar para agrupar
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
      }
    });

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Rechazados hoy y últimos 7 días
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [rejectedToday, rejectedLast7Days] = await Promise.all([
      prisma.document.count({
        where: {
          ...whereBase,
          rejectedAt: { gte: startOfDay },
        },
      }),
      prisma.document.count({
        where: {
          ...whereBase,
          rejectedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        rejectedToday,
        rejectedLast7Days,
        byEntityType: byEntityType.map((item: any) => ({
          entityType: item.entityType,
          count: Number(item._count.entityType),
        })),
        byTemplate: byTemplate.map((item: any) => ({
          templateId: item.templateId,
          templateName: templates.find((t) => t.id === item.templateId)?.name || `Template #${item.templateId}`,
          count: Number(item._count.templateId),
        })),
        topReasons,
      },
    });
  } catch (error) {
    AppLogger.error('💥 Error obteniendo estadísticas de rechazados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno',
      code: 'REJECTED_STATS_ERROR',
    });
  }
}
```

---

### FASE 2: Backend - Sistema de Notificaciones Interno (4-5 días)

#### 2.0 Crear tabla de notificaciones en la base de datos

**Archivo nuevo:** `apps/documentos/src/prisma/migrations/YYYYMMDDHHMMSS_create_internal_notifications/migration.sql`

```sql
-- Tabla de notificaciones internas para usuarios de la plataforma
CREATE TABLE "internal_notifications" (
    "id" SERIAL NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL, -- ID del usuario destinatario (del backend principal)
    "type" VARCHAR(50) NOT NULL, -- 'DOCUMENT_REJECTED', 'DOCUMENT_APPROVED', 'DOCUMENT_EXPIRING', etc.
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500), -- URL para navegar al hacer clic (ej: /documentos/document/123)
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    
    -- Metadatos relacionados (JSON)
    "metadata" JSONB,
    
    -- Relacionado con documento (si aplica)
    "document_id" INTEGER,
    "equipo_id" INTEGER,
    "remito_id" INTEGER,
    
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notifications_pkey" PRIMARY KEY ("id")
);

-- Índices para performance
CREATE INDEX "internal_notifications_user_id_read_idx" ON "internal_notifications"("user_id", "read", "deleted");
CREATE INDEX "internal_notifications_user_id_created_at_idx" ON "internal_notifications"("user_id", "created_at" DESC);
CREATE INDEX "internal_notifications_tenant_empresa_id_idx" ON "internal_notifications"("tenant_empresa_id");
CREATE INDEX "internal_notifications_document_id_idx" ON "internal_notifications"("document_id");
CREATE INDEX "internal_notifications_type_idx" ON "internal_notifications"("type");
```

**Archivo:** `apps/documentos/src/prisma/schema.prisma` (agregar al final)

```prisma
// =================================
// NOTIFICACIONES INTERNAS
// =================================

enum InternalNotificationType {
  DOCUMENT_REJECTED
  DOCUMENT_APPROVED
  DOCUMENT_EXPIRING
  DOCUMENT_EXPIRED
  DOCUMENT_UPLOADED
  EQUIPO_INCOMPLETE
  EQUIPO_COMPLETE
  SYSTEM_ALERT
}

enum NotificationPriority {
  low
  normal
  high
  urgent
}

model InternalNotification {
  id              Int      @id @default(autoincrement())
  tenantEmpresaId Int      @map("tenant_empresa_id")
  userId          Int      @map("user_id")
  
  type            InternalNotificationType
  title           String   @db.VarChar(200)
  message         String   @db.Text
  link            String?  @db.VarChar(500)
  priority        NotificationPriority @default(normal)
  
  read            Boolean  @default(false)
  readAt          DateTime? @map("read_at")
  deleted         Boolean  @default(false)
  deletedAt       DateTime? @map("deleted_at")
  
  // Metadatos adicionales
  metadata        Json?
  
  // Relaciones opcionales
  documentId      Int?     @map("document_id")
  equipoId        Int?     @map("equipo_id")
  remitoId        Int?     @map("remito_id")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([userId, read, deleted])
  @@index([userId, createdAt(sort: Desc)])
  @@index([tenantEmpresaId])
  @@index([documentId])
  @@index([type])
  @@map("internal_notifications")
}
```

#### 2.1 Crear servicio de notificaciones internas

**Archivo nuevo:** `apps/documentos/src/services/internal-notification.service.ts`

```typescript
import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { webSocketService } from './websocket.service';

export interface CreateInternalNotificationDto {
  tenantEmpresaId: number;
  userId: number;
  type: 'DOCUMENT_REJECTED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_EXPIRING' | 'DOCUMENT_EXPIRED' | 'DOCUMENT_UPLOADED' | 'EQUIPO_INCOMPLETE' | 'EQUIPO_COMPLETE' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  documentId?: number;
  equipoId?: number;
  remitoId?: number;
}

/**
 * Servicio para gestionar notificaciones internas de la plataforma
 */
export class InternalNotificationService {
  
  /**
   * Crear una notificación interna
   */
  static async create(data: CreateInternalNotificationDto): Promise<any> {
    try {
      const notification = await db.getClient().internalNotification.create({
        data: {
          tenantEmpresaId: data.tenantEmpresaId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
          metadata: data.metadata || {},
          documentId: data.documentId,
          equipoId: data.equipoId,
          remitoId: data.remitoId,
        },
      });

      // Enviar notificación en tiempo real vía WebSocket
      this.sendRealtimeNotification(notification);

      AppLogger.info(`📬 Notificación interna creada: ${notification.id} para usuario ${data.userId}`);

      return notification;
    } catch (error) {
      AppLogger.error('Error creando notificación interna:', error);
      throw error;
    }
  }

  /**
   * Crear notificaciones para múltiples usuarios
   */
  static async createMany(dataArray: CreateInternalNotificationDto[]): Promise<void> {
    try {
      const notifications = await db.getClient().internalNotification.createMany({
        data: dataArray.map((data) => ({
          tenantEmpresaId: data.tenantEmpresaId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
          metadata: data.metadata || {},
          documentId: data.documentId,
          equipoId: data.equipoId,
          remitoId: data.remitoId,
        })),
      });

      AppLogger.info(`📬 ${dataArray.length} notificaciones internas creadas`);

      // Enviar notificaciones en tiempo real
      dataArray.forEach((data) => {
        this.sendRealtimeNotificationToUser(data.userId, {
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          priority: data.priority || 'normal',
        });
      });
    } catch (error) {
      AppLogger.error('Error creando notificaciones internas múltiples:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario (no borradas)
   */
  static async getUserNotifications(
    userId: number,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; pages: number }; unreadCount: number }> {
    try {
      const { unreadOnly = false, limit = 20, page = 1 } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        userId,
        deleted: false,
      };

      if (unreadOnly) {
        where.read = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db.getClient().internalNotification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.getClient().internalNotification.count({ where }),
        db.getClient().internalNotification.count({
          where: { userId, read: false, deleted: false },
        }),
      ]);

      return {
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo notificaciones del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      return await db.getClient().internalNotification.count({
        where: {
          userId,
          read: false,
          deleted: false,
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo contador de no leídas:', error);
      return 0;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          id: notificationId,
          userId, // Seguridad: solo el propietario puede marcar como leída
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      AppLogger.debug(`Notificación ${notificationId} marcada como leída`);
    } catch (error) {
      AppLogger.error('Error marcando notificación como leída:', error);
    }
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   */
  static async markAllAsRead(userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          userId,
          read: false,
          deleted: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      AppLogger.info(`Todas las notificaciones del usuario ${userId} marcadas como leídas`);
    } catch (error) {
      AppLogger.error('Error marcando todas como leídas:', error);
    }
  }

  /**
   * Borrar (soft delete) una notificación
   */
  static async deleteNotification(notificationId: number, userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          id: notificationId,
          userId, // Seguridad: solo el propietario puede borrar
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      AppLogger.debug(`Notificación ${notificationId} borrada`);
    } catch (error) {
      AppLogger.error('Error borrando notificación:', error);
    }
  }

  /**
   * Borrar todas las notificaciones leídas de un usuario
   */
  static async deleteAllRead(userId: number): Promise<void> {
    try {
      await db.getClient().internalNotification.updateMany({
        where: {
          userId,
          read: true,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      AppLogger.info(`Todas las notificaciones leídas del usuario ${userId} borradas`);
    } catch (error) {
      AppLogger.error('Error borrando todas las leídas:', error);
    }
  }

  /**
   * Enviar notificación en tiempo real vía WebSocket
   */
  private static sendRealtimeNotification(notification: any): void {
    try {
      if (!webSocketService) return;

      webSocketService.notifyUser(notification.userId, {
        type: 'NEW_NOTIFICATION',
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          priority: notification.priority,
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      AppLogger.error('Error enviando notificación en tiempo real:', error);
    }
  }

  /**
   * Enviar notificación en tiempo real a un usuario específico
   */
  private static sendRealtimeNotificationToUser(userId: number, data: any): void {
    try {
      if (!webSocketService) return;

      webSocketService.notifyUser(userId, {
        type: 'NEW_NOTIFICATION',
        notification: data,
      });
    } catch (error) {
      AppLogger.error('Error enviando notificación en tiempo real:', error);
    }
  }

  /**
   * Limpiar notificaciones antiguas (job de mantenimiento)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.getClient().internalNotification.deleteMany({
        where: {
          deleted: true,
          deletedAt: {
            lte: cutoffDate,
          },
        },
      });

      AppLogger.info(`🧹 Limpieza de notificaciones: ${result.count} notificaciones antiguas eliminadas`);
    } catch (error) {
      AppLogger.error('Error en limpieza de notificaciones:', error);
    }
  }
}
```

#### 2.2 Crear servicio para identificar responsables
**Archivo nuevo:** `apps/documentos/src/services/document-stakeholders.service.ts`

```typescript
import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

/**
 * Stakeholder (responsable) en la cadena de un documento
 */
export interface DocumentStakeholder {
  role: UserRole;
  userId: number;
  email?: string;
  tenantEmpresaId: number;
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  choferId?: number;
}

/**
 * Servicio para identificar todos los responsables (stakeholders) de un documento
 */
export class DocumentStakeholdersService {
  
  /**
   * Obtener todos los stakeholders de un documento
   */
  static async getDocumentStakeholders(documentId: number): Promise<DocumentStakeholder[]> {
    try {
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          dadorCargaId: true,
          tenantEmpresaId: true,
        },
      });

      if (!document) {
        AppLogger.warn(`Documento ${documentId} no encontrado`);
        return [];
      }

      const stakeholders: DocumentStakeholder[] = [];

      // 1. Admins y SuperAdmins de la plataforma (backend)
      const admins = await this.getAdminUsers(document.tenantEmpresaId);
      stakeholders.push(...admins);

      // 2. Dador de Carga (empresa propietaria)
      const dadorStakeholders = await this.getDadorStakeholders(document.dadorCargaId, document.tenantEmpresaId);
      stakeholders.push(...dadorStakeholders);

      // 3. Empresa Transportista (si aplica)
      const transportistaStakeholders = await this.getTransportistaStakeholders(
        document.entityType,
        document.entityId,
        document.dadorCargaId,
        document.tenantEmpresaId
      );
      stakeholders.push(...transportistaStakeholders);

      // 4. Chofer (si el documento le pertenece)
      if (document.entityType === 'CHOFER') {
        const choferStakeholders = await this.getChoferStakeholders(
          document.entityId,
          document.dadorCargaId,
          document.tenantEmpresaId
        );
        stakeholders.push(...choferStakeholders);
      }

      return stakeholders;
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders:', error);
      return [];
    }
  }

  /**
   * Obtener admins de la plataforma
   */
  private static async getAdminUsers(tenantEmpresaId: number): Promise<DocumentStakeholder[]> {
    try {
      // Consultar al backend principal para obtener admins y admins internos
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(`${backendUrl}/api/users?role=ADMIN,SUPERADMIN,ADMIN_INTERNO&empresaId=${tenantEmpresaId}`, {
        headers: {
          'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching admin users: ${response.status}`);
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: user.role as UserRole,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo admins:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders del Dador de Carga
   */
  private static async getDadorStakeholders(
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      // Obtener usuarios del rol DADOR_DE_CARGA asociados a este dador desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=DADOR_DE_CARGA&empresaId=${tenantEmpresaId}&dadorCargaId=${dadorCargaId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching dador users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.DADOR_DE_CARGA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        dadorCargaId: dadorCargaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del dador:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders de la Empresa Transportista
   */
  private static async getTransportistaStakeholders(
    entityType: string,
    entityId: number,
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      let empresaTransportistaId: number | null = null;

      // Determinar la empresa transportista según el tipo de entidad
      if (entityType === 'EMPRESA_TRANSPORTISTA') {
        empresaTransportistaId = entityId;
      } else if (entityType === 'CHOFER') {
        const chofer = await db.getClient().chofer.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = chofer?.empresaTransportistaId ?? null;
      } else if (entityType === 'CAMION') {
        const camion = await db.getClient().camion.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = camion?.empresaTransportistaId ?? null;
      } else if (entityType === 'ACOPLADO') {
        const acoplado = await db.getClient().acoplado.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = acoplado?.empresaTransportistaId ?? null;
      }

      if (!empresaTransportistaId) return [];

      // Obtener usuarios del rol TRANSPORTISTA asociados a esta empresa desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=TRANSPORTISTA&empresaId=${tenantEmpresaId}&empresaTransportistaId=${empresaTransportistaId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching transportista users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.TRANSPORTISTA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        empresaTransportistaId: empresaTransportistaId!,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del transportista:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders del Chofer
   */
  private static async getChoferStakeholders(
    choferId: number,
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      // Obtener usuarios del rol CHOFER asociados a este chofer desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=CHOFER&empresaId=${tenantEmpresaId}&choferId=${choferId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching chofer users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.CHOFER,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        choferId: choferId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del chofer:', error);
      return [];
    }
  }
}
```

#### 2.3 Crear servicio de notificaciones de rechazo
**Archivo nuevo:** `apps/documentos/src/services/rejection-notification.service.ts`

```typescript
import { AppLogger } from '../config/logger';
import { DocumentStakeholdersService } from './document-stakeholders.service';
import { InternalNotificationService } from './internal-notification.service';
import { db } from '../config/database';

/**
 * Servicio para enviar notificaciones internas de rechazo de documentos
 */
export class RejectionNotificationService {
  
  /**
   * Notificar rechazo de documento a todos los stakeholders
   */
  static async notifyDocumentRejection(documentId: number, rejectionReason: string): Promise<void> {
    try {
      AppLogger.info(`📢 Enviando notificaciones de rechazo para documento ${documentId}`);

      // 1. Obtener documento con detalles
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: {
          template: { select: { name: true } },
        },
      });

      if (!document) {
        AppLogger.warn(`Documento ${documentId} no encontrado`);
        return;
      }

      // 2. Obtener nombre de la entidad
      const entityName = await this.getEntityName(document.entityType, document.entityId);

      // 3. Obtener todos los stakeholders
      const stakeholders = await DocumentStakeholdersService.getDocumentStakeholders(documentId);

      if (stakeholders.length === 0) {
        AppLogger.warn(`No se encontraron stakeholders para documento ${documentId}`);
        return;
      }

      // 4. Enviar notificaciones internas a todos los stakeholders
      await this.sendInternalNotifications(document, rejectionReason, stakeholders, entityName);

      AppLogger.info(`✅ Notificaciones de rechazo enviadas para documento ${documentId}`);
    } catch (error) {
      AppLogger.error('💥 Error enviando notificaciones de rechazo:', error);
    }
  }

  /**
   * Construir título y mensaje de notificación
   */
  private static buildNotificationContent(data: {
    documentType: string;
    entityType: string;
    entityName: string;
    rejectionReason: string;
  }): { title: string; message: string } {
    return {
      title: `Documento Rechazado: ${data.documentType}`,
      message: `El documento "${data.documentType}" de ${this.translateEntityType(data.entityType)} "${data.entityName}" ha sido rechazado. Motivo: ${data.rejectionReason}`,
    };
  }

  /**
   * Enviar notificaciones internas a todos los stakeholders
   */
  private static async sendInternalNotifications(
    document: any,
    rejectionReason: string,
    stakeholders: any[],
    entityName: string
  ): Promise<void> {
    try {
      if (stakeholders.length === 0) {
        AppLogger.warn(`No hay stakeholders para notificar sobre documento ${document.id}`);
        return;
      }

      const { title, message } = this.buildNotificationContent({
        documentType: document.template.name,
        entityType: document.entityType,
        entityName,
        rejectionReason,
      });

      const link = `/documentos/document/${document.id}`;

      // Crear notificaciones para todos los stakeholders
      const notificationsData = stakeholders.map((stakeholder) => ({
        tenantEmpresaId: stakeholder.tenantEmpresaId,
        userId: stakeholder.userId,
        type: 'DOCUMENT_REJECTED' as const,
        title,
        message,
        link,
        priority: 'high' as const,
        documentId: document.id,
        metadata: {
          documentType: document.template.name,
          entityType: document.entityType,
          entityName,
          rejectionReason,
          stakeholderRole: stakeholder.role,
        },
      }));

      await InternalNotificationService.createMany(notificationsData);

      AppLogger.info(`📬 ${notificationsData.length} notificaciones internas creadas para documento ${document.id}`);
    } catch (error) {
      AppLogger.error('Error enviando notificaciones internas:', error);
    }
  }

  /**
   * Obtener nombre de la entidad
   */
  private static async getEntityName(entityType: string, entityId: number): Promise<string> {
    try {
      switch (entityType) {
        case 'CHOFER': {
          const chofer = await db.getClient().chofer.findUnique({
            where: { id: entityId },
            select: { nombre: true, apellido: true, dni: true },
          });
          return chofer ? `${chofer.nombre} ${chofer.apellido} (DNI: ${chofer.dni})` : `Chofer #${entityId}`;
        }
        case 'CAMION': {
          const camion = await db.getClient().camion.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          return camion ? `Camión ${camion.patente}` : `Camión #${entityId}`;
        }
        case 'ACOPLADO': {
          const acoplado = await db.getClient().acoplado.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          return acoplado ? `Acoplado ${acoplado.patente}` : `Acoplado #${entityId}`;
        }
        case 'EMPRESA_TRANSPORTISTA': {
          const empresa = await db.getClient().empresaTransportista.findUnique({
            where: { id: entityId },
            select: { razonSocial: true },
          });
          return empresa ? empresa.razonSocial : `Empresa #${entityId}`;
        }
        case 'DADOR': {
          const dador = await db.getClient().dadorCarga.findUnique({
            where: { id: entityId },
            select: { razonSocial: true },
          });
          return dador ? dador.razonSocial : `Dador #${entityId}`;
        }
        default:
          return `Entidad #${entityId}`;
      }
    } catch (error) {
      AppLogger.error('Error obteniendo nombre de entidad:', error);
      return `Entidad #${entityId}`;
    }
  }

  /**
   * Traducir tipo de entidad
   */
  private static translateEntityType(entityType: string): string {
    const translations: Record<string, string> = {
      CHOFER: 'Chofer',
      CAMION: 'Camión',
      ACOPLADO: 'Acoplado',
      EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
      DADOR: 'Dador de Carga',
    };
    return translations[entityType] || entityType;
  }
}
```

#### 2.4 Crear controlador y rutas de notificaciones

**Archivo nuevo:** `apps/documentos/src/controllers/notifications.controller.ts`

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { InternalNotificationService } from '../services/internal-notification.service';
import { AppLogger } from '../config/logger';

/**
 * Controlador de Notificaciones Internas
 */
export class NotificationsController {
  
  /**
   * GET /api/docs/notifications - Obtener notificaciones del usuario
   */
  static async getUserNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await InternalNotificationService.getUserNotifications(userId, {
        page,
        limit,
        unreadOnly,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      AppLogger.error('Error obteniendo notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'GET_NOTIFICATIONS_ERROR' });
    }
  }

  /**
   * GET /api/docs/notifications/unread-count - Obtener contador de no leídas
   */
  static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const count = await InternalNotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo contador:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'GET_UNREAD_COUNT_ERROR' });
    }
  }

  /**
   * PATCH /api/docs/notifications/:id/read - Marcar como leída
   */
  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const notificationId = parseInt(req.params.id);
      await InternalNotificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notificación marcada como leída',
      });
    } catch (error) {
      AppLogger.error('Error marcando como leída:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'MARK_READ_ERROR' });
    }
  }

  /**
   * POST /api/docs/notifications/mark-all-read - Marcar todas como leídas
   */
  static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      await InternalNotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
      });
    } catch (error) {
      AppLogger.error('Error marcando todas como leídas:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'MARK_ALL_READ_ERROR' });
    }
  }

  /**
   * DELETE /api/docs/notifications/:id - Borrar notificación
   */
  static async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      const notificationId = parseInt(req.params.id);
      await InternalNotificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notificación borrada',
      });
    } catch (error) {
      AppLogger.error('Error borrando notificación:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'DELETE_NOTIFICATION_ERROR' });
    }
  }

  /**
   * POST /api/docs/notifications/delete-all-read - Borrar todas las leídas
   */
  static async deleteAllRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'UNAUTHORIZED' });
        return;
      }

      await InternalNotificationService.deleteAllRead(userId);

      res.json({
        success: true,
        message: 'Todas las notificaciones leídas borradas',
      });
    } catch (error) {
      AppLogger.error('Error borrando todas las leídas:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'DELETE_ALL_READ_ERROR' });
    }
  }
}
```

**Archivo nuevo:** `apps/documentos/src/routes/notifications.routes.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { NotificationsController } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);

// Obtener notificaciones del usuario
router.get('/', NotificationsController.getUserNotifications);

// Obtener contador de no leídas
router.get('/unread-count', NotificationsController.getUnreadCount);

// Marcar como leída
router.patch('/:id/read', NotificationsController.markAsRead);

// Marcar todas como leídas
router.post('/mark-all-read', NotificationsController.markAllAsRead);

// Borrar notificación
router.delete('/:id', NotificationsController.deleteNotification);

// Borrar todas las leídas
router.post('/delete-all-read', NotificationsController.deleteAllRead);

export default router;
```

**Agregar en:** `apps/documentos/src/routes/index.ts`

```typescript
import notificationsRoutes from './notifications.routes';

// ... dentro del router principal
router.use('/notifications', notificationsRoutes);
```

#### 2.5 Actualizar servicio WebSocket para notificar a usuarios específicos

**Archivo:** `apps/documentos/src/services/websocket.service.ts` (agregar método)

```typescript
/**
 * Notificar a un usuario específico
 */
public notifyUser(userId: number, data: any): void {
  if (!this.io) {
    AppLogger.warn('WebSocket no inicializado');
    return;
  }

  // Enviar a la room del usuario específico
  this.io.to(`user_${userId}`).emit('notification', data);
  
  AppLogger.debug(`Notificación WebSocket enviada al usuario ${userId}`);
}
```

#### 2.6 Integrar notificaciones en el flujo de rechazo
**Archivo:** `apps/documentos/src/services/approval.service.ts` (modificar líneas 460-500)

```typescript
// Agregar import al inicio del archivo
import { RejectionNotificationService } from './rejection-notification.service';

// Modificar el método rejectDocument
static async rejectDocument(
  documentId: number,
  tenantEmpresaId: number,
  reviewData: { reviewedBy: number; reason: string; reviewNotes?: string }
): Promise<any> {
  if (!reviewData.reason || reviewData.reason.trim().length < 3) {
    throw new Error('Debe especificar un motivo de rechazo');
  }
  
  return db.getClient().$transaction(async (tx) => {
    const document = await tx.document.findFirst({
      where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
      include: { classification: true },
    });
    
    if (!document) throw new Error('Documento no encontrado o no está pendiente de aprobación');

    if (document.classification) {
      const notes = `RECHAZADO: ${reviewData.reason}${reviewData.reviewNotes ? ` | ${reviewData.reviewNotes}` : ''}`;
      await tx.documentClassification.update({
        where: { documentId },
        data: { reviewedAt: new Date(), reviewedBy: reviewData.reviewedBy, reviewNotes: notes },
      });
    }

    const updatedDocument = await tx.document.update({
      where: { id: documentId },
      data: {
        status: 'RECHAZADO' as DocumentStatus,
        validatedAt: new Date(),
        rejectedAt: new Date(),
        rejectedBy: reviewData.reviewedBy,
        rejectionReason: reviewData.reason.trim(),
        rejectionCount: { increment: 1 },
        reviewedAt: new Date(),
        reviewedBy: reviewData.reviewedBy,
        reviewNotes: reviewData.reviewNotes,
      },
    });

    // ✨ NUEVO: Enviar notificaciones de rechazo (best-effort, no bloquea la transacción)
    setImmediate(async () => {
      try {
        await RejectionNotificationService.notifyDocumentRejection(
          documentId,
          reviewData.reason
        );
      } catch (error) {
        AppLogger.error('Error enviando notificaciones de rechazo:', error);
      }
    });

    return updatedDocument;
  });
}
```

---

### FASE 3: Frontend - Sistema de Notificaciones y Vista de Rechazados (3-4 días)

#### 3.1 Agregar endpoints de notificaciones al API slice
**Archivo:** `apps/frontend/src/features/documentos/api/documentosApiSlice.ts`

```typescript
// Agregar dentro de endpoints (builder)

// =============================
// NOTIFICACIONES INTERNAS
// =============================
getNotifications: builder.query<
  { data: any[]; pagination: any; unreadCount: number },
  { page?: number; limit?: number; unreadOnly?: boolean }
>({
  query: ({ page = 1, limit = 20, unreadOnly = false }) => ({
    url: '/notifications',
    params: { page, limit, unreadOnly },
  }),
  transformResponse: (r: any) => ({
    data: r?.data ?? [],
    pagination: r?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
    unreadCount: r?.unreadCount ?? 0,
  }),
  providesTags: ['Notifications'],
}),

getUnreadNotificationsCount: builder.query<number, void>({
  query: () => '/notifications/unread-count',
  transformResponse: (r: any) => r?.data?.count ?? 0,
  providesTags: ['Notifications'],
}),

markNotificationAsRead: builder.mutation<void, number>({
  query: (notificationId) => ({
    url: `/notifications/${notificationId}/read`,
    method: 'PATCH',
  }),
  invalidatesTags: ['Notifications'],
}),

markAllNotificationsAsRead: builder.mutation<void, void>({
  query: () => ({
    url: '/notifications/mark-all-read',
    method: 'POST',
  }),
  invalidatesTags: ['Notifications'],
}),

deleteNotification: builder.mutation<void, number>({
  query: (notificationId) => ({
    url: `/notifications/${notificationId}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Notifications'],
}),

deleteAllReadNotifications: builder.mutation<void, void>({
  query: () => ({
    url: '/notifications/delete-all-read',
    method: 'POST',
  }),
  invalidatesTags: ['Notifications'],
}),

// =============================
// DOCUMENTOS RECHAZADOS
// =============================
getRejectedDocuments: builder.query<
  { data: any[]; pagination: { page: number; limit: number; total: number; pages: number } },
  { page?: number; limit?: number; entityType?: string }
>({
  query: ({ page = 1, limit = 20, entityType }) => ({
    url: '/dashboard/rejected',
    params: { page, limit, entityType },
  }),
  transformResponse: (r: any) => ({
    data: r?.data ?? [],
    pagination: r?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
  }),
  providesTags: ['Documents'],
}),

getRejectedStats: builder.query<any, void>({
  query: () => '/dashboard/rejected/stats',
  transformResponse: (r: any) => r?.data ?? {},
}),
```

#### 3.2 Crear componente de notificaciones (campana con dropdown)
**Archivo nuevo:** `apps/frontend/src/components/notifications/NotificationBell.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  useGetUnreadNotificationsCountQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from '../../features/documentos/api/documentosApiSlice';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, CheckIcon } from '@heroicons/react/20/solid';

/**
 * Componente de campana de notificaciones con dropdown
 */
export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: unreadCount = 0, refetch: refetchCount } = useGetUnreadNotificationsCountQuery(undefined, {
    pollingInterval: 30000, // Actualizar cada 30 segundos
  });

  const { data: notificationsResp, refetch: refetchNotifications } = useGetNotificationsQuery(
    { page: 1, limit: 10, unreadOnly: false },
    { skip: !isOpen }
  );

  const notifications = notificationsResp?.data ?? [];
  const totalUnread = notificationsResp?.unreadCount ?? unreadCount;

  // Mutations
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Manejar WebSocket para nuevas notificaciones
  useEffect(() => {
    // TODO: Conectar WebSocket y escuchar evento 'notification'
    // Cuando llegue una nueva notificación, refetchCount() y refetchNotifications()
  }, [refetchCount, refetchNotifications]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refetchNotifications();
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Marcar como leída si no lo está
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navegar al link si existe
    if (notification.link) {
      navigate(notification.link);
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    refetchNotifications();
    refetchCount();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    refetchNotifications();
    refetchCount();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-300';
      case 'high':
        return 'bg-orange-100 border-orange-300';
      case 'normal':
        return 'bg-blue-100 border-blue-300';
      case 'low':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_REJECTED':
        return '🚫';
      case 'DOCUMENT_APPROVED':
        return '✅';
      case 'DOCUMENT_EXPIRING':
        return '⏰';
      case 'DOCUMENT_EXPIRED':
        return '❌';
      default:
        return '📄';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleDropdown}
        className="relative"
        aria-label="Notificaciones"
      >
        {totalUnread > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-orange-500 animate-pulse" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {totalUnread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </Button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-hidden shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-accent/50">
            <h3 className="font-semibold text-lg">Notificaciones</h3>
            {totalUnread > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <CheckIcon className="h-4 w-4 mr-1" />
                Marcar todas como leídas
              </Button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-[500px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BellIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    } border-l-4 ${getPriorityColor(notification.priority)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Icono y título */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getTypeIcon(notification.type)}</span>
                          <h4 className="font-semibold text-sm truncate">{notification.title}</h4>
                          {!notification.read && (
                            <span className="flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>

                        {/* Mensaje */}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>

                        {/* Timestamp */}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>

                      {/* Botón borrar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-8 w-8 p-0"
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                      >
                        <XMarkIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t bg-accent/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigate('/notificaciones');
                  setIsOpen(false);
                }}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
```

#### 3.3 Integrar campana de notificaciones en el layout principal
**Archivo:** `apps/frontend/src/components/layout/MainLayout.tsx` (o similar)

```typescript
import { NotificationBell } from '../notifications/NotificationBell';

// Dentro del header/navbar, agregar:
<NotificationBell />
```

#### 3.4 Crear página de historial completo de notificaciones (opcional)
**Archivo nuevo:** `apps/frontend/src/pages/NotificationsPage.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useDeleteAllReadNotificationsMutation,
} from '../features/documentos/api/documentosApiSlice';
import { Badge } from '../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notificationsResp, isFetching } = useGetNotificationsQuery({
    page,
    limit: 20,
    unreadOnly: showUnreadOnly,
  });

  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteAllRead] = useDeleteAllReadNotificationsMutation();

  const notifications = notificationsResp?.data ?? [];
  const pagination = notificationsResp?.pagination;
  const unreadCount = notificationsResp?.unreadCount ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? `No leídas (${unreadCount})` : 'Todas'}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              Marcar todas como leídas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => deleteAllRead()}>
            Borrar leídas
          </Button>
        </div>
      </div>

      {/* Notificaciones */}
      <Card className="p-6">
        {isFetching ? (
          <div className="text-center py-8">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tienes notificaciones
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50/50 border-blue-300' : ''
                }`}
                onClick={() => notification.link && navigate(notification.link)}
              >
                {/* Similar al componente del dropdown */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!notification.read && <Badge variant="default">Nueva</Badge>}
                      <Badge variant="outline">{notification.priority}</Badge>
                      <span className="font-semibold">{notification.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <div className="text-sm text-muted-foreground">
              Página {page} de {pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

#### 3.5 Crear página de documentos rechazados
**Archivo nuevo:** `apps/frontend/src/features/documentos/pages/RejectedDocumentsPage.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  useGetRejectedDocumentsQuery,
  useGetRejectedStatsQuery,
} from '../api/documentosApiSlice';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '../../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type EntityTypeFilter = '' | 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA' | 'DADOR';

export default function RejectedDocumentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [entityType, setEntityType] = useState<EntityTypeFilter>('');

  const { data: rejectedResp, isFetching, refetch } = useGetRejectedDocumentsQuery(
    { page, limit, entityType: entityType || undefined },
    { refetchOnMountOrArgChange: true }
  );

  const { data: stats } = useGetRejectedStatsQuery();

  const documents = useMemo(() => rejectedResp?.data ?? [], [rejectedResp]);
  const total = rejectedResp?.pagination?.total ?? 0;
  const pages = rejectedResp?.pagination?.pages ?? 1;

  const handleEntityTypeChange = (newEntityType: EntityTypeFilter) => {
    setEntityType(newEntityType);
    setPage(1);
  };

  const handleBack = () => navigate('/documentos');

  const entityTypeOptions = [
    { value: '', label: 'Todos' },
    { value: 'CHOFER', label: 'Chofer' },
    { value: 'CAMION', label: 'Camión' },
    { value: 'ACOPLADO', label: 'Acoplado' },
    { value: 'EMPRESA_TRANSPORTISTA', label: 'Empresa Transportista' },
    { value: 'DADOR', label: 'Dador de Carga' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            Documentos Rechazados
          </h1>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Rechazados Hoy</div>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedToday}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Últimos 7 días</div>
            <div className="text-2xl font-bold text-orange-600">{stats.rejectedLast7Days}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Top Motivo</div>
            <div className="text-sm font-semibold truncate">
              {stats.topReasons?.[0]?.reason || 'N/A'}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2 flex-wrap">
            {entityTypeOptions.map((option) => (
              <Button
                key={option.value}
                variant={entityType === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleEntityTypeChange(option.value as EntityTypeFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Documents List */}
      <Card className="p-6">
        {isFetching ? (
          <div className="text-center py-8">Cargando...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay documentos rechazados
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/documentos/document/${doc.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">Rechazado</Badge>
                      <Badge variant="outline">{doc.entityType}</Badge>
                      <span className="text-sm font-semibold">{doc.template?.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>Entidad:</strong> {doc.entityNaturalId || `#${doc.entityId}`}
                    </div>
                    <div className="text-sm mb-2">
                      <strong>Motivo:</strong>{' '}
                      <span className="text-red-600">{doc.rejectionReason || 'Sin motivo especificado'}</span>
                    </div>
                    {doc.reviewNotes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Notas:</strong> {doc.reviewNotes}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Archivo: {doc.fileName}</div>
                    <div>
                      Rechazado{' '}
                      {formatDistanceToNow(new Date(doc.rejectedAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                    <div className="text-xs">Rechazos: {doc.rejectionCount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <div className="text-sm text-muted-foreground">
              Página {page} de {pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

#### 3.3 Agregar ruta en el router
**Archivo:** `apps/frontend/src/App.tsx` o el archivo de rutas correspondiente

```typescript
import RejectedDocumentsPage from './features/documentos/pages/RejectedDocumentsPage';

// Agregar dentro de las rutas:
<Route path="/documentos/rechazados" element={<RejectedDocumentsPage />} />
```

#### 3.4 Agregar enlace en el dashboard principal
**Archivo:** `apps/frontend/src/features/documentos/pages/DocumentosMainPage.tsx`

Agregar un botón o tarjeta para acceder a documentos rechazados:

```typescript
// Dentro del render, agregar una tarjeta de documentos rechazados
<Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/documentos/rechazados')}>
  <div className="flex items-center gap-4">
    <div className="p-3 bg-red-100 rounded-lg">
      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-lg">Documentos Rechazados</h3>
      <p className="text-sm text-muted-foreground">
        Ver y gestionar documentos rechazados
      </p>
    </div>
    {dashboardData?.rechazados > 0 && (
      <Badge variant="destructive" className="text-lg px-3 py-1">
        {dashboardData.rechazados}
      </Badge>
    )}
  </div>
</Card>
```

---

### FASE 4: Testing y Validación (2 días)

#### 4.1 Tests Backend
**Archivo nuevo:** `apps/documentos/src/__tests__/rejection-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ApprovalService } from '../services/approval.service';
import { RejectionNotificationService } from '../services/rejection-notification.service';
import { db } from '../config/database';

describe('Rejection Flow', () => {
  let testDocumentId: number;

  beforeAll(async () => {
    // Setup: crear documento de prueba
    const document = await db.getClient().document.create({
      data: {
        templateId: 1,
        entityType: 'CHOFER',
        entityId: 1,
        dadorCargaId: 1,
        tenantEmpresaId: 1,
        fileName: 'test.pdf',
        filePath: '/test/test.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        status: 'PENDIENTE_APROBACION',
      },
    });
    testDocumentId = document.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.getClient().document.delete({ where: { id: testDocumentId } });
  });

  it('should reject document and update status', async () => {
    const result = await ApprovalService.rejectDocument(testDocumentId, 1, {
      reviewedBy: 1,
      reason: 'Documento ilegible',
      reviewNotes: 'Por favor, escanear con mejor calidad',
    });

    expect(result.status).toBe('RECHAZADO');
    expect(result.rejectionReason).toBe('Documento ilegible');
    expect(result.rejectionCount).toBe(1);
  });

  it('should identify all stakeholders for a document', async () => {
    const stakeholders = await DocumentStakeholdersService.getDocumentStakeholders(testDocumentId);

    expect(stakeholders).toBeDefined();
    expect(Array.isArray(stakeholders)).toBe(true);
    expect(stakeholders.length).toBeGreaterThan(0);
  });

  it('should send rejection notifications', async () => {
    // Mock de los servicios de notificación
    const mockNotificationService = jest.spyOn(NotificationService, 'send');
    const mockWebSocketService = jest.spyOn(webSocketService, 'notifyDocumentStatusChange');

    await RejectionNotificationService.notifyDocumentRejection(
      testDocumentId,
      'Documento vencido'
    );

    // Verificar que se llamaron los métodos de notificación
    expect(mockWebSocketService).toHaveBeenCalled();
    // expect(mockNotificationService).toHaveBeenCalled(); // Dependiendo de si hay teléfonos configurados

    mockNotificationService.mockRestore();
    mockWebSocketService.mockRestore();
  });
});
```

#### 4.2 Tests Frontend
**Archivo nuevo:** `apps/frontend/src/features/documentos/pages/__tests__/RejectedDocumentsPage.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import RejectedDocumentsPage from '../RejectedDocumentsPage';
import { store } from '../../../../store';

describe('RejectedDocumentsPage', () => {
  it('should render the page', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <RejectedDocumentsPage />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText(/Documentos Rechazados/i)).toBeInTheDocument();
  });

  // Más tests...
});
```

#### 4.3 Tests de Integración
**Archivo nuevo:** `apps/documentos/src/__tests__/integration/rejection-notifications.integration.test.ts`

- Crear documento
- Rechazarlo
- Verificar que se envían notificaciones WebSocket
- Verificar que se envían notificaciones WhatsApp (si aplica)
- Verificar que el documento aparece en el endpoint `/dashboard/rejected`

---

### FASE 5: Documentación y Despliegue (1 día)

#### 5.1 Actualizar documentación de API
Agregar a `API_ENDPOINTS_REFERENCE.md`:

```markdown
### Dashboard - Documentos Rechazados

#### Listar Documentos Rechazados
GET /api/docs/dashboard/rejected

**Roles permitidos:** ADMIN, SUPERADMIN, ADMIN_INTERNO, DADOR_DE_CARGA

**Query Parameters:**
- page (optional): Número de página (default: 1)
- limit (optional): Resultados por página (default: 20)
- entityType (optional): Filtrar por tipo de entidad (CHOFER, CAMION, ACOPLADO, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "templateId": 1,
      "template": {
        "id": 1,
        "name": "Licencia de Conducir",
        "entityType": "CHOFER"
      },
      "entityType": "CHOFER",
      "entityId": 5,
      "entityNaturalId": "Juan Pérez (DNI: 12345678)",
      "fileName": "licencia.pdf",
      "status": "RECHAZADO",
      "rejectionReason": "Documento vencido",
      "rejectionCount": 1,
      "rejectedAt": "2026-01-14T10:30:00Z",
      "rejectedBy": 1,
      "reviewNotes": "Por favor, subir licencia actualizada"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Estadísticas de Rechazos
GET /api/docs/dashboard/rejected/stats

**Roles permitidos:** ADMIN, SUPERADMIN, ADMIN_INTERNO, DADOR_DE_CARGA

**Response:**
```json
{
  "success": true,
  "data": {
    "rejectedToday": 5,
    "rejectedLast7Days": 32,
    "byEntityType": [
      { "entityType": "CHOFER", "count": 15 },
      { "entityType": "CAMION", "count": 10 }
    ],
    "byTemplate": [
      { "templateId": 1, "templateName": "Licencia de Conducir", "count": 12 },
      { "templateId": 2, "templateName": "VTV", "count": 8 }
    ],
    "topReasons": [
      { "reason": "Documento vencido", "count": 18 },
      { "reason": "Imagen ilegible", "count": 7 }
    ]
  }
}
```
```

#### 5.2 Actualizar changelog
**Archivo:** `CHANGELOG.md`

```markdown
## [Unreleased]

### Added
- Vista completa de documentos rechazados en el dashboard
- Endpoint GET /api/docs/dashboard/rejected para listar documentos rechazados
- Endpoint GET /api/docs/dashboard/rejected/stats para estadísticas de rechazos
- Sistema de notificaciones automáticas al rechazar documentos:
  - Notificaciones WebSocket en tiempo real
  - Notificaciones WhatsApp a todos los responsables (Admin, Dador, Transportista, Chofer)
- Nuevo servicio DocumentStakeholdersService para identificar responsables en la cadena
- Nuevo servicio RejectionNotificationService para enviar notificaciones de rechazo
- Página frontend RejectedDocumentsPage con filtros y paginación
- Tests de integración para el flujo de rechazo y notificaciones

### Changed
- ApprovalService.rejectDocument ahora envía notificaciones automáticas
- Dashboard principal ahora muestra enlace a documentos rechazados con badge de cantidad

### Fixed
- Documentos rechazados ahora son visibles en el tablero (antes solo se contaban)
```

#### 5.3 Crear guía de usuario
**Archivo nuevo:** `docs/GUIA_DOCUMENTOS_RECHAZADOS.md`

```markdown
# Guía de Usuario: Gestión de Documentos Rechazados

## ¿Qué es un documento rechazado?

Un documento rechazado es aquel que ha sido revisado por un administrador o dador de carga y ha sido considerado no válido por algún motivo (documento vencido, ilegible, incorrecto, etc.).

## ¿Cómo accedo a documentos rechazados?

1. Desde el dashboard principal de Documentos
2. Clic en la tarjeta "Documentos Rechazados"
3. O navegar directamente a `/documentos/rechazados`

## ¿Qué información veo?

- **Lista de documentos rechazados** con:
  - Tipo de documento (Licencia, VTV, etc.)
  - Entidad asociada (Chofer, Camión, Acoplado)
  - Motivo de rechazo
  - Fecha de rechazo
  - Cantidad de veces que ha sido rechazado

- **Estadísticas**:
  - Rechazados hoy
  - Rechazados últimos 7 días
  - Top motivos de rechazo

## ¿Cómo filtro los documentos?

Puedes filtrar por tipo de entidad:
- Todos
- Chofer
- Camión
- Acoplado
- Empresa Transportista
- Dador de Carga

## Notificaciones de Rechazo

Cuando un documento es rechazado, **todos los responsables** reciben notificaciones:

### ¿Quiénes reciben notificaciones?

1. **Administradores** (vía WebSocket/email)
2. **Dador de Carga** (vía WebSocket/WhatsApp)
3. **Empresa Transportista** (vía WebSocket)
4. **Chofer** (vía WhatsApp) - si el documento le pertenece

### Contenido de la notificación

La notificación incluye:
- Tipo de documento rechazado
- Entidad asociada (nombre del chofer, patente, etc.)
- **Motivo del rechazo**
- Instrucciones para corregir

## ¿Cómo resubir un documento rechazado?

1. Acceder al detalle del documento rechazado
2. Clic en "Resubir documento"
3. Seleccionar el archivo corregido
4. Confirmar

El documento volverá al estado PENDIENTE y será revisado nuevamente.

## Buenas Prácticas

- ✅ Revisar motivo de rechazo antes de resubir
- ✅ Corregir el error indicado
- ✅ Asegurar que el documento sea legible y vigente
- ✅ Contactar al administrador si el motivo no es claro
```

---

## 📅 CRONOGRAMA

### Semana 1
**Días 1-2: FASE 1 - Backend Endpoints**
- [ ] Crear endpoint `GET /api/docs/dashboard/rejected`
- [ ] Crear endpoint `GET /api/docs/dashboard/rejected/stats`
- [ ] Agregar rutas en `dashboard.routes.ts`
- [ ] Testing de endpoints

**Días 3-6: FASE 2 - Sistema de Notificaciones Interno**
- [ ] Crear migración y tabla `internal_notifications`
- [ ] Actualizar schema de Prisma
- [ ] Crear `InternalNotificationService`
- [ ] Crear `DocumentStakeholdersService`
- [ ] Crear `RejectionNotificationService`
- [ ] Crear `NotificationsController` y rutas
- [ ] Actualizar `WebSocketService` con `notifyUser`
- [ ] Integrar notificaciones en `ApprovalService.rejectDocument`
- [ ] Testing de notificaciones

### Semana 2
**Días 7-9: FASE 3 - Frontend Notificaciones y Vista Rechazados**
- [ ] Agregar endpoints de notificaciones al `documentosApiSlice`
- [ ] Crear componente `NotificationBell`
- [ ] Integrar campana en layout principal
- [ ] Crear página `NotificationsPage` (historial completo)
- [ ] Agregar endpoints de rechazados al `documentosApiSlice`
- [ ] Crear `RejectedDocumentsPage`
- [ ] Agregar rutas y navegación
- [ ] Conectar WebSocket para notificaciones en tiempo real
- [ ] Testing frontend

**Día 10: FASE 4 - Testing Integral**
- [ ] Tests de integración backend
- [ ] Tests E2E frontend
- [ ] Tests de notificaciones

**Día 11: FASE 5 - Documentación y Deploy**
- [ ] Actualizar documentación API
- [ ] Crear guía de usuario
- [ ] Actualizar CHANGELOG
- [ ] Deploy a staging

**Día 12: Validación y Producción**
- [ ] Validación en staging con usuarios
- [ ] Ajustes finales
- [ ] Deploy a producción
- [ ] Monitoreo post-deploy

---

## 🧪 CRITERIOS DE ACEPTACIÓN

### Problema 1: Tablero de Rechazados

✅ **Criterio 1:** Existe un endpoint `/api/docs/dashboard/rejected` que devuelve lista paginada de documentos rechazados
✅ **Criterio 2:** El endpoint soporta filtros por `entityType`
✅ **Criterio 3:** Existe una página frontend `/documentos/rechazados` accesible desde el dashboard
✅ **Criterio 4:** La página muestra:
   - Lista de documentos rechazados con detalles
   - Motivo de rechazo visible
   - Filtros funcionales
   - Paginación
✅ **Criterio 5:** El dashboard principal muestra enlace a documentos rechazados con badge de cantidad

### Problema 2: Notificaciones de Rechazo

✅ **Criterio 6:** Al rechazar un documento, se identifican automáticamente todos los stakeholders (usuarios)
✅ **Criterio 7:** Se crean notificaciones internas en la BD para:
   - Admins/SuperAdmins
   - Admin Interno
   - Dador de Carga (usuarios del dador)
   - Empresa Transportista (usuarios de la empresa)
   - Chofer (usuarios asociados al chofer, si aplica)
✅ **Criterio 8:** Las notificaciones se envían en tiempo real vía WebSocket
✅ **Criterio 9:** Las notificaciones incluyen:
   - Tipo de documento
   - Entidad asociada
   - **Motivo de rechazo**
   - Link directo al documento
   - Prioridad (high para rechazos)
✅ **Criterio 10:** El sistema de notificaciones no bloquea el flujo de rechazo (best-effort)
✅ **Criterio 11:** Frontend muestra:
   - Icono de campana con badge de cantidad no leídas
   - Dropdown con lista de últimas notificaciones
   - Marca automática como leída al visualizar
   - Opción para borrar notificaciones
✅ **Criterio 12:** Las notificaciones persisten en la BD hasta que el usuario las borre manualmente

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Sobrecarga de notificaciones
**Mitigación:** 
- Paginación en el listado de notificaciones
- Límite de notificaciones mostradas en dropdown (10 últimas)
- Job de limpieza automática de notificaciones antiguas borradas (>90 días)

### Riesgo 2: Notificaciones duplicadas
**Mitigación:** 
- Índices en BD para prevenir creación duplicada
- Verificación de notificación existente antes de crear (opcional)

### Riesgo 3: Stakeholders no identificados correctamente
**Mitigación:**
- Tests exhaustivos de `DocumentStakeholdersService`
- Logs detallados de stakeholders identificados
- Fallback a notificación de admins si falla identificación

### Riesgo 4: Performance en listado de rechazados
**Mitigación:**
- Paginación obligatoria (max 100 por página)
- Índices en BD: `status`, `rejectedAt`, `tenantEmpresaId`
- Cache de resultados en frontend (RTK Query)

### Riesgo 5: Performance de WebSocket con muchos usuarios conectados
**Mitigación:**
- Usar rooms de Socket.IO por usuario (`user_${userId}`)
- Limitar eventos WebSocket a usuarios relevantes
- Considerar Redis adapter para WebSocket en producción

### Riesgo 6: Integración con backend principal para usuarios
**Mitigación:**
- Usar endpoint interno con token de servicio
- Implementar fallback si el backend no responde
- Cache de usuarios en Redis (opcional)

---

## 📊 MÉTRICAS DE ÉXITO

### Métricas Técnicas
- ✅ Tiempo de respuesta endpoint `/dashboard/rejected` < 500ms
- ✅ Tiempo de respuesta endpoint `/notifications` < 300ms
- ✅ 100% de notificaciones internas creadas correctamente
- ✅ > 95% de notificaciones WebSocket entregadas en tiempo real
- ✅ 0 errores en producción relacionados con el flujo de rechazo
- ✅ Tiempo de carga del dropdown de notificaciones < 200ms

### Métricas de Usuario
- ✅ Reducción del 50% en consultas de "¿dónde están mis documentos rechazados?"
- ✅ Tiempo promedio de corrección de documentos rechazados < 24 horas
- ✅ Satisfacción de usuarios > 8/10 con el nuevo flujo

---

## 🔧 CONFIGURACIÓN REQUERIDA

### Variables de Entorno

**Backend (Documentos):**
```env
# URL del backend principal para consultar usuarios
BACKEND_API_URL=http://backend:3000

# Token para autenticación interna entre servicios
INTERNAL_SERVICE_TOKEN=secret_token_here
```

**Frontend:**
```env
# URL del microservicio de documentos
VITE_DOCUMENTOS_API_URL=https://api.example.com/api/docs
```

### Base de Datos

**Índices adicionales recomendados:**
```sql
-- Índice para mejorar performance en listado de rechazados
CREATE INDEX IF NOT EXISTS idx_documents_rejected_status 
ON documents (tenant_empresa_id, status, rejected_at DESC) 
WHERE status = 'RECHAZADO' AND archived = false;

-- Índice para estadísticas por entidad
CREATE INDEX IF NOT EXISTS idx_documents_rejected_entity 
ON documents (tenant_empresa_id, entity_type, status) 
WHERE status = 'RECHAZADO' AND archived = false;

-- NOTA: Los índices para internal_notifications ya están incluidos en la migración
```

---

## 📞 CONTACTO Y SOPORTE

**Equipo de Desarrollo:**
- Backend: [Equipo Backend]
- Frontend: [Equipo Frontend]
- QA: [Equipo QA]

**Responsable del Proyecto:** [Nombre]

**Canal de Comunicación:** #documentos-rechazados (Slack)

---

## ✅ CHECKLIST FINAL

Antes de considerar completada la implementación:

### Backend
- [ ] Endpoints creados y documentados
- [ ] Notificaciones implementadas y testeadas
- [ ] Tests unitarios > 80% coverage
- [ ] Tests de integración pasando
- [ ] Migraciones de BD ejecutadas
- [ ] Índices creados
- [ ] Logs configurados
- [ ] Variables de entorno documentadas

### Frontend
- [ ] Página de rechazados implementada
- [ ] Navegación y enlaces agregados
- [ ] Filtros funcionales
- [ ] Paginación implementada
- [ ] Loading states y error handling
- [ ] Tests unitarios pasando
- [ ] Tests E2E pasando
- [ ] Responsive design verificado

### Documentación
- [ ] API endpoints documentados
- [ ] Guía de usuario creada
- [ ] CHANGELOG actualizado
- [ ] README actualizado
- [ ] Diagramas de flujo actualizados

### Despliegue
- [ ] Deploy a staging exitoso
- [ ] Validación con usuarios
- [ ] Deploy a producción
- [ ] Monitoreo configurado
- [ ] Alertas configuradas
- [ ] Rollback plan documentado

---

**Última actualización:** 2026-01-14  
**Versión del documento:** 1.0
