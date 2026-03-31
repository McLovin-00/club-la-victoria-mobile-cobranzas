import { z } from 'zod';

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ID param schema (cuid)
export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

// Ticket number param schema
export const ticketNumberParamSchema = z.object({
  ticketId: z.string().cuid(),
});

export type TicketNumberParam = z.infer<typeof ticketNumberParamSchema>;

// Date range filter
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// Search query
export const searchSchema = z.object({
  search: z.string().trim().max(200).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
