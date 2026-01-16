import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

export async function fixPassword() {
  const prisma = new PrismaClient();
  console.log('\n🔧 Actualizando contraseña del superadmin...');

  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const updated = await prisma.user.update({
      where: { email: 'superadmin@empresa.com' },
      data: { password: hashedPassword },
    });

    console.log(`✅ Contraseña actualizada para: ${updated.email}`);
    console.log('📝 Credenciales: superadmin@empresa.com / admin123');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixPassword().catch((error) => {
    console.error('❌ Error actualizando contraseña:', error);
    process.exit(1);
  });
}