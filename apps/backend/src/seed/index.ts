import { AppLogger } from '../config/logger';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const runSeeds = async () => {
  try {
    AppLogger.info('🌱 Iniciando ejecución de seeds...');

    // Crear usuario superadministrador por defecto
    await createSuperAdmin();

    // Crear empresas de ejemplo
    await createExampleCompanies();

    // Crear usuarios de ejemplo
    await createExampleUsers();

    // Crear servicios del sistema
    await createSystemServices();

    // Crear instancias de Chat Processor
    await createChatProcessorInstances();

    AppLogger.info('✅ Todos los seeds han sido ejecutados exitosamente');
  } catch (error) {
    AppLogger.error('❌ Error al ejecutar seeds:', error);
    throw error;
  }
};

const createSuperAdmin = async () => {
  try {
    // Verificar si ya existe un superadmin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPERADMIN }
    });

    if (existingSuperAdmin) {
      AppLogger.info('🔍 Superadministrador ya existe, saltando creación');
      return;
    }

    // Crear superadministrador
    const hashedPassword = await bcrypt.hash('Mfh@#2024A', 12);

    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@mfh.com.ar',
        password: hashedPassword,
        role: UserRole.SUPERADMIN,
        nombre: 'Administrador',
        apellido: 'Sistema'
      }
    });

    AppLogger.info('✅ Superadministrador creado exitosamente', {
      id: superAdmin.id,
      email: superAdmin.email,
    });
  } catch (error) {
    AppLogger.error('❌ Error al crear superadministrador:', error);
    throw error;
  }
};

const createExampleCompanies = async () => {
  try {
    const exampleCompanies = [
      {
        nombre: 'Empresa Demo',
        descripcion: 'Empresa de demostración para usuarios de ejemplo',
      },
      {
        nombre: 'Empresa Ejemplo',
        descripcion: 'Segunda empresa de ejemplo',
      },
    ];

    for (const companyData of exampleCompanies) {
      // Verificar si la empresa ya existe
      const existingCompany = await prisma.empresa.findUnique({
        where: { nombre: companyData.nombre },
      });

      if (existingCompany) {
        AppLogger.info(`🔍 Empresa ${companyData.nombre} ya existe, saltando creación`);
        continue;
      }

      // Crear empresa
      const company = await prisma.empresa.create({
        data: companyData,
      });

      AppLogger.info(`✅ Empresa creada exitosamente`, {
        id: company.id,
        nombre: company.nombre,
      });
    }
  } catch (error) {
    AppLogger.error('❌ Error al crear empresas de ejemplo:', error);
    throw error;
  }
};

const createExampleUsers = async () => {
  try {
    // Obtener empresas para asignar a usuarios
    const empresas = await prisma.empresa.findMany();

    if (empresas.length === 0) {
      AppLogger.warn('⚠️ No hay empresas disponibles para asignar a usuarios');
      return;
    }

    // NOSONAR: Demo credentials - ONLY for development/testing seed data.
    // These accounts are created only in dev environments and should be
    // disabled or removed in production. See MANUAL_OPERATIVO.md for security guidelines.
    const exampleUsers = [
      {
        email: 'admin@demo.com',
        password: 'admin123', // NOSONAR: Intentional demo credential for development
        role: 'ADMIN' as const,
        empresa_id: empresas[0].id,
      },
      {
        email: 'operator1@demo.com',
        password: 'operator123', // NOSONAR: Intentional demo credential for development
        role: 'OPERATOR' as const,
        empresa_id: empresas[0].id,
      },
      {
        email: 'operator2@demo.com',
        password: 'operator123', // NOSONAR: Intentional demo credential for development
        role: 'OPERATOR' as const,
        empresa_id: empresas.length > 1 ? empresas[1].id : empresas[0].id,
      },
    ];

    for (const userData of exampleUsers) {
      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        AppLogger.info(`🔍 Usuario ${userData.email} ya existe, saltando creación`);
        continue;
      }

      // Crear usuario
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          role: userData.role as UserRole,
          empresaId: userData.empresa_id,
          nombre: (userData as any).nombre || null,
          apellido: (userData as any).apellido || null
        }
      });

      AppLogger.info(`✅ Usuario ${userData.role} creado exitosamente`, {
        id: user.id,
        email: user.email,
        role: user.role,
        empresa_id: user.empresaId,
      });
    }
  } catch (error) {
    AppLogger.error('❌ Error al crear usuarios de ejemplo:', error);
    throw error;
  }
};

const createSystemServices = async () => {
  try {
    const systemServices = [
      {
        nombre: 'Gateway Service',
        descripcion: 'Servicio de Proxy y Autorización',
        version: '1.0.0',
        estado: 'activo' as const,
      },
      {
        nombre: 'Chat Processor',
        descripcion: 'Servicio para procesar chats de Flowise',
        version: '1.0.0',
        estado: 'activo' as const,
      },

    ];

    for (const serviceData of systemServices) {
      // Verificar si el servicio ya existe
      const existingService = await prisma.service.findUnique({
        where: { nombre: serviceData.nombre },
      });

      if (existingService) {
        AppLogger.info(`🔍 Servicio ${serviceData.nombre} ya existe, saltando creación`);
        continue;
      }

      // Crear servicio
      const service = await prisma.service.create({
        data: serviceData,
      });

      AppLogger.info(`✅ Servicio creado exitosamente`, {
        id: service.id,
        nombre: service.nombre,
        version: service.version,
      });
    }
  } catch (error) {
    AppLogger.error('❌ Error al crear servicios del sistema:', error);
    throw error;
  }
};

const createChatProcessorInstances = async () => {
  try {
    // Obtener servicio Chat Processor
    const chatProcessorService = await prisma.service.findUnique({
      where: { nombre: 'Chat Processor' },
    });

    if (!chatProcessorService) {
      AppLogger.warn('⚠️ Servicio Chat Processor no encontrado, saltando creación de instancias');
      return;
    }

    // Obtener empresas
    const empresas = await prisma.empresa.findMany();

    if (empresas.length === 0) {
      AppLogger.warn('⚠️ No hay empresas disponibles para crear instancias');
      return;
    }

    const chatProcessorInstances = [
      {
        nombre: 'Instancia de Chat Processor para Empresa Demo',
        serviceId: chatProcessorService.id,
        empresaId: empresas[0].id,
        estado: 'activa' as const,
        configuracion: {
          flowId: '0cbc1a3c-183d-44e4-b0b0-61da7be2667c',
          analysisFlowId: 'd6b06c31-573c-4161-80d6-58a4d32ae053',
        },
      },
    ];

    for (const instanceData of chatProcessorInstances) {
      // Verificar si la instancia ya existe
      const existingInstance = await prisma.instance.findFirst({
        where: {
          nombre: instanceData.nombre,
          empresaId: instanceData.empresaId,
        },
      });

      if (existingInstance) {
        AppLogger.info(`🔍 Instancia ${instanceData.nombre} ya existe, saltando creación`);
        continue;
      }

      // Crear instancia
      const instance = await prisma.instance.create({
        data: instanceData,
      });

      AppLogger.info(`✅ Instancia creada exitosamente`, {
        id: instance.id,
        nombre: instance.nombre,
        empresaId: instance.empresaId,
      });

      // Chat Processor configuration is now handled by the dedicated microservice
      AppLogger.info(`✅ Instance created for backend core, chat-processor config handled by microservice`, {
        instanceId: instance.id,
        empresaId: instance.empresaId,
      });
    }
  } catch (error) {
    AppLogger.error('❌ Error al crear instancias de backend:', error);
    throw error;
  }
};
