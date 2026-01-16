import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../../store/store';
import type { Remito, RemitoStats, RemitosListParams, RemitosListResponse } from '../types';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';

// Base URL del microservicio de remitos
// Usa la misma base que documentos pero apunta al puerto de remitos
const documentosApiUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL');
const REMITOS_API_URL =
  getRuntimeEnv('VITE_REMITOS_API_URL') ||
  (documentosApiUrl ? documentosApiUrl.replace(/\/api\/docs$/, '/api/remitos') : undefined) ||
  '/api/remitos';

export const remitosApiSlice = createApi({
  reducerPath: 'remitosApi',
  baseQuery: fetchBaseQuery({
    baseUrl: REMITOS_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;
      const empresaId = state.auth?.user?.empresaId;
      if (token) headers.set('authorization', `Bearer ${token}`);
      if (empresaId) headers.set('x-tenant-id', String(empresaId));
      return headers;
    },
  }),
  tagTypes: ['Remito', 'RemitoStats'],
  endpoints: (builder) => ({
    
    // Listar remitos
    getRemitos: builder.query<RemitosListResponse, RemitosListParams>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['Remito'],
    }),
    
    // Obtener remito por ID
    getRemito: builder.query<{ success: boolean; data: Remito }, number>({
      query: (id) => `/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Remito', id }],
    }),
    
    // Subir nuevo remito (múltiples imágenes o PDF)
    uploadRemito: builder.mutation<
      { success: boolean; data: { id: number; estado: string; imagenesCount: number } },
      { 
        files: File[]; 
        dadorCargaId?: number; 
        choferId?: number;
        // Datos del chofer que carga o fue seleccionado
        choferDni?: string;
        choferNombre?: string;
        choferApellido?: string;
      }
    >({
      query: ({ files, dadorCargaId, choferId, choferDni, choferNombre, choferApellido }) => {
        const formData = new FormData();
        // Agregar todos los archivos con el mismo nombre de campo
        for (const file of files) {
          formData.append('imagenes', file);
        }
        if (dadorCargaId) formData.append('dadorCargaId', String(dadorCargaId));
        if (choferId) formData.append('choferId', String(choferId));
        // Datos del chofer que cargó/seleccionó
        if (choferDni) formData.append('choferDni', choferDni);
        if (choferNombre) formData.append('choferNombre', choferNombre);
        if (choferApellido) formData.append('choferApellido', choferApellido);
        return {
          url: '',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Remito', 'RemitoStats'],
    }),
    
    // Aprobar remito
    approveRemito: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Remito', id },
        'Remito',
        'RemitoStats',
      ],
    }),
    
    // Rechazar remito
    rejectRemito: builder.mutation<
      { success: boolean; message: string },
      { id: number; motivo: string }
    >({
      query: ({ id, motivo }) => ({
        url: `/${id}/reject`,
        method: 'POST',
        body: { motivo },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Remito', id },
        'Remito',
        'RemitoStats',
      ],
    }),
    
    // Estadísticas
    getStats: builder.query<{ success: boolean; data: RemitoStats }, void>({
      query: () => '/stats',
      providesTags: ['RemitoStats'],
    }),
    
    // Obtener URL de imagen
    getImageUrl: builder.query<
      { success: boolean; data: { url: string } },
      { remitoId: number; imagenId: number }
    >({
      query: ({ remitoId, imagenId }) => `/${remitoId}/image/${imagenId}`,
    }),
    
    // Reprocesar remito con IA
    reprocessRemito: builder.mutation<
      { success: boolean; message: string; data: { id: number; estado: string; jobId: string } },
      number
    >({
      query: (id) => ({
        url: `/${id}/reprocess`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Remito', id },
        'Remito',
        'RemitoStats',
      ],
    }),
    
    // Editar datos del remito (antes de aprobar)
    updateRemito: builder.mutation<
      { success: boolean; message: string; data: Remito },
      {
        id: number;
        data: {
          numeroRemito?: string | null;
          fechaOperacion?: string | null;
          emisorNombre?: string | null;
          emisorDetalle?: string | null;
          clienteNombre?: string | null;
          producto?: string | null;
          transportistaNombre?: string | null;
          choferNombre?: string | null;
          choferDni?: string | null;
          patenteChasis?: string | null;
          patenteAcoplado?: string | null;
          pesoOrigenBruto?: number | null;
          pesoOrigenTara?: number | null;
          pesoOrigenNeto?: number | null;
          pesoDestinoBruto?: number | null;
          pesoDestinoTara?: number | null;
          pesoDestinoNeto?: number | null;
        };
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Remito', id },
        'Remito',
      ],
    }),
    
  }),
});

export const {
  useGetRemitosQuery,
  useGetRemitoQuery,
  useUploadRemitoMutation,
  useApproveRemitoMutation,
  useRejectRemitoMutation,
  useReprocessRemitoMutation,
  useUpdateRemitoMutation,
  useGetStatsQuery,
  useGetImageUrlQuery,
} = remitosApiSlice;

