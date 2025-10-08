import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixPassword() {
  console.log('\n🔧 Actualizando contraseña del superadmin...');

  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const updated = await prisma.user.update({
    where: { email: 'superadmin@empresa.com' },
    data: { password: hashedPassword }
  });

  console.log(`✅ Contraseña actualizada para: ${updated.email}`);
  console.log('📝 Credenciales: superadmin@empresa.com / admin123');
}

fixPassword()
  .catch((error) => {
    console.error('❌ Error actualizando contraseña:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 