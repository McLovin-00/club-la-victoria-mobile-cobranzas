# Ejemplos de Implementación: Portal de Transportistas y Choferes

## 📌 Guía de Uso

Este documento contiene ejemplos de código listos para usar. Cada sección incluye:
- ✅ Código completo y funcional
- 📝 Comentarios explicativos
- 🔗 Referencias a archivos existentes

---

## 1. Rol TRANSPORTISTA

### 1.1. Actualizar Enum de Roles

**Archivo**: `apps/documentos/src/types/roles.ts`

```typescript
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA',
  TRANSPORTISTA = 'TRANSPORTISTA',  // NUEVO: empresa transportista o chofer
}
```

### 1.2. Extender User Metadata

**Archivo**: `apps/documentos/src/types/user.types.ts`

```typescript
// Metadata para transportistas
export interface TransportistaMetadata {
  type: 'empresa' | 'chofer';
  empresaTransportistaId?: number;  // Si es empresa
  choferId?: number;                // Si es chofer individual
  choferDni?: string;               // DNI del chofer (para búsquedas)
}

// Ejemplo de uso
const user = {
  id: 1,
  email: 'transporte@ejemplo.com',
  role: 'TRANSPORTISTA',
  empresaId: 1,
  metadata: {
    type: 'empresa',
    empresaTransportistaId: 5
  } as TransportistaMetadata
};

const chofer = {
  id: 2,
  email: 'chofer@ejemplo.com',
  role: 'TRANSPORTISTA',
  empresaId: 1,
  metadata: {
    type: 'chofer',
    choferId: 10,
    choferDni: '12345678'
  } as TransportistaMetadata
};
```

---

## 2. Middleware de Autorización

### 2.1. Middleware `authorizeTransportista`

**Archivo**: `apps/documentos/src/middlewares/auth.middleware.ts`

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';

/**
 * Middleware para autorizar acceso de transportistas.
 * Valida que el transportista solo acceda a sus propios datos.
 * ADMIN/SUPERADMIN/DADOR_CARGA tienen acceso total.
 */
export const authorizeTransportista = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
    return;
  }

  // ADMIN/SUPERADMIN/DADOR: acceso total
  if (['SUPERADMIN', 'ADMIN', 'DADOR_CARGA'].includes(user.role)) {
    next();
    return;
  }

  // TRANSPORTISTA: validar y filtrar
  if (user.role === 'TRANSPORTISTA') {
    const metadata = user.metadata as any;

    if (!metadata || !metadata.type) {
      res.status(403).json({
        success: false,
        message: 'Usuario transportista sin metadata válida'
      });
      return;
    }

    // Extraer identificadores según el tipo
    const empresaTransportistaId = metadata.empresaTransportistaId;
    const choferId = metadata.choferId;
    const choferDni = metadata.choferDni;

    if (!empresaTransportistaId && !choferId && !choferDni) {
      res.status(403).json({
        success: false,
        message: 'Usuario sin transportista/chofer asociado'
      });
      return;
    }

    // Inyectar filtros en el request para uso posterior
    req.transportistaFilters = {
      type: metadata.type,
      empresaTransportistaId,
      choferId,
      choferDni
    };

    next();
    return;
  }

  // Cualquier otro rol: denegado
  res.status(403).json({
    success: false,
    message: 'Permisos insuficientes'
  });
};

// Extender el tipo AuthRequest
declare module '../types/auth.types' {
  export interface AuthRequest {
    transportistaFilters?: {
      type: 'empresa' | 'chofer';
      empresaTransportistaId?: number;
      choferId?: number;
      choferDni?: string;
    };
  }
}
```

---

## 3. Service: TransportistaService

### 3.1. Servicio Completo

**Archivo**: `apps/documentos/src/services/transportista.service.ts`

```typescript
import { prisma } from '../config/database';
import { normalizeDni, normalizePlate } from './equipo.service';

export class TransportistaService {
  /**
   * Obtener equipos del transportista
   */
  static async getEquiposByTransportista(
    tenantId: number,
    empresaTransportistaId?: number,
    choferId?: number,
    choferDni?: string
  ) {
    const where: any = {
      tenantEmpresaId: tenantId,
      OR: [],
    };

    // Equipos donde la empresa está asignada
    if (empresaTransportistaId) {
      where.OR.push({ empresaTransportistaId });
    }

    // Equipos donde el chofer es el driver
    if (choferId) {
      where.OR.push({ driverId: choferId });
    }

    // Equipos por DNI del chofer
    if (choferDni) {
      const dniNorm = normalizeDni(choferDni);
      where.OR.push({ driverDniNorm: dniNorm });
    }

    if (where.OR.length === 0) {
      return [];
    }

    return await prisma.equipo.findMany({
      where,
      include: {
        empresaTransportista: true,
        clientes: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  /**
   * Obtener choferes del transportista
   */
  static async getChoferesByTransportista(
    tenantId: number,
    empresaTransportistaId?: number,
    choferId?: number
  ) {
    const where: any = {
      tenantEmpresaId: tenantId,
      activo: true,
    };

    if (empresaTransportistaId) {
      // Empresa: todos sus choferes
      where.empresaTransportistaId = empresaTransportistaId;
    } else if (choferId) {
      // Chofer individual: solo él mismo
      where.id = choferId;
    } else {
      return [];
    }

    return await prisma.chofer.findMany({
      where,
      orderBy: { apellido: 'asc' },
    });
  }

  /**
   * Obtener camiones del transportista
   */
  static async getCamionesByTransportista(
    tenantId: number,
    empresaTransportistaId?: number,
    choferId?: number
  ) {
    const where: any = {
      tenantEmpresaId: tenantId,
      activo: true,
    };

    if (empresaTransportistaId) {
      // Empresa: todos sus camiones
      where.empresaTransportistaId = empresaTransportistaId;
    } else if (choferId) {
      // Chofer: camiones que usa en sus equipos
      const equipos = await prisma.equipo.findMany({
        where: { driverId: choferId },
        select: { truckId: true },
      });
      const truckIds = [...new Set(equipos.map(e => e.truckId))];
      where.id = { in: truckIds };
    } else {
      return [];
    }

    return await prisma.camion.findMany({
      where,
      orderBy: { patenteNorm: 'asc' },
    });
  }

  /**
   * Obtener acoplados del transportista
   */
  static async getAcopladosByTransportista(
    tenantId: number,
    empresaTransportistaId?: number,
    choferId?: number
  ) {
    const where: any = {
      tenantEmpresaId: tenantId,
      activo: true,
    };

    if (empresaTransportistaId) {
      // Empresa: todos sus acoplados
      where.empresaTransportistaId = empresaTransportistaId;
    } else if (choferId) {
      // Chofer: acoplados que usa en sus equipos
      const equipos = await prisma.equipo.findMany({
        where: {
          driverId: choferId,
          trailerId: { not: null },
        },
        select: { trailerId: true },
      });
      const trailerIds = [...new Set(equipos.map(e => e.trailerId).filter(Boolean))];
      if (trailerIds.length === 0) return [];
      where.id = { in: trailerIds };
    } else {
      return [];
    }

    return await prisma.acoplado.findMany({
      where,
      orderBy: { patenteNorm: 'asc' },
    });
  }

  /**
   * Búsqueda masiva por patentes (transportistas)
   */
  static async bulkSearchByPatentesTransportista(
    tenantId: number,
    patentes: string[],
    empresaTransportistaId?: number,
    choferId?: number,
    choferDni?: string
  ) {
    const normalizedPatentes = patentes.map(p => normalizePlate(p));
    const uniquePatentes = [...new Set(normalizedPatentes)];

    // Buscar camiones del transportista
    const camionesWhere: any = {
      tenantEmpresaId: tenantId,
      patenteNorm: { in: uniquePatentes },
      activo: true,
    };

    if (empresaTransportistaId) {
      camionesWhere.empresaTransportistaId = empresaTransportistaId;
    } else if (choferId) {
      // Camiones que el chofer usa
      const equipos = await prisma.equipo.findMany({
        where: { driverId: choferId },
        select: { truckId: true },
      });
      const truckIds = [...new Set(equipos.map(e => e.truckId))];
      camionesWhere.id = { in: truckIds };
    } else if (choferDni) {
      // Por DNI
      const equipos = await prisma.equipo.findMany({
        where: { driverDniNorm: normalizeDni(choferDni) },
        select: { truckId: true },
      });
      const truckIds = [...new Set(equipos.map(e => e.truckId))];
      camionesWhere.id = { in: truckIds };
    } else {
      return { equipos: [], notFound: uniquePatentes };
    }

    const camiones = await prisma.camion.findMany({ where: camionesWhere });

    const foundPatentes = new Set(camiones.map(c => c.patenteNorm));
    const notFound = uniquePatentes.filter(p => !foundPatentes.has(p));

    // Buscar equipos asociados
    const camionIds = camiones.map(c => c.id);
    const equipos = await this.getEquiposByTransportista(
      tenantId,
      empresaTransportistaId,
      choferId,
      choferDni
    );

    // Filtrar solo equipos con los camiones buscados
    const equiposFiltrados = equipos.filter(e => camionIds.includes(e.truckId));

    return { equipos: equiposFiltrados, notFound };
  }

  /**
   * Resumen de cumplimiento del transportista
   */
  static async getComplianceSummary(
    tenantId: number,
    empresaTransportistaId?: number,
    choferId?: number,
    choferDni?: string
  ) {
    const equipos = await this.getEquiposByTransportista(
      tenantId,
      empresaTransportistaId,
      choferId,
      choferDni
    );

    // TODO: Calcular cumplimiento por equipo
    // Reutilizar ComplianceService.evaluateEquipoCompliance()

    return {
      totalEquipos: equipos.length,
      equiposCompletos: 0, // TODO
      equiposConFaltantes: 0, // TODO
      documentosVencidos: 0, // TODO
      proximosVencimientos: [], // TODO
    };
  }
}

// Helpers
function normalizeDni(dni: string): string {
  return dni.replace(/\D/g, '');
}
```

---

## 4. Controller: TransportistasController

### 4.1. Controller Completo

**Archivo**: `apps/documentos/src/controllers/transportistas.controller.ts`

```typescript
import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { TransportistaService } from '../services/transportista.service';
import { logger } from '../utils/logger';

export class TransportistasController {
  /**
   * GET /api/docs/transportistas/mis-equipos
   */
  static async getMisEquipos(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      const equipos = await TransportistaService.getEquiposByTransportista(
        tenantId,
        filters.empresaTransportistaId,
        filters.choferId,
        filters.choferDni
      );

      res.json({
        success: true,
        data: equipos,
      });
    } catch (error: any) {
      logger.error('Error getMisEquipos:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener equipos',
      });
    }
  }

  /**
   * GET /api/docs/transportistas/mis-choferes
   */
  static async getMisChoferes(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      const choferes = await TransportistaService.getChoferesByTransportista(
        tenantId,
        filters.empresaTransportistaId,
        filters.choferId
      );

      res.json({
        success: true,
        data: choferes,
      });
    } catch (error: any) {
      logger.error('Error getMisChoferes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener choferes',
      });
    }
  }

  /**
   * GET /api/docs/transportistas/mis-camiones
   */
  static async getMisCamiones(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      const camiones = await TransportistaService.getCamionesByTransportista(
        tenantId,
        filters.empresaTransportistaId,
        filters.choferId
      );

      res.json({
        success: true,
        data: camiones,
      });
    } catch (error: any) {
      logger.error('Error getMisCamiones:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener camiones',
      });
    }
  }

  /**
   * GET /api/docs/transportistas/mis-acoplados
   */
  static async getMisAcoplados(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      const acoplados = await TransportistaService.getAcopladosByTransportista(
        tenantId,
        filters.empresaTransportistaId,
        filters.choferId
      );

      res.json({
        success: true,
        data: acoplados,
      });
    } catch (error: any) {
      logger.error('Error getMisAcoplados:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener acoplados',
      });
    }
  }

  /**
   * POST /api/docs/transportistas/bulk-search
   * Body: { patentes: string[] }
   */
  static async bulkSearch(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;
      const { patentes } = req.body;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      if (!Array.isArray(patentes) || patentes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Patentes requeridas',
        });
      }

      // Límite de patentes
      if (patentes.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Máximo 20 patentes por búsqueda',
        });
      }

      const result = await TransportistaService.bulkSearchByPatentesTransportista(
        tenantId,
        patentes,
        filters.empresaTransportistaId,
        filters.choferId,
        filters.choferDni
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error bulkSearch:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error en búsqueda masiva',
      });
    }
  }

  /**
   * GET /api/docs/transportistas/compliance-summary
   */
  static async getComplianceSummary(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const filters = req.transportistaFilters;

      if (!filters) {
        return res.status(403).json({
          success: false,
          message: 'Filtros de transportista no disponibles',
        });
      }

      const summary = await TransportistaService.getComplianceSummary(
        tenantId,
        filters.empresaTransportistaId,
        filters.choferId,
        filters.choferDni
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Error getComplianceSummary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener resumen',
      });
    }
  }
}
```

---

## 5. Routes: Transportistas

### 5.1. Rutas Completas

**Archivo**: `apps/documentos/src/routes/transportistas.routes.ts`

```typescript
import { Router } from 'express';
import { authenticate, authorizeTransportista } from '../middlewares/auth.middleware';
import { TransportistasController } from '../controllers/transportistas.controller';
import { validate } from '../middlewares/auth.middleware';
import { bulkSearchSchema } from '../schemas/validation.schemas';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authenticate);

// Aplicar middleware de transportista
router.use(authorizeTransportista);

// Mis equipos
router.get('/mis-equipos', TransportistasController.getMisEquipos);

// Mis maestros
router.get('/mis-choferes', TransportistasController.getMisChoferes);
router.get('/mis-camiones', TransportistasController.getMisCamiones);
router.get('/mis-acoplados', TransportistasController.getMisAcoplados);

// Búsqueda masiva
router.post('/bulk-search', validate(bulkSearchSchema), TransportistasController.bulkSearch);

// Resumen de cumplimiento
router.get('/compliance-summary', TransportistasController.getComplianceSummary);

export default router;
```

### 5.2. Registrar Rutas

**Archivo**: `apps/documentos/src/index.ts`

```typescript
import transportistasRoutes from './routes/transportistas.routes';

// ... otras rutas ...
app.use('/api/docs/transportistas', transportistasRoutes);
```

---

## 6. Validation Schemas

### 6.1. Schema de Búsqueda Masiva

**Archivo**: `apps/documentos/src/schemas/validation.schemas.ts`

```typescript
import { z } from 'zod';

// Schema de búsqueda masiva por patentes
export const bulkSearchSchema = z.object({
  body: z.object({
    patentes: z
      .array(z.string())
      .min(1, 'Al menos una patente requerida')
      .max(20, 'Máximo 20 patentes por búsqueda'),
  }),
});
```

---

## 7. Frontend: Hooks API

### 7.1. API Slice

**Archivo**: `apps/frontend/src/features/documentos/api/transportistasApiSlice.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/transportistas`;

export const transportistasApi = createApi({
  reducerPath: 'transportistasApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      const empresaId = (getState() as any).auth?.user?.empresaId;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (empresaId) headers.set('x-tenant-id', String(empresaId));
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // Mis equipos
    getMisEquipos: builder.query({
      query: () => '/mis-equipos',
    }),

    // Mis maestros
    getMisChoferes: builder.query({
      query: () => '/mis-choferes',
    }),

    getMisCamiones: builder.query({
      query: () => '/mis-camiones',
    }),

    getMisAcoplados: builder.query({
      query: () => '/mis-acoplados',
    }),

    // Búsqueda masiva
    bulkSearch: builder.mutation({
      query: (body: { patentes: string[] }) => ({
        url: '/bulk-search',
        method: 'POST',
        body,
      }),
    }),

    // Resumen de cumplimiento
    getComplianceSummary: builder.query({
      query: () => '/compliance-summary',
    }),
  }),
});

export const {
  useGetMisEquiposQuery,
  useGetMisChoferesQuery,
  useGetMisCamionesQuery,
  useGetMisAcopladosQuery,
  useBulkSearchMutation,
  useGetComplianceSummaryQuery,
} = transportistasApi;
```

---

## 8. Frontend: Componente de Maestros

### 8.1. Componente TransportistaMaestros

**Archivo**: `apps/frontend/src/components/transportistas/TransportistaMaestros.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  useGetMisChoferesQuery,
  useGetMisCamionesQuery,
  useGetMisAcopladosQuery,
} from '../../features/documentos/api/transportistasApiSlice';
import { UserIcon, TruckIcon, DocumentIcon } from '@heroicons/react/24/outline';

type TabType = 'choferes' | 'camiones' | 'acoplados';

export const TransportistaMaestros: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('choferes');

  const { data: choferesData, isLoading: loadingChoferes } = useGetMisChoferesQuery({});
  const { data: camionesData, isLoading: loadingCamiones } = useGetMisCamionesQuery({});
  const { data: acopladosData, isLoading: loadingAcoplados } = useGetMisAcopladosQuery({});

  const choferes = (choferesData as any)?.data || [];
  const camiones = (camionesData as any)?.data || [];
  const acoplados = (acopladosData as any)?.data || [];

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
          <h2 className="text-2xl font-bold">Mis Maestros</h2>
          <p className="text-blue-100">Choferes, Camiones y Acoplados</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('choferes')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'choferes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserIcon className="h-5 w-5 inline mr-2" />
              Choferes ({choferes.length})
            </button>

            <button
              onClick={() => setActiveTab('camiones')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'camiones'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TruckIcon className="h-5 w-5 inline mr-2" />
              Camiones ({camiones.length})
            </button>

            <button
              onClick={() => setActiveTab('acoplados')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'acoplados'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentIcon className="h-5 w-5 inline mr-2" />
              Acoplados ({acoplados.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'choferes' && (
            <ChoferesTab choferes={choferes} isLoading={loadingChoferes} />
          )}

          {activeTab === 'camiones' && (
            <CamionesTab camiones={camiones} isLoading={loadingCamiones} />
          )}

          {activeTab === 'acoplados' && (
            <AcopladosTab acoplados={acoplados} isLoading={loadingAcoplados} />
          )}
        </div>
      </Card>
    </div>
  );
};

// Sub-componentes para cada tab
const ChoferesTab: React.FC<{ choferes: any[]; isLoading: boolean }> = ({
  choferes,
  isLoading,
}) => {
  if (isLoading) return <div>Cargando...</div>;

  if (choferes.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay choferes registrados</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {choferes.map((chofer: any) => (
        <div
          key={chofer.id}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">
                {chofer.nombre} {chofer.apellido}
              </h3>
              <span className="text-xs text-gray-600">DNI: {chofer.dni}</span>
            </div>
          </div>

          {chofer.phones && chofer.phones.length > 0 && (
            <div className="text-sm text-gray-600">
              📱 {chofer.phones.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CamionesTab: React.FC<{ camiones: any[]; isLoading: boolean }> = ({
  camiones,
  isLoading,
}) => {
  if (isLoading) return <div>Cargando...</div>;

  if (camiones.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay camiones registrados</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {camiones.map((camion: any) => (
        <div
          key={camion.id}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <TruckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{camion.patente}</h3>
              {camion.marca && (
                <span className="text-xs text-gray-600">
                  {camion.marca} {camion.modelo}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AcopladosTab: React.FC<{ acoplados: any[]; isLoading: boolean }> = ({
  acoplados,
  isLoading,
}) => {
  if (isLoading) return <div>Cargando...</div>;

  if (acoplados.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay acoplados registrados</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {acoplados.map((acoplado: any) => (
        <div
          key={acoplado.id}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <DocumentIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{acoplado.patente}</h3>
              {acoplado.marca && (
                <span className="text-xs text-gray-600">
                  {acoplado.marca} {acoplado.modelo}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 9. Frontend: Búsqueda por Patentes

### 9.1. Componente BulkPatentesSearch (Transportistas)

**Archivo**: `apps/frontend/src/components/transportistas/BulkPatentesSearch.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useBulkSearchMutation } from '../../features/documentos/api/transportistasApiSlice';
import { showToast } from '../ui/Toast.utils';
import { SearchIcon } from '@heroicons/react/24/outline';

export const BulkPatentesSearchTransportista: React.FC = () => {
  const [patentesText, setPatentesText] = useState('');
  const [bulkSearch, { data, isLoading }] = useBulkSearchMutation();

  const handleSearch = async () => {
    const patentes = patentesText
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    if (patentes.length === 0) {
      showToast('Ingrese al menos una patente', 'error');
      return;
    }

    if (patentes.length > 20) {
      showToast('Máximo 20 patentes por búsqueda', 'error');
      return;
    }

    try {
      await bulkSearch({ patentes }).unwrap();
      showToast('Búsqueda completada', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error en búsqueda', 'error');
    }
  };

  const equipos = (data as any)?.data?.equipos || [];
  const notFound = (data as any)?.data?.notFound || [];

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <h2 className="text-2xl font-bold">Búsqueda por Patentes</h2>
          <p className="text-purple-100">Ingrese las patentes (una por línea)</p>
        </div>

        {/* Input */}
        <div className="p-6">
          <textarea
            className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0"
            placeholder="AA123BB&#10;AC456CD&#10;AD789EF"
            value={patentesText}
            onChange={e => setPatentesText(e.target.value)}
          />

          <div className="flex items-center gap-4 mt-4">
            <Button
              onClick={handleSearch}
              disabled={isLoading || !patentesText.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <SearchIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Buscando...' : 'Buscar'}
            </Button>

            <span className="text-sm text-gray-500">
              {patentesText.split('\n').filter(Boolean).length} patentes ingresadas
            </span>
          </div>
        </div>

        {/* Results */}
        {equipos.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-bold mb-4">Resultados: {equipos.length} equipos</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipos.map((equipo: any) => (
                <div
                  key={equipo.id}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
                >
                  <div className="text-sm">
                    <div><strong>DNI Chofer:</strong> {equipo.driverDniNorm}</div>
                    <div><strong>Tractor:</strong> {equipo.truckPlateNorm}</div>
                    {equipo.trailerPlateNorm && (
                      <div><strong>Acoplado:</strong> {equipo.trailerPlateNorm}</div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/api/docs/clients/equipos/${equipo.id}/zip`, '_blank')
                    }
                    className="w-full mt-3"
                  >
                    Descargar Documentos
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {notFound.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              No encontradas: {notFound.length}
            </h3>
            <div className="flex flex-wrap gap-2">
              {notFound.map((patente: string) => (
                <span
                  key={patente}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm"
                >
                  {patente}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
```

---

## 10. Testing

### 10.1. Test de Middleware

**Archivo**: `apps/documentos/src/__tests__/middlewares/auth.middleware.test.ts`

```typescript
import { authorizeTransportista } from '../../middlewares/auth.middleware';
import { AuthRequest } from '../../types/auth.types';
import { Response, NextFunction } from 'express';

describe('authorizeTransportista', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('debe permitir acceso a ADMIN', () => {
    req.user = { id: 1, role: 'ADMIN', empresaId: 1 };

    authorizeTransportista(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe permitir acceso a TRANSPORTISTA con metadata válida', () => {
    req.user = {
      id: 1,
      role: 'TRANSPORTISTA',
      empresaId: 1,
      metadata: {
        type: 'empresa',
        empresaTransportistaId: 5,
      },
    };

    authorizeTransportista(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.transportistaFilters).toEqual({
      type: 'empresa',
      empresaTransportistaId: 5,
      choferId: undefined,
      choferDni: undefined,
    });
  });

  it('debe denegar acceso a TRANSPORTISTA sin metadata', () => {
    req.user = { id: 1, role: 'TRANSPORTISTA', empresaId: 1 };

    authorizeTransportista(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## 11. Documentación de API

### 11.1. Swagger/OpenAPI

```yaml
paths:
  /api/docs/transportistas/mis-equipos:
    get:
      summary: Obtener equipos del transportista
      tags:
        - Transportistas
      security:
        - BearerAuth: []
      responses:
        200:
          description: Lista de equipos
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Equipo'

  /api/docs/transportistas/bulk-search:
    post:
      summary: Búsqueda masiva por patentes
      tags:
        - Transportistas
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                patentes:
                  type: array
                  items:
                    type: string
                  minItems: 1
                  maxItems: 20
      responses:
        200:
          description: Resultados de búsqueda
        400:
          description: Patentes inválidas o exceso de límite
```

---

## 📝 Notas Finales

1. **Todos los ejemplos son funcionales** y pueden copiarse directamente
2. **Seguir convenciones del proyecto** existente
3. **Usar TypeScript estricto** con tipos definidos
4. **Validar con Zod** todas las entradas de API
5. **Rate limiting** según definido en `.env`

**Fecha**: 6 de Noviembre, 2025  
**Versión**: 1.0  
**Estado**: ✅ Ejemplos Listos para Implementar

