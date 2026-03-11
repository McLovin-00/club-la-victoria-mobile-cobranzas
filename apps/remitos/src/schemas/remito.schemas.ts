import { z } from 'zod';

export const updateRemitoSchema = z.object({
  numeroRemito: z.string().max(100).nullable().optional(),
  fechaOperacion: z.string().max(50).nullable().optional(),
  emisorNombre: z.string().max(200).nullable().optional(),
  emisorDetalle: z.string().max(500).nullable().optional(),
  clienteNombre: z.string().max(200).nullable().optional(),
  producto: z.string().max(200).nullable().optional(),
  transportistaNombre: z.string().max(200).nullable().optional(),
  choferNombre: z.string().max(200).nullable().optional(),
  choferDni: z.string().max(20).nullable().optional(),
  patenteChasis: z.string().max(20).nullable().optional(),
  patenteAcoplado: z.string().max(20).nullable().optional(),
  pesoOrigenBruto: z.number().nullable().optional(),
  pesoOrigenTara: z.number().nullable().optional(),
  pesoOrigenNeto: z.number().nullable().optional(),
  pesoDestinoBruto: z.number().nullable().optional(),
  pesoDestinoTara: z.number().nullable().optional(),
  pesoDestinoNeto: z.number().nullable().optional(),
}).strict();

export const rejectRemitoSchema = z.object({
  motivo: z.string().min(5, 'Motivo de rechazo requerido (mín 5 caracteres)').max(1000),
}).strict();

export const listRemitosQuerySchema = z.object({
  estado: z.string().max(50).optional(),
  fechaDesde: z.string().max(30).optional(),
  fechaHasta: z.string().max(30).optional(),
  numeroRemito: z.string().max(100).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
}).passthrough();

export const exportRemitosQuerySchema = z.object({
  fechaDesde: z.string().max(30).optional(),
  fechaHasta: z.string().max(30).optional(),
  estado: z.string().max(50).optional(),
  clienteNombre: z.string().max(200).optional(),
  transportistaNombre: z.string().max(200).optional(),
  patenteChasis: z.string().max(20).optional(),
  numeroRemito: z.string().max(100).optional(),
}).passthrough();
