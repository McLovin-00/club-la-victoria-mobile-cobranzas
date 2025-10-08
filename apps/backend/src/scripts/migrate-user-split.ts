import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('\n🚀  Iniciando migración de usuarios a PlatformUser y EndUser...');

  // 1. Copiar usuarios de plataforma (admin, superadmin)
  const platformInsert = await prisma.$executeRawUnsafe<number>(`
    INSERT INTO "platform_users" (id, email, password, role, empresa_id, nombre, apellido, created_at, updated_at)
    SELECT id, email, password, role::"PlatformUserRole", empresa_id, nombre, apellido, created_at, updated_at
    FROM "users"
    WHERE role IN ('admin', 'superadmin')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 2. Copiar usuarios finales (user)
  const endInsert = await prisma.$executeRawUnsafe<number>(`
    INSERT INTO "end_users" (id, email, password, role, empresa_id, nombre, contacto, created_at, updated_at)
    SELECT id, email, password, 'client'::"EndUserRole", empresa_id, nombre, nombre AS contacto, created_at, updated_at
    FROM "users"
    WHERE role = 'user'
    ON CONFLICT (id) DO NOTHING;
  `);

  // 3. Estadísticas
  const totalUsers = await prisma.user.count();
  console.log(`✅  Migración terminada. Platform: ${platformInsert}, End: ${endInsert}, Total procesados: ${totalUsers}`);
}

migrate()
  .catch((error) => {
    console.error('❌  Error durante la migración:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 