import { z } from 'zod';

export const auditLogsQuerySchema = z.object({
  query: z.object({
    page: z
      .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).optional())
      .default(1),
    limit: z
      .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).max(100).optional())
      .default(20),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    userId: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
    userRole: z.string().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    statusCode: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(100).max(599).optional()),
    action: z.string().max(150).optional(),
    entityType: z.string().max(50).optional(),
    entityId: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
    pathContains: z.string().max(200).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});


