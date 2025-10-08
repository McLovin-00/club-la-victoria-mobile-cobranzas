import { db } from '../config/database';
import { AppLogger } from '../config/logger';

export class EmpresaTransportistaService {
  static async list(
    tenantEmpresaId: number,
    dadorCargaId: number,
    filters: { activo?: boolean; q?: string; page?: number; limit?: number } = {}
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const { activo, q, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantEmpresaId,
      dadorCargaId,
      ...(activo !== undefined && { activo }),
      ...(q && { OR: [{ razonSocial: { contains: q, mode: 'insensitive' } }, { cuit: { contains: q } }] }),
    };

    const [empresas, total] = await Promise.all([
      db.getClient().empresaTransportista.findMany({
        where,
        include: {
          _count: { select: { choferes: true, camiones: true, acoplados: true, equipos: true } },
        },
        skip,
        take: limit,
        orderBy: { razonSocial: 'asc' },
      }),
      db.getClient().empresaTransportista.count({ where }),
    ]);

    return {
      data: empresas,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: number, tenantEmpresaId: number): Promise<any | null> {
    return db.getClient().empresaTransportista.findFirst({
      where: { id, tenantEmpresaId },
      include: {
        dador: { select: { id: true, razonSocial: true } },
        _count: { select: { choferes: true, camiones: true, acoplados: true, equipos: true } },
      },
    });
  }

  static async create(data: {
    dadorCargaId: number;
    tenantEmpresaId: number;
    razonSocial: string;
    cuit: string;
    activo?: boolean;
    notas?: string;
  }): Promise<any> {
    const dador = await db.getClient().dadorCarga.findFirst({ where: { id: data.dadorCargaId, tenantEmpresaId: data.tenantEmpresaId } });
    if (!dador) throw new Error('Dador de carga no encontrado');

    const empresa = await db.getClient().empresaTransportista.create({
      data,
      include: { dador: { select: { id: true, razonSocial: true } } },
    });
    AppLogger.info(`Empresa transportista creada: ${empresa.id}`);
    return empresa;
  }

  static async update(
    id: number,
    tenantEmpresaId: number,
    data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }
  ): Promise<any> {
    const result = await db.getClient().empresaTransportista.updateMany({ where: { id, tenantEmpresaId }, data });
    if (result.count === 0) throw new Error('Empresa transportista no encontrada');
    return this.getById(id, tenantEmpresaId);
  }

  static async delete(id: number, tenantEmpresaId: number): Promise<boolean> {
    const counts = await db.getClient().empresaTransportista.findFirst({
      where: { id, tenantEmpresaId },
      select: { _count: { select: { choferes: true, camiones: true, acoplados: true, equipos: true } } },
    });
    if (!counts) throw new Error('Empresa transportista no encontrada');
    const totalAssets = counts._count.choferes + counts._count.camiones + counts._count.acoplados + counts._count.equipos;
    if (totalAssets > 0) throw new Error('No se puede eliminar empresa con activos asociados');

    const del = await db.getClient().empresaTransportista.deleteMany({ where: { id, tenantEmpresaId } });
    if (del.count === 0) throw new Error('Empresa transportista no encontrada');
    AppLogger.info(`Empresa transportista eliminada: ${id}`);
    return true;
  }

  static async getChoferes(id: number, tenantEmpresaId: number): Promise<any[]> {
    return db.getClient().chofer.findMany({ where: { empresaTransportistaId: id, tenantEmpresaId }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] });
  }

  static async getEquipos(id: number, tenantEmpresaId: number): Promise<any[]> {
    return db.getClient().equipo.findMany({ where: { empresaTransportistaId: id, tenantEmpresaId }, orderBy: { createdAt: 'desc' } });
  }
}


