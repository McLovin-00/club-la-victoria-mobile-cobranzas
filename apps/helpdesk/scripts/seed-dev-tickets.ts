/**
 * Inserta tickets de ejemplo en development para probar listados y multi-tenant.
 * Ejecutar tras migraciones de helpdesk y seed del backend (usuarios en platform).
 *
 * Uso (desde la raíz del monorepo):
 *   npx dotenv-cli -e .env -- npx tsx apps/helpdesk/scripts/seed-dev-tickets.ts
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { prisma } from '../src/config/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEV_SUBJECT_PREFIX = '[DEV]';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('Saltando seed de tickets helpdesk (NODE_ENV=production).');
    return;
  }

  console.log('--- Seed tickets helpdesk (development) ---');

  await prisma.$connect();

  const users = await prisma.$queryRaw<
    Array<{ id: number; empresa_id: number | null; email: string; nombre: string | null; apellido: string | null }>
  >`
    SELECT id, empresa_id, email, nombre, apellido
    FROM "platform"."platform_users"
    WHERE email IN (
      'admin@empresa.com',
      'superadmin@empresa.com',
      'operador@empresa.com',
      'operador2@empresa-b.com'
    )
  `;

  if (users.length === 0) {
    console.log('No hay usuarios de plataforma esperados. Ejecutá antes: npm run seed -w apps/backend');
    return;
  }

  await prisma.ticket.deleteMany({
    where: { subject: { startsWith: DEV_SUBJECT_PREFIX } },
  });

  const last = await prisma.ticket.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  let nextNumber = (last?.number ?? 0) + 1;

  for (const u of users) {
    const displayName = [u.nombre, u.apellido].filter(Boolean).join(' ') || u.email;
    const subject = `${DEV_SUBJECT_PREFIX} Ticket prueba — ${u.email}`;

    const ticket = await prisma.ticket.create({
      data: {
        number: nextNumber,
        category: 'TECHNICAL',
        subcategory: 'DOUBT',
        subject: subject.slice(0, 200),
        status: 'OPEN',
        priority: 'NORMAL',
        empresaId: u.empresa_id,
        createdBy: u.id,
        createdByName: displayName.slice(0, 150),
        source: 'platform',
        messages: {
          create: {
            senderType: 'USER',
            senderId: String(u.id),
            senderName: displayName.slice(0, 150),
            content:
              'Mensaje inicial generado por seed de development. Podés filtrar por tenant y por usuario en /helpdesk.',
          },
        },
      },
    });

    console.log(`✅ Ticket #${ticket.number} (${ticket.id}) — ${u.email} — empresa_id=${u.empresa_id ?? 'null'}`);
    nextNumber += 1;
  }

  console.log('--- Fin seed tickets helpdesk ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
