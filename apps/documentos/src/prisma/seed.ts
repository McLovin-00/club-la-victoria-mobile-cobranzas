import { PrismaClient, EntityType, DocumentStatus } from '.prisma/documentos';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding Documentos - templates, clientes, requisitos, equipos y documentos demo...');

  const templates = [
    { name: 'Licencia de Conducir', entityType: EntityType.CHOFER, active: true },
    { name: 'Certificado de Antecedentes', entityType: EntityType.CHOFER, active: true },
    { name: 'Seguro Vehicular', entityType: EntityType.CAMION, active: true },
    { name: 'Verificación Técnica', entityType: EntityType.CAMION, active: true },
    { name: 'Habilitación Dador', entityType: EntityType.DADOR, active: true },
    { name: 'Seguro de Carga', entityType: EntityType.ACOPLADO, active: true },
  ];

  await prisma.documentTemplate.createMany({ data: templates, skipDuplicates: true });

  // Obtener IDs de plantillas clave
  const tpl = await prisma.documentTemplate.findMany({});
  const getTplId = (name: string) => tpl.find(t => t.name === name)?.id as number;

  const licenciaTplId = getTplId('Licencia de Conducir');
  const vtvTplId = getTplId('Verificación Técnica');
  const seguroAcopladoTplId = getTplId('Seguro de Carga');

  // Dador demo (usar variable si está definida)
  const dadorId = Number(process.env.SEED_DADOR_ID || 1);
  const tenantId = Number(process.env.SEED_TENANT_ID || 1);

  // Cliente demo
  const clienteDemo = await prisma.cliente.create({
    data: {
      tenantEmpresaId: tenantId,
      razonSocial: 'Cliente Demo A SA',
      cuit: '30712345678',
      activo: true,
      notas: 'Cliente de ejemplo para pruebas de documentos',
    },
  }).catch(async () => {
    return prisma.cliente.findFirst({}) as any;
  });

  // Requisitos por cliente
  const existingReqs = await prisma.clienteDocumentRequirement.findMany({ where: { clienteId: clienteDemo.id } });
  if (existingReqs.length === 0) {
    await prisma.clienteDocumentRequirement.createMany({
      data: [
        { tenantEmpresaId: tenantId, clienteId: clienteDemo.id, templateId: licenciaTplId, entityType: EntityType.CHOFER, obligatorio: true, diasAnticipacion: 15 },
        { tenantEmpresaId: tenantId, clienteId: clienteDemo.id, templateId: vtvTplId, entityType: EntityType.CAMION, obligatorio: true, diasAnticipacion: 30 },
        { tenantEmpresaId: tenantId, clienteId: clienteDemo.id, templateId: seguroAcopladoTplId, entityType: EntityType.ACOPLADO, obligatorio: false, diasAnticipacion: 10 },
      ],
      skipDuplicates: true,
    });
  }

  // Equipo demo (chofer+camión+acoplado)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const equipoDemo = await prisma.equipo.create({
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

  // Asociar cliente al equipo
  await prisma.equipoCliente.create({
    data: {
      equipoId: equipoDemo.id,
      clienteId: clienteDemo.id,
      asignadoDesde: new Date(now.getTime() - dayMs),
      asignadoHasta: null,
    },
  });

  // Documentos demo para compliance: OK para chofer, PRÓXIMO para camión, FALTANTE para acoplado
  await prisma.document.create({
    data: {
      tenantEmpresaId: tenantId,
      templateId: licenciaTplId,
      entityType: EntityType.CHOFER,
      entityId: 101,
      dadorCargaId: dadorId,
      fileName: 'licencia.pdf',
      filePath: `documentos-empresa-t${tenantId}/chofer/101/licencia/seed.pdf`,
      fileSize: 12345,
      mimeType: 'application/pdf',
      status: DocumentStatus.APROBADO,
      expiresAt: new Date(now.getTime() + 90 * dayMs),
    },
  });

  await prisma.document.create({
    data: {
      tenantEmpresaId: tenantId,
      templateId: vtvTplId,
      entityType: EntityType.CAMION,
      entityId: 201,
      dadorCargaId: dadorId,
      fileName: 'vtv.pdf',
      filePath: `documentos-empresa-t${tenantId}/camion/201/vtv/seed.pdf`,
      fileSize: 23456,
      mimeType: 'application/pdf',
      status: DocumentStatus.APROBADO,
      expiresAt: new Date(now.getTime() + 15 * dayMs),
    },
  });

  console.log('✅ Seed completado: templates, cliente demo, requisitos, equipo y documentos');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding documentos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });