import { z } from 'zod';

// Enums
export const ticketCategorySchema = z.enum(['TECHNICAL', 'OPERATIONAL']);
export const ticketSubcategorySchema = z.enum(['ERROR', 'DOUBT', 'SUGGESTION', 'BUSINESS_RULE']);
export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const ticketPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH']);

export type TicketCategory = z.infer<typeof ticketCategorySchema>;
export type TicketSubcategory = z.infer<typeof ticketSubcategorySchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

// Create ticket schema
export const createTicketSchema = z.object({
  category: ticketCategorySchema,
  subcategory: ticketSubcategorySchema,
  subject: z.string().trim().min(5, 'El asunto debe tener al menos 5 caracteres').max(200, 'El asunto no puede exceder 200 caracteres'),
  priority: ticketPrioritySchema.default('NORMAL'),
  message: z.string().trim().min(10, 'El mensaje debe tener al menos 10 caracteres').max(5000, 'El mensaje no puede exceder 5000 caracteres'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** Campos de ticket enviados en multipart (mensaje relajado; reglas en el controlador). */
export const createTicketMultipartFieldsSchema = z.object({
  category: ticketCategorySchema,
  subcategory: ticketSubcategorySchema,
  subject: z.string().trim().min(5, 'El asunto debe tener al menos 5 caracteres').max(200, 'El asunto no puede exceder 200 caracteres'),
  priority: ticketPrioritySchema.default('NORMAL'),
  message: z.string().trim().max(5000, 'El mensaje no puede exceder 5000 caracteres').optional().default(''),
});

export type CreateTicketMultipartFields = z.infer<typeof createTicketMultipartFieldsSchema>;

// Update ticket status schema
export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

// Ticket filters schema
export const ticketFiltersSchema = z.object({
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  priority: ticketPrioritySchema.optional(),
  search: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type TicketFiltersInput = z.infer<typeof ticketFiltersSchema>;

// List tickets query schema
export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  priority: ticketPrioritySchema.optional(),
  search: z.string().trim().max(200).optional(),
  from: z.string().optional(), // ISO date string
  to: z.string().optional(), // ISO date string
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

// Resolver config admin update
export const resolverConfigCategoryParamsSchema = z.object({
  category: ticketCategorySchema,
});

export const updateResolverConfigSchema = z.object({
  telegramGroupId: z.string().trim().min(1, 'El group ID es obligatorio').max(50),
  telegramGroupName: z.string().trim().max(100).optional(),
  resolverNames: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  isActive: z.coerce.boolean().default(true),
});

export type ResolverConfigCategoryParams = z.infer<typeof resolverConfigCategoryParamsSchema>;
export type UpdateResolverConfigInput = z.infer<typeof updateResolverConfigSchema>;

// Reopen ticket validation (72hs rule is enforced in service)
export const reopenTicketSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export type ReopenTicketInput = z.infer<typeof reopenTicketSchema>;

// Close ticket schema
export const closeTicketSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

// Update ticket priority schema
export const updateTicketPrioritySchema = z.object({
  priority: ticketPrioritySchema,
});

export type UpdateTicketPriorityInput = z.infer<typeof updateTicketPrioritySchema>;
