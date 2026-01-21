import { prisma } from '../config/database';

export interface DuplicateCuitError {
  code: 'DUPLICATE_CUIT';
  message: string;
  existingDador: {
    id: number;
    razonSocial: string;
    cuit: string;
  };
}

export class DadorService {
  static async list(activo?: boolean, tenantEmpresaId?: number) {
    return prisma.dadorCarga.findMany({
      where: { ...(tenantEmpresaId ? { tenantEmpresaId } : {}), ...(activo !== undefined ? { activo } : {}) },
      orderBy: { razonSocial: 'asc' },
    });
  }

  static async findByCuit(tenantEmpresaId: number, cuit: string) {
    return prisma.dadorCarga.findFirst({
      where: { tenantEmpresaId, cuit },
      select: { id: true, razonSocial: true, cuit: true },
    });
  }

  static async create(input: { tenantEmpresaId: number; razonSocial: string; cuit: string; activo?: boolean; notas?: string; phones?: string[] }): Promise<{ success: true; data: any } | { success: false; error: DuplicateCuitError }> {
    const existing = await this.findByCuit(input.tenantEmpresaId, input.cuit);
    if (existing) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_CUIT',
          message: `Ya existe un dador de carga con CUIT ${input.cuit} (${existing.razonSocial})`,
          existingDador: existing,
        },
      };
    }
    const data = await prisma.dadorCarga.create({ data: input });
    return { success: true, data };
  }

  static async update(id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string; phones?: string[] }) {
    return prisma.dadorCarga.update({ where: { id }, data });
  }

  static async remove(id: number) {
    return prisma.$transaction(async (tx) => {
      // Quitar referencias desde maestros a este dador (si FK RESTRICT):
      // Choferes/Camiones/Acoplados se reasignan o bloquean en otras lógicas; aquí eliminamos en cascada lógica
      await tx.equipo.deleteMany({ where: { dadorCargaId: id } });
      await tx.chofer.deleteMany({ where: { dadorCargaId: id } });
      await tx.camion.deleteMany({ where: { dadorCargaId: id } });
      await tx.acoplado.deleteMany({ where: { dadorCargaId: id } });
      await tx.empresaTransportista.deleteMany({ where: { dadorCargaId: id } });
      // Finalmente, eliminar el dador
      return tx.dadorCarga.delete({ where: { id } });
    });
  }
}


