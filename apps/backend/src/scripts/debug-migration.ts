import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function debugMigration() {
  console.log('🔍 Ejecutando debug de migración...');

  try {
    // Verificar usuarios de plataforma
    const platformUsers = await prisma.user.findMany();
    console.log(`📊 Usuarios de plataforma encontrados: ${platformUsers.length}`);
    platformUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // Verificar end_users
    const endUsers = await prisma.endUser.findMany();
    console.log(`📊 Usuarios en end_users: ${endUsers.length}`);

    // 4. Crear usuario de prueba si no existe
    const testUser = await prisma.user.findUnique({
      where: { email: 'superadmin@empresa.com' }
    });

    if (!testUser) {
      console.log('🆕 Creando usuario de prueba...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await prisma.user.create({
        data: {
          email: 'superadmin@empresa.com',
          password: hashedPassword,
          role: UserRole.SUPERADMIN,
          empresaId: 1
        }
      });
      
      console.log('✅ Usuario de prueba creado: superadmin@empresa.com / admin123');
    } else {
      console.log('✅ Usuario de prueba ya existe');
    }

    // 5. Verificar empresas
    const empresas = await prisma.empresa.findMany();
    console.log(`📊 Empresas disponibles: ${empresas.length}`);
    if (empresas.length === 0) {
      await prisma.empresa.create({
        data: {
          nombre: 'Empresa Demo',
          descripcion: 'Empresa de prueba'
        }
      });
      console.log('✅ Empresa demo creada');
    }
  } catch (error) {
    console.error('❌ Error en debug:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugMigration(); 