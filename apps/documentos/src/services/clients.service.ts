import { prisma } from '../config/database';

export class ClientsService {
  static async list(tenantEmpresaId: number, activo?: boolean) {
    return prisma.cliente.findMany({
      where: { tenantEmpresaId, ...(activo !== undefined ? { activo } : {}) },
      orderBy: { razonSocial: 'asc' },
    });
  }

  static async create(input: { tenantEmpresaId: number; razonSocial: string; cuit: string; activo?: boolean; notas?: string }) {
    return prisma.cliente.create({ data: input });
  }

  static async update(tenantEmpresaId: number, id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }) {
    return prisma.cliente.update({ where: { id }, data: { ...data, tenantEmpresaId } });
  }

  static async remove(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      // Eliminar dependencias: requisitos del cliente
      await tx.clienteDocumentRequirement.deleteMany({ where: { tenantEmpresaId, clienteId: id } });
      // Eliminar asociaciones equipo-cliente
      await tx.equipoCliente.deleteMany({ where: { clienteId: id, equipo: { tenantEmpresaId } } });
      // Finalmente, borrar el cliente
      return tx.cliente.delete({ where: { id } });
    });
  }

  static async addRequirement(tenantEmpresaId: number, clienteId: number, input: {
    templateId: number;
    entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO';
    obligatorio?: boolean;
    diasAnticipacion?: number;
    visibleChofer?: boolean;
  }) {
    return prisma.clienteDocumentRequirement.create({
      data: {
        tenantEmpresaId,
        clienteId,
        templateId: input.templateId,
        entityType: input.entityType as any,
        obligatorio: input.obligatorio ?? true,
        diasAnticipacion: input.diasAnticipacion ?? 0,
        visibleChofer: input.visibleChofer ?? true,
      },
    });
  }

  static async listRequirements(tenantEmpresaId: number, clienteId: number) {
    return prisma.clienteDocumentRequirement.findMany({
      where: { tenantEmpresaId, clienteId },
      include: { template: true },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });
  }

  static async removeRequirement(tenantEmpresaId: number, clienteId: number, requirementId: number) {
    return prisma.clienteDocumentRequirement.delete({
      where: { id: requirementId },
    });
  }
}


