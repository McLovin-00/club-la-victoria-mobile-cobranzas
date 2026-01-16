/*
  Script: Reset de plantillas de documentos según FLOWISE_PROMPT_DOCUMENTOS.md
  Estrategia segura:
  - Upsert de la lista canónica
  - Desactivar (active=false) todas las plantillas existentes que no estén en la lista
  - No se borran filas para no romper FKs de documentos/requisitos
*/

import 'dotenv/config';
import { PrismaClient, EntityType } from '.prisma/documentos';

const prisma = new PrismaClient();

type DesiredTemplate = { name: string; entityType: EntityType };

const desiredTemplates: DesiredTemplate[] = [
  // EMPRESA_TRANSPORTISTA
  { name: 'Constancia de ARCA Empresa', entityType: EntityType.EMPRESA_TRANSPORTISTA },
  { name: 'Constancia IIBB de Empresa', entityType: EntityType.EMPRESA_TRANSPORTISTA },
  { name: 'Presentación mensual de la declaración jurada F.931, acuse y constancia de pago', entityType: EntityType.EMPRESA_TRANSPORTISTA },

  // CHOFER
  { name: 'DNI', entityType: EntityType.CHOFER },
  { name: 'Licencia', entityType: EntityType.CHOFER },
  { name: 'Alta Temprana', entityType: EntityType.CHOFER },
  { name: 'ART', entityType: EntityType.CHOFER },
  { name: 'Seguro de Vida Obligatorio', entityType: EntityType.CHOFER },

  // CAMION (Tractor)
  { name: 'Titulo Tractor', entityType: EntityType.CAMION },
  { name: 'Cedula Tractor', entityType: EntityType.CAMION },
  { name: 'Seguro Tractor', entityType: EntityType.CAMION },
  { name: 'RTO Tractor', entityType: EntityType.CAMION },

  // ACOPLADO (Semirremolque)
  { name: 'Titulo Semirremolque', entityType: EntityType.ACOPLADO },
  { name: 'Cedula Semirremolque', entityType: EntityType.ACOPLADO },
  { name: 'Seguro Acoplado', entityType: EntityType.ACOPLADO },
  { name: 'RTO Semirremolque', entityType: EntityType.ACOPLADO },
];

async function resetTemplates(): Promise<void> {
  const desiredKey = (t: DesiredTemplate) => `${t.entityType}::${t.name}`;
  const desiredKeys = new Set(desiredTemplates.map(desiredKey));

  console.log('📄 Plantillas deseadas (canónicas):');
  desiredTemplates.forEach((t: DesiredTemplate) => console.log(`- [${t.entityType}] ${t.name}`));

  // Upsert de cada plantilla deseada
  for (const tpl of desiredTemplates) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: tpl.name, entityType: tpl.entityType },
    });

    if (existing) {
      await prisma.documentTemplate.update({
        where: { id: existing.id },
        data: { active: true, name: tpl.name, entityType: tpl.entityType },
      });
    } else {
      await prisma.documentTemplate.create({
        data: { name: tpl.name, entityType: tpl.entityType, active: true },
      });
    }
  }

  // Desactivar todo lo que no esté en la lista
  const all = await prisma.documentTemplate.findMany({});
  const toDeactivate = all.filter((t: any): boolean => !desiredKeys.has(`${t.entityType}::${t.name}`) && t.active);

  if (toDeactivate.length > 0) {
    console.log(`\n⚠️ Desactivando ${toDeactivate.length} plantillas no canónicas...`);
    for (const t of toDeactivate) {
      await prisma.documentTemplate.update({ where: { id: t.id }, data: { active: false } });
    }
  }

  const finalList = await prisma.documentTemplate.findMany({ orderBy: [{ entityType: 'asc' }, { name: 'asc' }] });
  console.log('\n✅ Plantillas finales en BD:');
  finalList.forEach((t: any) => console.log(`- [${t.entityType}] ${t.name} ${t.active ? '(activa)' : '(inactiva)'}`));
}

resetTemplates()
  .catch((e) => {
    console.error('💥 Error al resetear plantillas:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


