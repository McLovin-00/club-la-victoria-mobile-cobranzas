import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('\n⚙️  Backfilling new FK columns...');

  // Permisos → end_user_id segun role user
  const permisosUpdated = await prisma.$executeRawUnsafe<number>(`
    UPDATE "permisos" p
    SET end_user_id = u.id
    FROM "users" u
    WHERE p.user_id = u.id AND u.role = 'user';
  `);

  // AuditLogs → platform_admin_id y end_user_id
  const auditAdminUpdated = await prisma.$executeRawUnsafe<number>(`
    UPDATE "audit_logs" a
    SET platform_admin_id = a.admin_id
    FROM "users" u
    WHERE a.admin_id = u.id AND u.role IN ('admin', 'superadmin');
  `);

  const auditUserUpdated = await prisma.$executeRawUnsafe<number>(`
    UPDATE "audit_logs" a
    SET end_user_id = a.user_id
    FROM "users" u
    WHERE a.user_id = u.id AND u.role = 'user';
  `);

  console.log(`✅  Backfill completado. Permisos: ${permisosUpdated}, Audit admin: ${auditAdminUpdated}, Audit user: ${auditUserUpdated}`);
}

backfill()
  .catch((error) => {
    console.error('❌  Error durante el backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 