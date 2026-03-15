import { PrismaClient, ServiceEstado, InstanceEstado, UserRole } from '@prisma/client';
import { hashSync } from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('--- Start seeding ---');

  // 1. Asegurar que existe una empresa
  const empresaExistente = await prisma.empresa.findFirst({ where: { nombre: 'Empresa de Prueba' } });
  let empresa;
  if (!empresaExistente) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: 'Empresa de Prueba',
        descripcion: 'Creada automáticamente por el script de seed',
      },
    });
    console.log('✅ Empresa creada:', empresa);
  } else {
    empresa = empresaExistente;
    console.log(`ℹ️ Usando empresa existente: ${empresa.nombre}`);
  }

  // 2. Asegurar que existe el servicio "Gateway"
  let gatewayService = await prisma.service.findUnique({
    where: { nombre: 'Gateway Service' },
  });
  if (!gatewayService) {
    gatewayService = await prisma.service.create({
      data: {
        nombre: 'Gateway Service',
        descripcion: 'Servicio de Proxy y Autorización',
        version: '1.0.0',
        estado: ServiceEstado.activo,
      },
    });
    console.log(`Created service: ${gatewayService.nombre}`);
  } else {
    console.log(`Using existing service: ${gatewayService.nombre}`);
  }

  // 3. Asegurar que existe el servicio "Chat Processor"
  let chatProcessorService = await prisma.service.findUnique({
    where: { nombre: 'Chat Processor' },
  });
  if (!chatProcessorService) {
    chatProcessorService = await prisma.service.create({
      data: {
        nombre: 'Chat Processor',
        descripcion: 'Servicio para procesar chats de Flowise',
        version: '1.0.0',
        estado: ServiceEstado.activo,
      },
    });
    console.log(`Created service: ${chatProcessorService.nombre}`);
  } else {
    console.log(`Using existing service: ${chatProcessorService.nombre}`);
  }
  


  // 5. Crear una instancia de Chat Processor para la empresa
  let chatInstance = await prisma.instance.findFirst({
    where: {
      serviceId: chatProcessorService.id,
      empresaId: empresa.id,
    },
  });
  if (!chatInstance) {
    chatInstance = await prisma.instance.create({
      data: {
        nombre: 'Instancia de Chat Processor para Empresa de Prueba',
        serviceId: chatProcessorService.id,
        empresaId: empresa.id,
        estado: InstanceEstado.activa,
        requierePermisos: true,
      },
    });
    console.log(`Created instance: ${chatInstance.nombre} (ID: ${chatInstance.id})`);
  } else {
    console.log(`Using existing instance: ${chatInstance.nombre} (ID: ${chatInstance.id})`);
  }
  
  // 6. Crear un usuario admin si no existe
  const adminExistente = await prisma.user.findFirst({ where: { email: 'admin@empresa.com' } });
  if (!adminExistente) {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@empresa.com',
        password: hashSync('password123', 12),
        nombre: 'Admin User',
        role: UserRole.ADMIN,
        empresaId: empresa.id,
      },
    });
    console.log('✅ Usuario admin creado:', { id: adminUser.id, email: adminUser.email, role: adminUser.role });
  } else {
    console.log(`ℹ️ Usuario admin ya existe: ${adminExistente.email}`);
  }

  // 7. Crear un usuario superadmin si no existe
  const superAdminExistente = await prisma.user.findFirst({ where: { email: 'superadmin@empresa.com' } });
  if (!superAdminExistente) {
    const superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@empresa.com',
        password: hashSync('password123', 12),
        nombre: 'Super Admin User',
        role: 'SUPERADMIN',
        empresaId: empresa.id,
      },
    });
    console.log('✅ Usuario superadmin creado:', { id: superAdminUser.id, email: superAdminUser.email, role: superAdminUser.role });
  } else {
    console.log(`ℹ️ Usuario superadmin ya existe: ${superAdminExistente.email}`);
  }

  // 8. PlatformUser seeds (ya no es necesario, se inserta directamente en User)
  
  console.log('--- Seeding finished ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 