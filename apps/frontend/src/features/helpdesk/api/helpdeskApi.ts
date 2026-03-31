/**
 * Cliente RTK Query para el microservicio Helpdesk.
 * Normaliza respuestas `{ success, data, pagination? }` del API a los tipos usados en la UI.
 */

import { apiSlice } from '../../../store/apiSlice';
import {
  unwrapHelpdeskData,
  parsePaginatedTicketsResponse,
  parseMessagesResponse,
} from './helpdeskResponseParsers';
import type {
  Ticket,
  TicketMessage,
  TicketFilters,
  PaginatedTicketsResponse,
  HelpdeskStats,
  HelpdeskUnreadSummary,
  CreateTicketPayload,
  ResolverConfig,
  UpdateResolverConfigPayload,
  TicketCategory,
} from '../types';

const HELPDESK_BASE = '/helpdesk';

export const helpdeskApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    // Obtener lista de tickets con filtros y paginación
    getTickets: builder.query<PaginatedTicketsResponse, TicketFilters | void>({
      query: filters => {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.status) params.append('status', filters.status);
          if (filters.category) params.append('category', filters.category);
          if (filters.priority) params.append('priority', filters.priority);
          if (filters.search) params.append('search', filters.search);
          if (filters.from) params.append('from', new Date(filters.from).toISOString());
          if (filters.to) params.append('to', new Date(filters.to).toISOString());
        }
        const queryString = params.toString();
        const querySuffix = queryString.length > 0 ? `?${queryString}` : '';
        return {
          url: `${HELPDESK_BASE}/tickets${querySuffix}`,
          method: 'GET',
        };
      },
      providesTags: result =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Ticket' as const, id })),
              { type: 'Ticket', id: 'LIST' },
            ]
          : [{ type: 'Ticket', id: 'LIST' }],
      transformResponse: (response: unknown): PaginatedTicketsResponse => parsePaginatedTicketsResponse(response),
    }),

    // Obtener un ticket por ID
    getTicketById: builder.query<Ticket, string>({
      query: id => ({
        url: `${HELPDESK_BASE}/tickets/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Ticket', id }],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Obtener mensajes de un ticket
    getMessages: builder.query<{ data: TicketMessage[]; total: number }, string>({
      query: ticketId => ({
        url: `${HELPDESK_BASE}/tickets/${ticketId}/messages`,
        method: 'GET',
      }),
      providesTags: (_result, _error, ticketId) => [{ type: 'TicketMessage', id: ticketId }],
      transformResponse: (response: unknown): { data: TicketMessage[]; total: number } =>
        parseMessagesResponse(response),
    }),

    // Crear ticket: JSON o multipart si hay `files` (mismo endpoint que Telegram-like).
    createTicket: builder.mutation<Ticket, { payload: CreateTicketPayload; files?: File[] }>({
      query: ({ payload, files }) => {
        if (files && files.length > 0) {
          const fd = new FormData();
          fd.append('category', payload.category);
          fd.append('subcategory', payload.subcategory);
          fd.append('subject', payload.subject);
          fd.append('priority', payload.priority);
          fd.append('message', payload.message);
          files.forEach(f => {
            fd.append('attachments', f);
          });
          return {
            url: `${HELPDESK_BASE}/tickets`,
            method: 'POST',
            body: fd,
          };
        }
        return {
          url: `${HELPDESK_BASE}/tickets`,
          method: 'POST',
          body: payload,
        };
      },
      invalidatesTags: [{ type: 'Ticket', id: 'LIST' }, 'HelpdeskStats'],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Enviar mensaje a un ticket
    sendMessage: builder.mutation<TicketMessage, { ticketId: string; content: string }>({
      query: ({ ticketId, content }) => ({
        url: `${HELPDESK_BASE}/tickets/${ticketId}/messages`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketMessage', id: ticketId },
      ],
      transformResponse: (response: unknown): TicketMessage => unwrapHelpdeskData<TicketMessage>(response),
    }),

    // Enviar mensaje con adjuntos
    sendMessageWithAttachments: builder.mutation<
      TicketMessage,
      { ticketId: string; content: string; attachments?: File[] }
    >({
      query: ({ ticketId, content, attachments }) => {
        const formData = new FormData();
        formData.append('content', content);
        if (attachments) {
          attachments.forEach(file => {
            formData.append('attachments', file);
          });
        }
        return {
          url: `${HELPDESK_BASE}/tickets/${ticketId}/messages`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketMessage', id: ticketId },
      ],
      transformResponse: (response: unknown): TicketMessage => unwrapHelpdeskData<TicketMessage>(response),
    }),

    // Mensaje de resolver desde la web (mismo tipo que Telegram)
    sendResolverMessage: builder.mutation<
      TicketMessage,
      { ticketId: string; content: string; attachments?: File[] }
    >({
      query: ({ ticketId, content, attachments }) => {
        if (attachments && attachments.length > 0) {
          const formData = new FormData();
          formData.append('content', content);
          attachments.forEach(file => {
            formData.append('attachments', file);
          });
          return {
            url: `${HELPDESK_BASE}/admin/tickets/${ticketId}/messages`,
            method: 'POST',
            body: formData,
          };
        }
        return {
          url: `${HELPDESK_BASE}/admin/tickets/${ticketId}/messages`,
          method: 'POST',
          body: { content },
        };
      },
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketMessage', id: ticketId },
      ],
      transformResponse: (response: unknown): TicketMessage => unwrapHelpdeskData<TicketMessage>(response),
    }),

    getResolverConfigs: builder.query<ResolverConfig[], void>({
      query: () => ({
        url: `${HELPDESK_BASE}/admin/config`,
        method: 'GET',
      }),
      providesTags: ['ResolverConfig'],
      transformResponse: (response: unknown): ResolverConfig[] => unwrapHelpdeskData<ResolverConfig[]>(response),
    }),

    updateResolverConfig: builder.mutation<
      ResolverConfig,
      { category: TicketCategory; payload: UpdateResolverConfigPayload }
    >({
      query: ({ category, payload }) => ({
        url: `${HELPDESK_BASE}/admin/config/${category}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['ResolverConfig'],
      transformResponse: (response: unknown): ResolverConfig => unwrapHelpdeskData<ResolverConfig>(response),
    }),

    getUnreadSummary: builder.query<HelpdeskUnreadSummary, void>({
      query: () => ({
        url: `${HELPDESK_BASE}/tickets/unread-summary`,
        method: 'GET',
      }),
      providesTags: ['HelpdeskUnread'],
      transformResponse: (response: unknown): HelpdeskUnreadSummary =>
        unwrapHelpdeskData<HelpdeskUnreadSummary>(response),
    }),

    markTicketRead: builder.mutation<{ ticketId: string; readAt: string }, string>({
      query: ticketId => ({
        url: `${HELPDESK_BASE}/tickets/${ticketId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, ticketId) => [
        { type: 'Ticket', id: ticketId },
        { type: 'TicketMessage', id: ticketId },
        'HelpdeskUnread',
      ],
      transformResponse: (response: unknown): { ticketId: string; readAt: string } =>
        unwrapHelpdeskData<{ ticketId: string; readAt: string }>(response),
    }),

    // Actualizar prioridad de un ticket
    updateTicketPriority: builder.mutation<Ticket, { ticketId: string; priority: 'LOW' | 'NORMAL' | 'HIGH' }>({
      query: ({ ticketId, priority }) => ({
        url: `${HELPDESK_BASE}/tickets/${ticketId}/priority`,
        method: 'PATCH',
        body: { priority },
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [{ type: 'Ticket', id: ticketId }],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Actualizar estado de un ticket (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
    updateTicketStatus: builder.mutation<Ticket, { ticketId: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }>({
      query: ({ ticketId, status }) => ({
        url: `${HELPDESK_BASE}/tickets/${ticketId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        { type: 'Ticket', id: 'LIST' },
        'HelpdeskStats',
      ],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Cerrar ticket
    closeTicket: builder.mutation<Ticket, string>({
      query: id => ({
        url: `${HELPDESK_BASE}/tickets/${id}/close`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
      ],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Reabrir ticket
    reopenTicket: builder.mutation<Ticket, { id: string; message?: string }>({
      query: ({ id, message }) => ({
        url: `${HELPDESK_BASE}/tickets/${id}/reopen`,
        method: 'PATCH',
        body: { message },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
      ],
      transformResponse: (response: unknown): Ticket => unwrapHelpdeskData<Ticket>(response),
    }),

    // Obtener estadísticas
    getStats: builder.query<HelpdeskStats, void>({
      query: () => ({
        url: `${HELPDESK_BASE}/admin/stats`,
        method: 'GET',
      }),
      providesTags: ['HelpdeskStats'],
      transformResponse: (response: unknown): HelpdeskStats => unwrapHelpdeskData<HelpdeskStats>(response),
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetTicketsQuery,
  useGetTicketByIdQuery,
  useGetMessagesQuery,
  useCreateTicketMutation,
  useSendMessageMutation,
  useSendMessageWithAttachmentsMutation,
  useSendResolverMessageMutation,
  useGetResolverConfigsQuery,
  useUpdateResolverConfigMutation,
  useGetUnreadSummaryQuery,
  useMarkTicketReadMutation,
  useUpdateTicketPriorityMutation,
  useUpdateTicketStatusMutation,
  useCloseTicketMutation,
  useReopenTicketMutation,
  useGetStatsQuery,
} = helpdeskApi;
