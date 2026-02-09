import { PrismaClient, EntityType, DocumentStatus } from '.prisma/documentos';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

function getConfig() {
  return {
    dadorId: Number(process.env.SEED_DADOR_ID || 1),
    tenantId: Number(process.env.SEED_TENANT_ID || 1),
    now: new Date(),
    dayMs: 24 * 60 * 60 * 1000,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function getTemplateMap(): Promise<Map<string, number>> {
  const templates = await prisma.documentTemplate.findMany({});
  const map = new Map<string, number>();
  for (const t of templates) {
    map.set(t.name, t.id);
  }
  return map;
}

async function findOrCreateCliente(tenantId: number): Promise<{ id: number }> {
  const existing = await prisma.cliente.findFirst({
    where: { tenantEmpresaId: tenantId, cuit: '30712345678' },
    select: { id: true },
  });
  
  if (existing) {
    console.log('ℹ️ Cliente demo ya existe:', existing.id);
    return existing;
  }

  const cliente = await prisma.cliente.create({
    data: {
      tenantEmpresaId: tenantId,
      razonSocial: 'Cliente Demo A SA',
      cuit: '30712345678',
      activo: true,
      notas: 'Cliente de ejemplo para pruebas de documentos',
    },
  });
  console.log('✅ Cliente demo creado:', cliente.id);
  return cliente;
}

async function createRequirementsIfNeeded(
  tenantId: number,
  clienteId: number,
  templates: Map<string, number>
): Promise<void> {
  const licenciaTplId = templates.get('Licencia Nacional de Conducir (frente y dorso)');
  const vtvTplId = templates.get('RTO - Revisión Técnica Obligatoria');
  const seguroAcopladoTplId = templates.get('Póliza de Seguro (incluye Cláusula de No Repetición)');

  if (!licenciaTplId || !vtvTplId || !seguroAcopladoTplId) {
    console.log('⚠️ Algunas plantillas no existen. Saltando creación de requisitos demo.');
    return;
  }

  const existingReqs = await prisma.clienteDocumentRequirement.findMany({
    where: { clienteId },
  });

  if (existingReqs.length > 0) {
    console.log('ℹ️ Requisitos ya existen para cliente:', clienteId);
    return;
  }

  await prisma.clienteDocumentRequirement.createMany({
    data: [
      { tenantEmpresaId: tenantId, clienteId, templateId: licenciaTplId, entityType: EntityType.CHOFER, obligatorio: true, diasAnticipacion: 15 },
      { tenantEmpresaId: tenantId, clienteId, templateId: vtvTplId, entityType: EntityType.CAMION, obligatorio: true, diasAnticipacion: 30 },
      { tenantEmpresaId: tenantId, clienteId, templateId: seguroAcopladoTplId, entityType: EntityType.ACOPLADO, obligatorio: false, diasAnticipacion: 10 },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Requisitos demo creados');
}

async function findOrCreateEquipo(
  tenantId: number,
  dadorId: number,
  now: Date,
  dayMs: number
): Promise<{ id: number }> {
  const existing = await prisma.equipo.findFirst({
    where: {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      driverDniNorm: '20333444',
      truckPlateNorm: 'ABC123',
    },
    select: { id: true },
  });

  if (existing) {
    console.log('ℹ️ Equipo demo ya existe:', existing.id);
    return existing;
  }

  const equipo = await prisma.equipo.create({
    data: {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      driverId: 101,
      truckId: 201,
      trailerId: 301,
      driverDniNorm: '20333444',
      truckPlateNorm: 'ABC123',
      trailerPlateNorm: 'XYZ987',
      validFrom: new Date(now.getTime() - dayMs),
      validTo: null,
    },
  });
  console.log('✅ Equipo demo creado:', equipo.id);
  return equipo;
}

async function associateClienteToEquipo(
  equipoId: number,
  clienteId: number,
  now: Date,
  dayMs: number
): Promise<void> {
  const existing = await prisma.equipoCliente.findFirst({
    where: { equipoId, clienteId, asignadoHasta: null },
  });

  if (existing) return;

  await prisma.equipoCliente.create({
    data: {
      equipoId,
      clienteId,
      asignadoDesde: new Date(now.getTime() - dayMs),
      asignadoHasta: null,
    },
  });
}

async function createDocumentsIfNeeded(
  tenantId: number,
  dadorId: number,
  templates: Map<string, number>,
  now: Date,
  dayMs: number
): Promise<void> {
  const licenciaTplId = templates.get('Licencia Nacional de Conducir (frente y dorso)');
  const vtvTplId = templates.get('RTO - Revisión Técnica Obligatoria');

  if (!licenciaTplId || !vtvTplId) {
    console.log('⚠️ Plantillas no encontradas. Saltando creación de documentos demo.');
    return;
  }

  await createDocumentIfNotExists({
    tenantId, dadorId, templateId: licenciaTplId, entityType: EntityType.CHOFER,
    entityId: 101, now, expiresInMs: dayMs * 90, fileName: 'licencia.pdf',
  });
  await createDocumentIfNotExists({
    tenantId, dadorId, templateId: vtvTplId, entityType: EntityType.CAMION,
    entityId: 201, now, expiresInMs: dayMs * 15, fileName: 'vtv.pdf',
  });
}

interface CreateDocumentParams {
  tenantId: number;
  dadorId: number;
  templateId: number;
  entityType: EntityType;
  entityId: number;
  now: Date;
  expiresInMs: number;
  fileName: string;
}

async function createDocumentIfNotExists(params: CreateDocumentParams): Promise<void> {
  const { tenantId, dadorId, templateId, entityType, entityId, now, expiresInMs, fileName } = params;
  
  const existing = await prisma.document.findFirst({
    where: { tenantEmpresaId: tenantId, templateId, entityType, entityId, dadorCargaId: dadorId },
  });

  if (existing) return;

  await prisma.document.create({
    data: {
      tenantEmpresaId: tenantId,
      templateId,
      entityType,
      entityId,
      dadorCargaId: dadorId,
      fileName,
      filePath: `documentos-empresa-t${tenantId}/${entityType.toLowerCase()}/${entityId}/${fileName}`,
      fileSize: 12345,
      mimeType: 'application/pdf',
      status: DocumentStatus.APROBADO,
      expiresAt: new Date(now.getTime() + expiresInMs),
    },
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('🌱 Seeding Documentos - clientes, requisitos, equipos y documentos demo...');

  const config = getConfig();
  const templates = await getTemplateMap();

  const cliente = await findOrCreateCliente(config.tenantId);
  await createRequirementsIfNeeded(config.tenantId, cliente.id, templates);

  const equipo = await findOrCreateEquipo(config.tenantId, config.dadorId, config.now, config.dayMs);
  await associateClienteToEquipo(equipo.id, cliente.id, config.now, config.dayMs);

  await createDocumentsIfNeeded(config.tenantId, config.dadorId, templates, config.now, config.dayMs);

  console.log('✅ Seed completado: cliente demo, requisitos, equipo y documentos');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding documentos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
