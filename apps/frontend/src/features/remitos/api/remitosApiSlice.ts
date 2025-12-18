import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../../../store/store';
import type { Remito, RemitoStats, RemitosListParams, RemitosListResponse } from '../types';

// Base URL del microservicio de remitos
// Usa la misma base que documentos pero apunta al puerto de remitos
const REMITOS_API_URL = import.meta.env.VITE_REMITOS_API_URL || 
  (import.meta.env.VITE_DOCUMENTOS_API_URL?.replace(/\/api\/docs$/, '/api/remitos')) ||
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
      { files: File[]; dadorCargaId?: number }
    >({
      query: ({ files, dadorCargaId }) => {
        const formData = new FormData();
        // Agregar todos los archivos con el mismo nombre de campo
        for (const file of files) {
          formData.append('imagenes', file);
        }
        if (dadorCargaId) formData.append('dadorCargaId', String(dadorCargaId));
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
    
  }),
});

export const {
  useGetRemitosQuery,
  useGetRemitoQuery,
  useUploadRemitoMutation,
  useApproveRemitoMutation,
  useRejectRemitoMutation,
  useReprocessRemitoMutation,
  useGetStatsQuery,
  useGetImageUrlQuery,
} = remitosApiSlice;

