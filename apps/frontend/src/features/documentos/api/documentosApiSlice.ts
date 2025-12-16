import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../../store/store';
import type { EmpresaTransportista, ApprovalPendingDocument, ApprovalStats, EquipoWithExtras, EquipoDocumento } from '../types/entities';

// =================================
// TIPOS Y INTERFACES - Simplicidad Elegante
// =================================

export interface DocumentTemplate {
  id: number;
  nombre: string;
  descripcion?: string;
  entityType: 'DADOR' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
  campos: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  templateId: number;
  dadorCargaId: number;
  entityType: 'DADOR' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
  entityId: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO';
  extractedData?: Record<string, any>;
  validationNotes?: string;
  expiresAt?: string;
  uploadedAt: string;
  validatedAt?: string;
  files: DocumentFile[];
}

export interface DocumentFile {
  id: number;
  documentId: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
}

export interface DocumentStatusSummary {
  empresaId: number;
  entityType: string;
  entityId: string;
  red: number;
  yellow: number;
  green: number;
  lastUpdated: string;
}

export interface DashboardData {
  empresas: Array<{
    id: number;
    nombre: string;
    totalDocuments: number;
    pendingDocuments: number;
    expiredDocuments: number;
    approvedDocuments: number;
  }>;
  semaforos: DocumentStatusSummary[];
}

// =================================
// API SLICE - Microservicio Documentos
// =================================

export const documentosApiSlice = createApi({
  reducerPath: 'documentosApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;
      const empresaId = state.auth?.user?.empresaId;
      if (token) headers.set('authorization', `Bearer ${token}`);
      if (empresaId) headers.set('x-tenant-id', String(empresaId));
      return headers;
    },
  }),
  tagTypes: ['DocumentTemplate', 'Document', 'Dashboard', 'Clients', 'Equipos', 'Search', 'ClientRequirements', 'Maestros', 'Approval', 'EmpresasTransportistas'],
  endpoints: (builder) => ({
    // =================================
    // COMPLIANCE
    // =================================
    getEquipoCompliance: builder.query<any, { id: number }>({
      query: ({ id }) => ({ url: `/compliance/equipos/${id}` }),
      transformResponse: (r: any) => r?.data ?? r,
      providesTags: ['Equipos'],
    }),
    // Portales - Cliente: equipos por cliente
    getClienteEquipos: builder.query<EquipoWithExtras[], { clienteId: number }>({
      query: ({ clienteId }) => ({ url: `/clients/${clienteId}/equipos` }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Equipos'],
    }),
    // Cliente: búsqueda masiva por patentes
    bulkSearchPlates: builder.mutation<
      Array<{ id: number; dadorCargaId: number; truckPlateNorm?: string|null; trailerPlateNorm?: string|null; driverDniNorm?: string|null; estado?: string }>,
      { plates: string[]; type?: 'truck'|'trailer' }
    >({
      query: (body) => ({ url: `/clients/bulk-search`, method: 'POST', body }),
      transformResponse: (r: any) => r?.data ?? [],
    }),
    // Cliente: solicitar ZIP masivo
    requestClientsBulkZip: builder.mutation<{ success: boolean; jobId: string }, { equipoIds: number[] }>({
      query: ({ equipoIds }) => ({ url: `/clients/bulk-zip`, method: 'POST', body: { equipoIds } }),
    }),
    // Cliente: estado de job de ZIP
    getClientsZipJob: builder.query<{ success: boolean; job: { id: string; status: string; progress: number; message?: string; signedUrl?: string } }, { jobId: string }>({
      query: ({ jobId }) => ({ url: `/clients/jobs/${jobId}` }),
    }),
    // Transportistas: mis equipos
    getMisEquipos: builder.query<Array<{ id: number; driverDniNorm?: string; truckPlateNorm?: string; trailerPlateNorm?: string|null }>, void>({
      query: () => ({ url: `/transportistas/mis-equipos` }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Equipos'],
    }),
    // Transportistas: búsqueda limitada (dni/plate)
    transportistasSearch: builder.mutation<Array<{ id: number; driverDniNorm?: string; truckPlateNorm?: string; trailerPlateNorm?: string|null }>, { dni?: string; plate?: string }>({
      query: (body) => ({ url: `/transportistas/search`, method: 'POST', body }),
      transformResponse: (r: any) => r?.data ?? [],
    }),

    // Documentos por equipo (portal cliente)
    getDocumentosPorEquipo: builder.query<EquipoDocumento[], { equipoId: number }>({
      query: ({ equipoId }) => ({ url: `/clients/equipos/${equipoId}/documentos` }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Documents'],
    }),

    downloadDocumento: builder.query<Blob, { documentId: number }>({
      query: ({ documentId }) => ({ url: `/documents/${documentId}/download`, responseHandler: (response) => response.blob() }),
    }),

    // Batch jobs
    getJobStatus: builder.query<{ success: boolean; job: { id: string; status: string; progress: number; message?: string } }, { jobId: string }>({
      query: ({ jobId }) => ({ url: `/jobs/${jobId}/status` }),
    }),

    // CSV import equipos (dadores)
    importCsvEquipos: builder.mutation<{ success: boolean; dryRun?: boolean; total: number; created: number; errors: any[]; errorsCsv?: string }, { dadorId: number; file: File; dryRun?: boolean }>({
      query: ({ dadorId, file, dryRun }) => {
        const form = new FormData();
        form.append('file', file);
        const qs = dryRun ? '?dryRun=true' : '';
        return { url: `/dadores/${dadorId}/equipos/import-csv${qs}`, method: 'POST', body: form };
      },
    }),

    // Batch documentos (dadores)
    uploadBatchDocsDador: builder.mutation<{ success: boolean; jobId: string }, { dadorId: number; files: FileList | File[]; skipDedupe?: boolean }>({
      query: ({ dadorId, files, skipDedupe }) => {
        const form = new FormData();
        const list = Array.isArray(files) ? files : Array.from(files);
        list.forEach((f) => form.append('files', f));
        const qs = skipDedupe ? '?skipDedupe=true' : '';
        return { url: `/dadores/${dadorId}/documentos/batch${qs}`, method: 'POST', body: form };
      },
    }),

    // Batch documentos (transportistas)
    uploadBatchDocsTransportistas: builder.mutation<{ success: boolean; jobId: string }, { files: FileList | File[]; skipDedupe?: boolean }>({
      query: ({ files, skipDedupe }) => {
        const form = new FormData();
        const list = Array.isArray(files) ? files : Array.from(files);
        list.forEach((f) => form.append('files', f));
        const qs = skipDedupe ? '?skipDedupe=true' : '';
        return { url: `/transportistas/documentos/batch${qs}`, method: 'POST', body: form };
      },
    }),

    // Portales - Alta mínima de equipo (dadores/transportistas)
    createEquipoMinimal: builder.mutation<any, { dadorCargaId: number; dniChofer: string; patenteTractor: string; patenteAcoplado?: string | null }>({
      query: (body) => ({ url: '/equipos/minimal', method: 'POST', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Equipos'],
    }),
    // =================================
    // DADORES DE CARGA
    // =================================
    getDadores: builder.query<
      { list: Array<{ id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string; phones?: string[] }>; defaults?: { defaultDadorId: number | null } },
      { activo?: boolean }
    >({
      query: ({ activo } = {}) => ({ url: `/dadores${activo !== undefined ? `?activo=${String(activo)}` : ''}` }),
      transformResponse: (r: any) => ({ list: r?.data ?? [], defaults: r?.defaults }),
      providesTags: ['Clients'],
    }),
    createDador: builder.mutation<
      { id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string; phones?: string[] },
      { razonSocial: string; cuit: string; activo?: boolean; notas?: string; phones: string[] }
    >({
      query: (body) => ({ url: '/dadores', method: 'POST', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Clients'],
    }),
    updateDador: builder.mutation<
      { id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string; phones?: string[] },
      { id: number; razonSocial?: string; cuit?: string; activo?: boolean; notas?: string; phones?: string[] }
    >({
      query: ({ id, ...body }) => ({ url: `/dadores/${id}`, method: 'PUT', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Clients'],
    }),
    deleteDador: builder.mutation<void, number>({
      query: (id) => ({ url: `/dadores/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Clients'],
    }),
    // =================================
    // TEMPLATES
    // =================================
    getTemplates: builder.query<DocumentTemplate[], void>({
      query: () => '/templates',
      transformResponse: (r: any) => Array.isArray(r) ? r : (r?.data ?? []),
      providesTags: ['DocumentTemplate'],
    }),

    // =================================
    // CLIENTES
    // =================================
    getClients: builder.query<
      { list: Array<{ id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string }>; defaults?: { defaultClienteId: number | null } },
      { activo?: boolean }
    >({
      query: ({ activo } = {}) => ({
        url: `/clients` + (activo !== undefined ? `?activo=${String(activo)}` : ''),
      }),
      transformResponse: (response: any) => ({ list: response?.data ?? [], defaults: response?.defaults }),
      providesTags: ['Clients'],
    }),
    createClient: builder.mutation<
      { id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string },
      { razonSocial: string; cuit: string; activo?: boolean; notas?: string }
    >({
      query: (body) => ({ url: '/clients', method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Clients'],
    }),
    updateClient: builder.mutation<
      { id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string },
      { id: number; razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/clients/${id}`, method: 'PUT', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Clients'],
    }),
    deleteClient: builder.mutation<void, number>({
      query: (id) => ({ url: `/clients/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Clients'],
    }),

    // Requisitos por cliente
    getClientRequirements: builder.query<
      Array<{ id: number; templateId: number; entityType: 'CHOFER'|'CAMION'|'ACOPLADO'; obligatorio: boolean; diasAnticipacion: number; visibleChofer: boolean; template: { id: number; name: string; entityType: string } }>,
      { clienteId: number }
    >({
      query: ({ clienteId }) => ({ url: `/clients/${clienteId}/requirements` }),
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ['ClientRequirements'],
    }),
    addClientRequirement: builder.mutation<
      any,
      { clienteId: number; templateId: number; entityType: 'CHOFER'|'CAMION'|'ACOPLADO'; obligatorio?: boolean; diasAnticipacion?: number; visibleChofer?: boolean }
    >({
      query: ({ clienteId, ...body }) => ({ url: `/clients/${clienteId}/requirements`, method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['ClientRequirements'],
    }),
    removeClientRequirement: builder.mutation<void, { clienteId: number; requirementId: number }>({
      query: ({ clienteId, requirementId }) => ({ url: `/clients/${clienteId}/requirements/${requirementId}`, method: 'DELETE' }),
      invalidatesTags: ['ClientRequirements'],
    }),

    // Defaults
    getDefaults: builder.query<{ defaultClienteId: number | null; defaultDadorId: number | null; missingCheckDelayMinutes: number | null }, void>({
      query: () => ({ url: '/defaults' }),
      transformResponse: (r: any) => r?.data ?? { defaultClienteId: null, defaultDadorId: null, missingCheckDelayMinutes: null },
      providesTags: ['Clients'],
    }),
    updateDefaults: builder.mutation<void, { defaultClienteId?: number | null; defaultDadorId?: number | null; missingCheckDelayMinutes?: number | null }>({
      query: (body) => ({ url: '/defaults', method: 'PUT', body }),
      invalidatesTags: ['Clients'],
    }),

    // =================================
    // MAESTROS: CHOFERES, CAMIONES, ACOPLADOS

    // Choferes
    getChoferes: builder.query<
      { data: Array<{ id: number; empresaId: number; dni: string; nombre?: string; apellido?: string; activo: boolean; phones?: string[] }>; pagination?: { page: number; limit: number; total: number } },
      { empresaId: number; q?: string; activo?: boolean; page?: number; limit?: number }
    >({
      query: ({ empresaId, q, activo, page, limit }) => ({
        url: `/maestros/choferes?dadorCargaId=${empresaId}${q ? `&q=${encodeURIComponent(q)}` : ''}${activo !== undefined ? `&activo=${String(activo)}` : ''}${page ? `&page=${page}` : ''}${limit ? `&limit=${limit}` : ''}`,
      }),
      transformResponse: (r: any) => ({ data: r?.data ?? [], pagination: r?.pagination }),
      providesTags: ['Maestros'],
    }),
    getChoferById: builder.query<
      { id: number; dni: string; nombre?: string; apellido?: string; empresaTransportistaId?: number; empresaTransportista?: { id: number; razonSocial: string; dadorCargaId: number } },
      { id: number }
    >({
      query: ({ id }) => ({ url: `/maestros/choferes/${id}` }),
      transformResponse: (r: any) => r?.data ?? r,
    }),
    createChofer: builder.mutation<any, { dadorCargaId: number; dni: string; nombre?: string; apellido?: string; activo?: boolean; phones: string[] }>({
      query: (body) => ({ url: '/maestros/choferes', method: 'POST', body: { ...body, empresaId: undefined } }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    updateChofer: builder.mutation<any, { id: number; dni?: string; nombre?: string; apellido?: string; activo?: boolean; phones?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/maestros/choferes/${id}`, method: 'PUT', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    deleteChofer: builder.mutation<void, number>({
      query: (id) => ({ url: `/maestros/choferes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Maestros'],
    }),

    // Camiones
    getCamiones: builder.query<
      { data: Array<{ id: number; empresaId: number; patente: string; marca?: string; modelo?: string; activo: boolean }>; pagination?: { page: number; limit: number; total: number } },
      { empresaId: number; q?: string; activo?: boolean; page?: number; limit?: number }
    >({
      query: ({ empresaId, q, activo, page, limit }) => ({
        url: `/maestros/camiones?dadorCargaId=${empresaId}${q ? `&q=${encodeURIComponent(q)}` : ''}${activo !== undefined ? `&activo=${String(activo)}` : ''}${page ? `&page=${page}` : ''}${limit ? `&limit=${limit}` : ''}`,
      }),
      transformResponse: (r: any) => ({ data: r?.data ?? [], pagination: r?.pagination }),
      providesTags: ['Maestros'],
    }),
    createCamion: builder.mutation<any, { dadorCargaId: number; patente: string; marca?: string; modelo?: string }>({
      query: (body) => ({ url: '/maestros/camiones', method: 'POST', body: { ...body, empresaId: undefined } }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    updateCamion: builder.mutation<any, { id: number; patente?: string; marca?: string; modelo?: string; activo?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/maestros/camiones/${id}`, method: 'PUT', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    deleteCamion: builder.mutation<void, number>({
      query: (id) => ({ url: `/maestros/camiones/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Maestros'],
    }),

    // Acoplados
    getAcoplados: builder.query<
      { data: Array<{ id: number; empresaId: number; patente: string; tipo?: string; activo: boolean }>; pagination?: { page: number; limit: number; total: number } },
      { empresaId: number; q?: string; activo?: boolean; page?: number; limit?: number }
    >({
      query: ({ empresaId, q, activo, page, limit }) => ({
        url: `/maestros/acoplados?dadorCargaId=${empresaId}${q ? `&q=${encodeURIComponent(q)}` : ''}${activo !== undefined ? `&activo=${String(activo)}` : ''}${page ? `&page=${page}` : ''}${limit ? `&limit=${limit}` : ''}`,
      }),
      transformResponse: (r: any) => ({ data: r?.data ?? [], pagination: r?.pagination }),
      providesTags: ['Maestros'],
    }),
    createAcoplado: builder.mutation<any, { dadorCargaId: number; patente: string; tipo?: string }>({
      query: (body) => ({ url: '/maestros/acoplados', method: 'POST', body: { ...body, empresaId: undefined } }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    updateAcoplado: builder.mutation<any, { id: number; patente?: string; tipo?: string; activo?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/maestros/acoplados/${id}`, method: 'PUT', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['Maestros'],
    }),
    deleteAcoplado: builder.mutation<void, number>({
      query: (id) => ({ url: `/maestros/acoplados/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Maestros'],
    }),

    // =================================
    // EQUIPOS
    // =================================
    getEquipoHistory: builder.query<
      Array<{ id: number; equipoId: number; action: string; component: string; originEquipoId?: number | null; payload?: any; createdAt: string }>,
      { id: number }
    >({
      query: ({ id }) => ({ url: `/equipos/${id}/history` }),
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ['Equipos'],
    }),
    getEquipos: builder.query<
      EquipoWithExtras[],
      { empresaId: number }
    >({
      query: ({ empresaId }) => ({ url: `/equipos?dadorCargaId=${empresaId}` }),
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ['Equipos'],
    }),
    getEquipoById: builder.query<any, { id: number }>({
      query: ({ id }) => ({ url: `/equipos/${id}` }),
      transformResponse: (response: any) => response?.data ?? response,
      providesTags: ['Equipos'],
    }),
    createEquipo: builder.mutation<
      any,
      { empresaId?: number; dadorCargaId?: number; driverId?: number; truckId?: number; trailerId?: number; empresaTransportistaId?: number; driverDni: string; truckPlate: string; trailerPlate?: string; validFrom: string; validTo?: string|null; choferPhones?: string[] }
    >({
      query: (body) => {
        const { empresaId, dadorCargaId, ...rest } = body;
        const resolvedDadorId = dadorCargaId ?? empresaId;
        return { url: '/equipos', method: 'POST', body: { dadorCargaId: resolvedDadorId, ...rest } };
      },
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    createEquipoCompleto: builder.mutation<
      any,
      {
        dadorCargaId?: number;
        empresaTransportistaCuit: string;
        empresaTransportistaNombre: string;
        choferDni: string;
        choferNombre?: string;
        choferApellido?: string;
        choferPhones?: string[];
        camionPatente: string;
        camionMarca?: string;
        camionModelo?: string;
        acopladoPatente?: string | null;
        acopladoTipo?: string;
        clienteIds?: number[];
      }
    >({
      query: (body) => ({ url: '/equipos/alta-completa', method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos', 'Choferes', 'Camiones', 'Acoplados', 'EmpresasTransportistas'],
    }),
    rollbackEquipoCompleto: builder.mutation<
      any,
      {
        equipoId: number;
        deleteChofer?: boolean;
        deleteCamion?: boolean;
        deleteAcoplado?: boolean;
        deleteEmpresa?: boolean;
      }
    >({
      query: ({ equipoId, ...body }) => ({ url: `/equipos/${equipoId}/rollback`, method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos', 'Choferes', 'Camiones', 'Acoplados', 'EmpresasTransportistas'],
    }),
    updateEquipo: builder.mutation<
      any,
      { id: number; trailerId?: number; trailerPlate?: string; validTo?: string|null; estado?: 'activa'|'finalizada'; empresaTransportistaId?: number }
    >({
      query: ({ id, ...body }) => ({ url: `/equipos/${id}`, method: 'PUT', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    deleteEquipo: builder.mutation<void, { id: number }>({
      query: ({ id }) => ({ url: `/equipos/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Equipos'],
    }),
    associateEquipoCliente: builder.mutation<
      any,
      { equipoId: number; clienteId: number; asignadoDesde: string; asignadoHasta?: string|null }
    >({
      query: ({ equipoId, clienteId, ...body }) => ({ url: `/equipos/${equipoId}/clientes/${clienteId}`, method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    removeEquipoCliente: builder.mutation<void, { equipoId: number; clienteId: number }>({
      query: ({ equipoId, clienteId }) => ({ url: `/equipos/${equipoId}/clientes/${clienteId}`, method: 'DELETE' }),
      invalidatesTags: ['Equipos'],
    }),

    // =================================
    // EDICIÓN DE EQUIPOS - Nuevos endpoints
    // =================================
    updateEquipoEntidades: builder.mutation<
      any,
      { equipoId: number; choferId?: number; camionId?: number; acopladoId?: number | null; empresaTransportistaId?: number }
    >({
      query: ({ equipoId, ...body }) => ({ url: `/equipos/${equipoId}/entidades`, method: 'PUT', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    addEquipoCliente: builder.mutation<any, { equipoId: number; clienteId: number }>({
      query: ({ equipoId, clienteId }) => ({ url: `/equipos/${equipoId}/clientes`, method: 'POST', body: { clienteId } }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    removeEquipoClienteWithArchive: builder.mutation<{ removed: boolean; archivedDocuments: number }, { equipoId: number; clienteId: number }>({
      query: ({ equipoId, clienteId }) => ({ url: `/equipos/${equipoId}/clientes/${clienteId}`, method: 'DELETE' }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    transferirEquipo: builder.mutation<any, { equipoId: number; nuevoDadorCargaId: number; motivo?: string }>({
      query: ({ equipoId, ...body }) => ({ url: `/equipos/${equipoId}/transferir`, method: 'POST', body }),
      transformResponse: (response: any) => response?.data,
      invalidatesTags: ['Equipos'],
    }),
    toggleEquipoActivo: builder.mutation<{ success: boolean; data: { id: number; activo: boolean } }, { equipoId: number; activo: boolean }>({
      query: ({ equipoId, activo }) => ({ url: `/equipos/${equipoId}/toggle-activo`, method: 'PATCH', body: { activo } }),
      invalidatesTags: ['Equipos', 'Search'],
    }),
    getEquipoRequisitos: builder.query<
      Array<{
        templateId: number;
        templateName: string;
        entityType: string;
        entityId: number | null;
        obligatorio: boolean;
        requeridoPor: Array<{ clienteId: number; clienteName: string }>;
        documentoActual?: { id: number; status: string; expiresAt: string | null; estado: string };
        estado: string;
      }>,
      { equipoId: number }
    >({
      query: ({ equipoId }) => ({ url: `/equipos/${equipoId}/requisitos` }),
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ['Equipos'],
    }),
    getEquipoAuditHistory: builder.query<any[], { equipoId: number }>({
      query: ({ equipoId }) => ({ url: `/equipos/${equipoId}/audit` }),
      transformResponse: (response: any) => response?.data ?? [],
    }),

    // =================================
    // BÚSQUEDA UNIFICADA
    // =================================
    searchEquipos: builder.query<
      Array<{ equipo: any; clientes: Array<{ clienteId: number; compliance: any[] }> }>,
      { empresaId?: number; clienteId?: number; empresaTransportistaId?: number; dni?: string; truckPlate?: string; trailerPlate?: string }
    >({
      query: ({ empresaId, clienteId, empresaTransportistaId, dni, truckPlate, trailerPlate }) => {
        const params = new URLSearchParams();
        if (typeof empresaId === 'number') params.set('dadorCargaId', String(empresaId));
        if (typeof clienteId === 'number') params.set('clienteId', String(clienteId));
        if (typeof empresaTransportistaId === 'number') params.set('empresaTransportistaId', String(empresaTransportistaId));
        if (dni) params.set('dni', dni);
        if (truckPlate) params.set('truckPlate', truckPlate);
        if (trailerPlate) params.set('trailerPlate', trailerPlate);
        return { url: `/search?${params.toString()}` };
      },
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ['Search'],
    }),
    
    // Búsqueda paginada con filtros avanzados (para página de consulta admin)
    searchEquiposPaged: builder.query<
      {
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
        stats?: {
          total: number;
          conFaltantes: number;
          conVencidos: number;
          conPorVencer: number;
        };
      },
      {
        page?: number;
        limit?: number;
        dadorCargaId?: number;
        clienteId?: number;
        empresaTransportistaId?: number;
        search?: string;
        dni?: string;
        truckPlate?: string;
        trailerPlate?: string;
        activo?: 'all' | 'true' | 'false';
        complianceFilter?: 'faltantes' | 'vencidos' | 'por_vencer';
      }
    >({
      query: ({ page = 1, limit = 10, dadorCargaId, clienteId, empresaTransportistaId, search, dni, truckPlate, trailerPlate, activo = 'all', complianceFilter }) => {
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('limit', String(limit));
        if (dadorCargaId) params.set('dadorCargaId', String(dadorCargaId));
        if (clienteId) params.set('clienteId', String(clienteId));
        if (empresaTransportistaId) params.set('empresaTransportistaId', String(empresaTransportistaId));
        if (search) params.set('search', search);
        if (dni) params.set('dni', dni);
        if (truckPlate) params.set('truckPlate', truckPlate);
        if (trailerPlate) params.set('trailerPlate', trailerPlate);
        if (activo) params.set('activo', activo);
        if (complianceFilter) params.set('complianceFilter', complianceFilter);
        return { url: `/equipos/search-paged?${params.toString()}` };
      },
      providesTags: ['Search'],
    }),
    
    // Búsqueda por lista de DNIs (POST JSON)
    searchEquiposByDnis: builder.mutation<Array<{ id: number; dadorCargaId: number; tenantEmpresaId: number; driverDniNorm: string; truckPlateNorm: string; trailerPlateNorm?: string|null; estado: string }>, { dnis: string[] }>({
      query: ({ dnis }) => ({ url: '/equipos/search/dnis', method: 'POST', body: { dnis } }),
      transformResponse: (r: any) => r?.data ?? [],
    }),

    // Descarga masiva de documentación vigente por lista de equipos
    downloadVigentesBulk: builder.mutation<Blob, { equipoIds: number[] }>({
      query: ({ equipoIds }) => ({ url: '/equipos/download/vigentes', method: 'POST', body: { equipoIds }, responseHandler: (response) => response.blob() as any }),
    }),
    // =================================
    // DOCUMENTOS
    // =================================
    getDocumentsByEmpresa: builder.query<
      { data: Document[]; pagination: { page: number; limit: number; total: number; pages: number } },
      { dadorId: number; status?: string; page?: number; limit?: number }
    >({
      query: ({ dadorId, status, page = 1, limit = 20 }) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        params.set('page', String(page));
        params.set('limit', String(limit));
        const qs = params.toString();
        return { url: `/documents/status?empresaId=${dadorId}${qs ? `&${qs}` : ''}` } as any;
      },
      transformResponse: (r: any) => ({ data: r?.data ?? [], pagination: r?.pagination ?? { page: 1, limit: (r?.data?.length || 0), total: r?.data?.length || 0, pages: 1 } }),
      providesTags: ['Document'],
      keepUnusedDataFor: 30,
    }),

    uploadDocument: builder.mutation<Document, any>({
      query: (arg: any) => {
        // Permite enviar FormData crudo o un objeto tipado
        if (typeof FormData !== 'undefined' && arg instanceof FormData) {
          return { url: '/documents/upload', method: 'POST', body: arg };
        }
        const { files = [], ...data } = arg || {};
        const formData = new FormData();
        if (data.templateId != null) formData.append('templateId', String(data.templateId));
        if (data.empresaId != null) formData.append('dadorCargaId', String(data.empresaId));
        if (data.entityType != null) formData.append('entityType', String(data.entityType));
        if (data.entityId != null) formData.append('entityId', String(data.entityId));
        if (data.confirmNewVersion) formData.append('confirmNewVersion', 'true');
        if (data.planilla) formData.append('planilla', typeof data.planilla === 'string' ? data.planilla : JSON.stringify(data.planilla));
        formData.append('source', 'file');
        if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
        const list: File[] = Array.isArray(files) ? files : [];
        if (list.length > 1) list.forEach((f) => formData.append('documents', f));
        else if (list.length === 1) formData.append('document', list[0]);
        return { url: '/documents/upload', method: 'POST', body: formData };
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          const empresaId = Number(arg.empresaId);
          // Insertar optimistamente el nuevo documento al inicio de las listas activas
          dispatch(
            documentosApiSlice.util.updateQueryData(
              'getDocumentsByEmpresa',
              { dadorId: empresaId },
              (draft: any[]) => {
                if (!Array.isArray(draft)) return;
                // Evitar duplicados
                const exists = draft.some((d: any) => Number(d.id) === Number((created as any)?.id));
                if (!exists) draft.unshift(created as any);
              }
            )
          );
          // Si hay vista filtrada por estado del nuevo documento, actualizarla también
          const status = (created as any)?.status;
          if (status) {
            dispatch(
              documentosApiSlice.util.updateQueryData(
                'getDocumentsByEmpresa',
                { dadorId: empresaId, status: String(status) },
                (draft: any[]) => {
                  if (!Array.isArray(draft)) return;
                  const exists = draft.some((d: any) => Number(d.id) === Number((created as any)?.id));
                  if (!exists) draft.unshift(created as any);
                }
              )
            );
          }
        } catch {
          // noop: la invalidación de tags garantizará consistencia eventual
        }
      },
      invalidatesTags: ['Document', 'Dashboard', 'Equipos'],
    }),

    deleteDocument: builder.mutation<void, number>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Document', 'Dashboard'],
    }),

    // Templates CRUD
    createTemplate: builder.mutation<
      DocumentTemplate,
      { nombre: string; entityType: string }
    >({
      query: (data) => ({
        url: '/templates',
        method: 'POST',
        body: {
          name: data.nombre,
          entityType: data.entityType,
        },
      }),
      invalidatesTags: ['DocumentTemplate'],
    }),

    updateTemplate: builder.mutation<
      DocumentTemplate,
      { id: number; nombre?: string; isActive?: boolean }
    >({
      query: ({ id, isActive, nombre }) => {
        const body: any = {};
        // Mapear nombre a name para el backend
        if (nombre !== undefined) body.name = nombre;
        // Convertir isActive a active para el backend
        if (isActive !== undefined) body.active = isActive;
        
        return {
          url: `/templates/${id}`,
          method: 'PUT',
          body,
        };
      },
      invalidatesTags: ['DocumentTemplate'],
    }),

    deleteTemplate: builder.mutation<void, number>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DocumentTemplate'],
    }),

    // =================================
    // DASHBOARD
    // =================================
    getDashboardData: builder.query<DashboardData, void>({
      query: () => '/dashboard/semaforos',
      providesTags: ['Dashboard'],
      // Polling cada 2 minutos como fallback si WebSocket no está disponible
      pollingInterval: 120000,
    }),
    // Resumen de pendientes de aprobación
    getPendingSummary: builder.query<{ total: number; top: Array<{ templateId: number; templateName: string; count: number }>; lastUploads: Array<{ id: number; uploadedAt: string; fileName: string; dadorCargaId: number }> }, void>({
      query: () => '/dashboard/pending/summary',
      transformResponse: (r: any) => r?.data ?? { total: 0, top: [], lastUploads: [] },
      transformErrorResponse: (error: any) => {
        console.warn('getPendingSummary endpoint not available, using fallback');
        return { total: 0, top: [], lastUploads: [] };
      },
      providesTags: ['Dashboard'],
    }),
    getDashboardStats: builder.query<
      {
        totalDocuments: number;
        pendingDocuments: number;
        expiredDocuments: number;
        approvedDocuments: number;
        recentActivity: Array<{
          id: number;
          action: string;
          entityType: string;
          entityId: string;
          timestamp: string;
        }>;
      },
      void
    >({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
    }),
    getEquipoKpis: builder.query<{ since: string; created: number; swaps: number; deleted: number }, { since?: string } | void>({
      query: (args) => {
        const since = (args as any)?.since;
        return { url: `/dashboard/equipo-kpis${since ? `?since=${encodeURIComponent(since)}` : ''}` };
      },
      transformResponse: (r: any) => r?.data ?? { since: '', created: 0, swaps: 0, deleted: 0 },
      providesTags: ['Dashboard'],
      pollingInterval: 60000,
      // backoff básico: reintentos hasta 3 veces con delays 1s, 2s, 5s
      extraOptions: {
        maxRetries: 3,
        backoff: () => new Promise((resolve) => setTimeout(resolve, 1000)),
      } as any,
    }),

    // =================================
    // APPROVAL - Aprobación manual de documentos
    // =================================
    getApprovalPending: builder.query<{ data: ApprovalPendingDocument[]; pagination?: { page: number; limit: number; total: number; pages: number } }, { page?: number; limit?: number; entityType?: string; dadorCargaId?: number }>({
      query: ({ page, limit, entityType, dadorCargaId } = {}) => {
        const params = new URLSearchParams();
        if (page) params.set('page', String(page));
        if (limit) params.set('limit', String(limit));
        if (entityType) params.set('entityType', entityType);
        if (dadorCargaId) params.set('dadorCargaId', String(dadorCargaId));
        const qs = params.toString();
        return { url: `/approval/pending${qs ? `?${qs}` : ''}` };
      },
      transformResponse: (r: any) => ({ data: r?.data ?? [], pagination: r?.pagination }),
      transformErrorResponse: (error: any) => {
        console.warn('getApprovalPending endpoint not available, using fallback');
        return { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
      },
      providesTags: ['Approval'],
    }),
    getApprovalPendingById: builder.query<ApprovalPendingDocument, { id: number }>({
      query: ({ id }) => ({ url: `/approval/pending/${id}` }),
      transformResponse: (r: any) => r?.data ?? r,
      providesTags: (result, _err, arg) => [{ type: 'Approval' as const, id: arg.id }],
    }),
    approvePendingDocument: builder.mutation<any, { id: number; confirmedEntityType: string; confirmedEntityId: number | string; expiresAt?: string | null; reviewNotes?: string | null; templateId?: number }>({
      query: ({ id, expiresAt, templateId, ...rest }) => {
        const iso = (() => {
          if (!expiresAt) return undefined;
          if (/T/.test(expiresAt)) return expiresAt; // ya es ISO
          // Convertir YYYY-MM-DD → ISO a medianoche UTC
          return `${expiresAt}T00:00:00.000Z`;
        })();
        return {
          url: `/approval/pending/${id}/approve`,
          method: 'POST',
          body: { ...rest, confirmedExpiration: iso, confirmedTemplateId: templateId },
        };
      },
      invalidatesTags: ['Approval', 'Dashboard', 'Document', 'Equipos'],
    }),
    rejectPendingDocument: builder.mutation<any, { id: number; reason: string; reviewNotes?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/approval/pending/${id}/reject`, method: 'POST', body }),
      invalidatesTags: ['Approval', 'Dashboard', 'Document', 'Equipos'],
    }),
    batchApproveDocuments: builder.mutation<any, { items: Array<{ id: number; confirmedEntityType: string; confirmedEntityId: number; expiresAt?: string | null }>; reviewNotes?: string | null }>({
      query: (body) => ({ url: `/approval/pending/batch-approve`, method: 'POST', body }),
      invalidatesTags: ['Approval', 'Dashboard', 'Equipos'],
    }),
    getApprovalStats: builder.query<ApprovalStats, void>({
      query: () => ({ url: `/approval/stats` }),
      providesTags: ['Approval', 'Dashboard'],
    }),
    getApprovalKpis: builder.query<any, void>({
      query: () => ({ url: `/dashboard/approval-kpis` }),
      transformResponse: (r: any) => r?.data ?? r,
      transformErrorResponse: (error: any) => {
        console.warn('getApprovalKpis endpoint not available, using fallback');
        return { pending: 0, approvedToday: 0, asOf: new Date().toISOString() };
      },
      providesTags: ['Approval', 'Dashboard'],
      pollingInterval: 60000,
    }),

    // =================================
    // EMPRESAS TRANSPORTISTAS
    // =================================
    getEmpresasTransportistas: builder.query<EmpresaTransportista[], { dadorCargaId?: number; q?: string; page?: number; limit?: number }>({
      query: ({ dadorCargaId, q, page, limit }) => {
        const params = new URLSearchParams();
        if (dadorCargaId) params.set('dadorCargaId', String(dadorCargaId));
        if (q) params.set('q', q);
        if (page) params.set('page', String(page));
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return { url: `/empresas-transportistas${qs ? `?${qs}` : ''}` };
      },
      transformResponse: (r: any) => r?.list ?? r?.data ?? [],
      providesTags: ['EmpresasTransportistas'],
    }),
    getEmpresaTransportistaById: builder.query<EmpresaTransportista & { dadorCargaId?: number }, { id: number }>({
      query: ({ id }) => ({ url: `/empresas-transportistas/${id}` }),
      transformResponse: (r: any) => r?.data ?? r,
    }),
    createEmpresaTransportista: builder.mutation<EmpresaTransportista, { dadorCargaId: number; razonSocial: string; cuit: string; activo?: boolean; notas?: string }>({
      query: (body) => ({ url: `/empresas-transportistas`, method: 'POST', body }),
      transformResponse: (r: any) => r?.data,
      invalidatesTags: ['EmpresasTransportistas'],
    }),
    updateEmpresaTransportista: builder.mutation<EmpresaTransportista, { id: number; razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }>({
      query: ({ id, ...body }) => ({ url: `/empresas-transportistas/${id}`, method: 'PUT', body }),
      invalidatesTags: ['EmpresasTransportistas'],
    }),
    deleteEmpresaTransportista: builder.mutation<void, number>({
      query: (id) => ({ url: `/empresas-transportistas/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmpresasTransportistas'],
    }),
    getEmpresaTransportistaChoferes: builder.query<any, { id: number }>({
      query: ({ id }) => ({ url: `/empresas-transportistas/${id}/choferes` }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['EmpresasTransportistas', 'Maestros'],
    }),
    getEmpresaTransportistaEquipos: builder.query<any, { id: number }>({
      query: ({ id }) => ({ url: `/empresas-transportistas/${id}/equipos` }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['EmpresasTransportistas', 'Equipos'],
    }),

    // =================================
    // EQUIPOS attach/detach
    // =================================
    attachEquipoComponents: builder.mutation<any, { id: number; driverId?: number; truckId?: number; trailerId?: number; driverDni?: string; truckPlate?: string; trailerPlate?: string }>({
      query: ({ id, ...body }) => ({ url: `/equipos/${id}/attach`, method: 'POST', body }),
      invalidatesTags: ['Equipos', 'Dashboard'],
    }),
    detachEquipoComponents: builder.mutation<any, { id: number; driver?: boolean; truck?: boolean; trailer?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/equipos/${id}/detach`, method: 'POST', body }),
      invalidatesTags: ['Equipos', 'Dashboard'],
    }),

    // =================================
    // AUDITORÍA
    // =================================
    getAuditLogs: builder.query<
      { data: any[]; total: number; page: number; limit: number; totalPages: number },
      { page?: number; limit?: number; from?: string; to?: string; userEmail?: string; userRole?: string; method?: string; statusCode?: number; action?: string; entityType?: string; entityId?: number; pathContains?: string }
    >({
      query: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
        });
        return { url: `/audit/logs?${search.toString()}` };
      },
      transformResponse: (r: any) => ({
        data: r?.data ?? [],
        total: r?.total ?? 0,
        page: r?.page ?? 1,
        limit: r?.limit ?? 20,
        totalPages: r?.totalPages ?? 0,
      }),
      providesTags: ['Dashboard'],
    }),
    
    // =================================
    // PORTAL CLIENTE (Solo Lectura)
    // =================================
    getPortalClienteEquipos: builder.query<{
      equipos: Array<{
        id: number;
        identificador: string;
        camion: { patente: string; marca?: string; modelo?: string } | null;
        acoplado: { patente: string } | null;
        chofer: { nombre: string; apellido: string; dni: string } | null;
        empresaTransportista: { razonSocial: string; cuit: string } | null;
        estadoCompliance: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'INCOMPLETO';
        proximoVencimiento: string | null;
        asignadoDesde: string;
      }>;
      resumen: {
        total: number;
        vigentes: number;
        proximosVencer: number;
        vencidos: number;
        incompletos: number;
      };
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }, { page?: number; limit?: number; search?: string; estado?: string }>({
      query: ({ page = 1, limit = 10, search = '', estado = '' }) => {
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('limit', String(limit));
        if (search) params.append('search', search);
        if (estado) params.append('estado', estado);
        return { url: `/portal-cliente/equipos?${params.toString()}` };
      },
      transformResponse: (r: any) => r?.data ?? { 
        equipos: [], 
        resumen: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 },
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      providesTags: ['Equipos'],
    }),
    
    getPortalClienteEquipoDetalle: builder.query<{
      equipo: {
        id: number;
        camion: { patente: string; marca?: string; modelo?: string } | null;
        acoplado: { patente: string; tipo?: string } | null;
        chofer: { nombre: string; apellido: string; dni: string } | null;
        empresaTransportista: { razonSocial: string; cuit: string } | null;
        asignadoDesde: string;
      };
      documentos: Array<{
        id: number;
        templateName: string;
        entityType: string;
        entityName: string;
        status: string;
        expiresAt: string | null;
        estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO';
        descargable: boolean;
        uploadedAt: string;
      }>;
      resumenDocs: {
        total: number;
        vigentes: number;
        proximosVencer: number;
        vencidos: number;
      };
      hayDocumentosDescargables: boolean;
    }, { id: number }>({
      query: ({ id }) => ({ url: `/portal-cliente/equipos/${id}` }),
      transformResponse: (r: any) => r?.data ?? { 
        equipo: null, 
        documentos: [], 
        resumenDocs: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0 },
        hayDocumentosDescargables: false 
      },
      providesTags: ['Equipos'],
    }),
    
    // =================================
    // PORTAL TRANSPORTISTA
    // =================================
    getPortalTransportistaMisEntidades: builder.query<{
      empresas: any[];
      choferes: any[];
      camiones: any[];
      acoplados: any[];
      contadores: { pendientes: number; rechazados: number; porVencer: number };
    }, void>({
      query: () => ({ url: '/portal-transportista/mis-entidades' }),
      transformResponse: (r: any) => r?.data ?? { empresas: [], choferes: [], camiones: [], acoplados: [], contadores: { pendientes: 0, rechazados: 0, porVencer: 0 } },
      providesTags: ['Equipos'],
    }),
    
    getPortalTransportistaEquipos: builder.query<any[], void>({
      query: () => ({ url: '/portal-transportista/equipos' }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Equipos'],
    }),
    
    getPortalTransportistaDocumentosRechazados: builder.query<any[], void>({
      query: () => ({ url: '/portal-transportista/documentos/rechazados' }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Documents'],
    }),
    
    getPortalTransportistaDocumentosPendientes: builder.query<any[], void>({
      query: () => ({ url: '/portal-transportista/documentos/pendientes' }),
      transformResponse: (r: any) => r?.data ?? [],
      providesTags: ['Documents'],
    }),
    
    // Resubir documento rechazado
    resubmitDocument: builder.mutation<any, { documentId: number; file: File }>({
      query: ({ documentId, file }) => {
        const formData = new FormData();
        formData.append('document', file);
        return {
          url: `/documents/${documentId}/resubmit`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Documents', 'Equipos'],
    }),
    
    // Stats por rol (dashboard personalizado)
    getStatsPorRol: builder.query<any, void>({
      query: () => '/dashboard/stats-por-rol',
      transformResponse: (r: any) => r?.data ?? {},
    }),
  }),
});

// =================================
// HOOKS EXPORTADOS
// =================================
export const {
  useGetTemplatesQuery,
  useGetDocumentsByEmpresaQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  // Descarga
  useDownloadDocumentoQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useGetDashboardDataQuery,
  useGetPendingSummaryQuery,
  useGetDashboardStatsQuery,
  useGetEquipoKpisQuery,
  // Nuevos hooks - Clientes
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useGetClientRequirementsQuery,
  useAddClientRequirementMutation,
  useRemoveClientRequirementMutation,
  // Portal Cliente
  useGetClienteEquiposQuery,
  useGetDocumentosPorEquipoQuery,
  useBulkSearchPlatesMutation,
  useRequestClientsBulkZipMutation,
  useGetClientsZipJobQuery,
  useLazyGetClientsZipJobQuery,
  useGetMisEquiposQuery,
  useTransportistasSearchMutation,
  // Nuevos hooks - Equipos
  useGetEquiposQuery,
  useGetEquipoByIdQuery,
  useGetEquipoHistoryQuery,
  useCreateEquipoMutation,
  useCreateEquipoCompletoMutation,
  useRollbackEquipoCompletoMutation,
  useUpdateEquipoMutation,
  useDeleteEquipoMutation,
  useAssociateEquipoClienteMutation,
  useRemoveEquipoClienteMutation,
  // Alta mínima de equipo
  useCreateEquipoMinimalMutation,
  // Búsqueda
  useSearchEquiposQuery,
  useLazySearchEquiposQuery,
  useSearchEquiposPagedQuery,
  useLazySearchEquiposPagedQuery,
  useSearchEquiposByDnisMutation,
  useDownloadVigentesBulkMutation,
  // Dadores
  useGetDadoresQuery,
  useCreateDadorMutation,
  useUpdateDadorMutation,
  useDeleteDadorMutation,
  // Maestros
  useGetChoferesQuery,
  useGetChoferByIdQuery,
  useCreateChoferMutation,
  useUpdateChoferMutation,
  useDeleteChoferMutation,
  useGetCamionesQuery,
  useCreateCamionMutation,
  useUpdateCamionMutation,
  useDeleteCamionMutation,
  useGetAcopladosQuery,
  useCreateAcopladoMutation,
  useUpdateAcopladoMutation,
  useDeleteAcopladoMutation,
  // Batch jobs
  useGetJobStatusQuery,
  useLazyGetJobStatusQuery,
  useImportCsvEquiposMutation,
  useUploadBatchDocsDadorMutation,
  useUploadBatchDocsTransportistasMutation,
  useGetDefaultsQuery,
  useUpdateDefaultsMutation,
  // Approval
  useGetApprovalPendingQuery,
  useGetApprovalPendingByIdQuery,
  useApprovePendingDocumentMutation,
  useRejectPendingDocumentMutation,
  useBatchApproveDocumentsMutation,
  useGetApprovalStatsQuery,
  useGetApprovalKpisQuery,
  // Compliance
  useGetEquipoComplianceQuery,
  useLazyGetEquipoComplianceQuery,
  // Empresas Transportistas
  useGetEmpresasTransportistasQuery,
  useGetEmpresaTransportistaByIdQuery,
  useCreateEmpresaTransportistaMutation,
  useUpdateEmpresaTransportistaMutation,
  useDeleteEmpresaTransportistaMutation,
  useGetEmpresaTransportistaChoferesQuery,
  useGetEmpresaTransportistaEquiposQuery,
  // Equipos attach/detach
  useAttachEquipoComponentsMutation,
  useDetachEquipoComponentsMutation,
  // Edición de equipos
  useUpdateEquipoEntidadesMutation,
  useAddEquipoClienteMutation,
  useRemoveEquipoClienteWithArchiveMutation,
  useTransferirEquipoMutation,
  useToggleEquipoActivoMutation,
  useGetEquipoRequisitosQuery,
  useGetEquipoAuditHistoryQuery,
  // Auditoría
  useGetAuditLogsQuery,
  // Portal Cliente (Solo lectura)
  useGetPortalClienteEquiposQuery,
  useGetPortalClienteEquipoDetalleQuery,
  // Portal Transportista
  useGetPortalTransportistaMisEntidadesQuery,
  useGetPortalTransportistaEquiposQuery,
  useGetPortalTransportistaDocumentosRechazadosQuery,
  useGetPortalTransportistaDocumentosPendientesQuery,
  // Resubir documento
  useResubmitDocumentMutation,
  // Stats por rol
  useGetStatsPorRolQuery,
} = documentosApiSlice;