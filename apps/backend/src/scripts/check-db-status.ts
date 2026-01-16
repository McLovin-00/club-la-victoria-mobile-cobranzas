import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export async function checkStatus() {
  const prisma = new PrismaClient();
  console.log('--- Verificando estado de la base de datos ---');
  try {
    // Verificar la dirección del servidor de la base de datos
    const serverAddressResult: { inet_server_addr: string }[] = await prisma.$queryRaw`SELECT inet_server_addr();`;
    const dbAddress = serverAddressResult[0].inet_server_addr;
    console.log(`- La aplicación se está conectando al servidor de base de datos en la IP: ${dbAddress}`);

    const empresaCount = await prisma.empresa.count();
    const userCount = await prisma.user.count();
    const serviceCount = await prisma.service.count();

    console.log(`- Empresas encontradas: ${empresaCount}`);
    console.log(`- Usuarios encontrados: ${userCount}`);
    console.log(`- Servicios encontrados: ${serviceCount}`);

    if (empresaCount > 0) {
      const empresas = await prisma.empresa.findMany();
      console.log('Empresas:', empresas.map(e => ({ id: e.id, nombre: e.nombre })));
    }

    if (userCount > 0) {
      const users = await prisma.user.findMany();
      console.log('Usuarios:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
    }

    if (serviceCount > 0) {
      const services = await prisma.service.findMany();
      console.log('Servicios:', services.map(s => ({ id: s.id, nombre: s.nombre, status: s.estado })));
    }

    if (empresaCount === 0 && userCount === 0 && serviceCount === 0) {
      console.log('\nResultado: La base de datos está VACÍA.');
    } else {
      console.log('\nResultado: La base de datos CONTIENE datos.');
    }

  } catch (error) {
    console.error('Error al verificar el estado de la base de datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkStatus();
}
