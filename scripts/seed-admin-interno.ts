/**
 * Script para crear un usuario ADMIN_INTERNO en el servidor 10.3.0.243
 * 
 * Uso:
 * cd /home/administrador/monorepo-bca
 * npx ts-node -r tsconfig-paths/register scripts/seed-admin-interno.ts
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { hashSync } from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando creación de usuario ADMIN_INTERNO...\n');
  console.log(`📊 Database URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);

  try {
    // 1. Buscar empresa (tenant)
    const empresa = await prisma.empresa.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!empresa) {
      throw new Error('❌ No se encontró ninguna empresa en la base de datos');
    }

    console.log(`✅ Empresa encontrada: ${empresa.nombre} (ID: ${empresa.id})`);

    // 2. Verificar si ya existe el usuario
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin.interno@bca.com' },
    });

    if (existingUser) {
      console.log('\n⚠️ El usuario admin.interno@bca.com ya existe.');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Empresa: ${existingUser.empresaId}`);
      console.log('\n💡 Si deseas recrearlo, elimínalo primero y vuelve a ejecutar este script.\n');
      return;
    }

    // 3. Crear usuario ADMIN_INTERNO
    const password = 'Admin2024!';
    const hashedPassword = hashSync(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: 'admin.interno@bca.com',
        password: hashedPassword,
        role: UserRole.ADMIN_INTERNO,
        empresaId: empresa.id,
        nombre: 'Admin',
        apellido: 'Interno',
      },
    });

    console.log('\n✅ Usuario ADMIN_INTERNO creado exitosamente!\n');
    console.log('📋 Datos del usuario:');
    console.log('   ┌─────────────────────────────────────────────');
    console.log(`   │ ID:       ${newUser.id}`);
    console.log(`   │ Email:    ${newUser.email}`);
    console.log(`   │ Password: ${password}`);
    console.log(`   │ Role:     ${newUser.role}`);
    console.log(`   │ Empresa:  ${newUser.empresaId} (${empresa.nombre})`);
    console.log(`   │ Nombre:   ${newUser.nombre} ${newUser.apellido}`);
    console.log(`   │ Creado:   ${newUser.createdAt}`);
    console.log('   └─────────────────────────────────────────────\n');

    console.log('🌐 Acceso al portal:');
    console.log(`   URL:      http://10.3.0.243:3000/login`);
    console.log(`   Email:    ${newUser.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Portal:   http://10.3.0.243:3000/portal/admin-interno\n`);

    console.log('📝 Permisos del rol ADMIN_INTERNO:');
    console.log('   ✅ Acceso total a documentos');
    console.log('   ✅ Gestión de equipos (crear, modificar, eliminar)');
    console.log('   ✅ Aprobación de documentos');
    console.log('   ✅ Gestión de dadores de carga');
    console.log('   ✅ Ver y gestionar todos los maestros');
    console.log('   ✅ Auditoría del sistema');
    console.log('   ❌ NO puede modificar configuración global\n');

    console.log('✨ ¡Listo para usar!\n');

  } catch (error) {
    console.error('\n❌ Error al crear usuario:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

