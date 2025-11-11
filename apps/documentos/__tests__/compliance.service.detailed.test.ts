jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: { findUnique: jest.fn() },
    clienteDocumentRequirement: { findMany: jest.fn() },
    document: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../src/config/database';
import { ComplianceService } from '../src/services/compliance.service';

describe('ComplianceService.evaluateEquipoClienteDetailed', () => {
  beforeEach(() => {
    (prisma.equipo.findUnique as any).mockReset();
    (prisma.clienteDocumentRequirement.findMany as any).mockReset();
    (prisma.document.findFirst as any).mockReset();
  });

  it('marks FALTANTE when acoplado requerido y equipo no tiene', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: null, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 1, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5 },
    ]);
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('FALTANTE');
  });

  it('marks RECHAZADO when last doc rejected', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: 30, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 2, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 3 },
    ]);
    (prisma.document.findFirst as any).mockResolvedValue({
      id: 99, status: 'RECHAZADO', expiresAt: null,
    });
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('RECHAZADO');
  });

  it('marks PENDIENTE when last doc pending', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: 30, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 3, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 2 },
    ]);
    (prisma.document.findFirst as any).mockResolvedValue({
      id: 100, status: 'PENDIENTE', expiresAt: null,
    });
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('PENDIENTE');
  });

  it('marks VENCIDO when approved but past expiration', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: 30, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 4, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10 },
    ]);
    (prisma.document.findFirst as any).mockResolvedValue({
      id: 101, status: 'APROBADO', expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('VENCIDO');
  });

  it('marks PROXIMO when approved and within anticipation days', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: 30, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 5, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10 },
    ]);
    (prisma.document.findFirst as any).mockResolvedValue({
      id: 102, status: 'APROBADO', expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('PROXIMO');
  });

  it('marks VIGENTE when approved and beyond anticipation days', async () => {
    (prisma.equipo.findUnique as any).mockResolvedValue({ id: 1, trailerId: 30, tenantEmpresaId: 1, dadorCargaId: 55, driverId: 10, truckId: 20 });
    (prisma.clienteDocumentRequirement.findMany as any).mockResolvedValue([
      { templateId: 6, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 2 },
    ]);
    (prisma.document.findFirst as any).mockResolvedValue({
      id: 103, status: 'APROBADO', expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const res = await ComplianceService.evaluateEquipoClienteDetailed(1, 77);
    expect(res[0].state).toBe('VIGENTE');
  });
});


