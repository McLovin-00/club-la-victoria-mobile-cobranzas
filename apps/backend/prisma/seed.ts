import { PrismaClient, ServiceEstado, InstanceEstado, UserRole } from '@prisma/client';
import { hashSync } from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

// Configuración de tenants
const TENANTS = [
  { nombre: 'Grupo BCA', descripcion: 'Tenant principal - Grupo BCA' },
  { nombre: 'Transportes del Sur', descripcion: 'Empresa de transportes del sur' },
  { nombre: 'Logistica Norte', descripcion: 'Empresa de logistica del norte' },
];

// Password estandar para todos los usuarios de dev
const DEV_PASSWORD = 'Test123!';

// Helper para crear usuario si no existe
async function createUserIfNotExists(
  email: string,
  password: string,
  nombre: string,
  apellido: string,
  role: UserRole,
  empresaId: number
) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Usuario ya existe: ${email}`);
    return existing;
  }
  const user = await prisma.user.create({
    data: {
      email,
      password: hashSync(password, 12),
      nombre,
      apellido,
      role,
      empresaId,
    },
  });
  console.log(`✅ Usuario creado: ${email} (${role})`);
  return user;
}

async function main() {
  console.log('--- Start seeding ---');

  // 1. Crear/asegurar tenants
  const empresas: { id: number; nombre: string }[] = [];
  for (const tenant of TENANTS) {
    let empresa = await prisma.empresa.findFirst({ where: { nombre: tenant.nombre } });
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: { nombre: tenant.nombre, descripcion: tenant.descripcion },
      });
      console.log(`✅ Empresa creada: ${empresa.nombre}`);
    } else {
      console.log(`ℹ️  Empresa existente: ${empresa.nombre}`);
    }
    empresas.push(empresa);
  }

  const [empresaBCA, empresaSur, empresaNorte] = empresas;

  // 2. Asegurar que existe el servicio "Gateway"
  let gatewayService = await prisma.service.findUnique({
    where: { nombre: 'Gateway Service' },
  });
  if (!gatewayService) {
    gatewayService = await prisma.service.create({
      data: {
        nombre: 'Gateway Service',
        descripcion: 'Servicio de Proxy y Autorizacion',
        version: '1.0.0',
        estado: ServiceEstado.activo,
      },
    });
    console.log(`✅ Servicio creado: ${gatewayService.nombre}`);
  } else {
    console.log(`ℹ️  Servicio existente: ${gatewayService.nombre}`);
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
    console.log(`✅ Servicio creado: ${chatProcessorService.nombre}`);
  } else {
    console.log(`ℹ️  Servicio existente: ${chatProcessorService.nombre}`);
  }

  // 4. Crear instancias de Chat Processor para cada empresa
  for (const empresa of empresas) {
    const existingInstance = await prisma.instance.findFirst({
      where: { serviceId: chatProcessorService.id, empresaId: empresa.id },
    });
    if (!existingInstance) {
      await prisma.instance.create({
        data: {
          nombre: `Chat Processor - ${empresa.nombre}`,
          serviceId: chatProcessorService.id,
          empresaId: empresa.id,
          estado: InstanceEstado.activa,
          requierePermisos: true,
        },
      });
      console.log(`✅ Instancia creada para: ${empresa.nombre}`);
    }
  }

  // 5. Crear usuarios por rol para cada tenant
  console.log('\n--- Creando usuarios por rol ---');

  // ==========================================
  // TENANT: GRUPO BCA
  // ==========================================
  await createUserIfNotExists('superadmin@bca.com', DEV_PASSWORD, 'Super', 'Admin', UserRole.SUPERADMIN, empresaBCA.id);
  await createUserIfNotExists('admin@bca.com', DEV_PASSWORD, 'Admin', 'BCA', UserRole.ADMIN, empresaBCA.id);
  await createUserIfNotExists('operador@bca.com', DEV_PASSWORD, 'Operador', 'BCA', UserRole.OPERATOR, empresaBCA.id);
  await createUserIfNotExists('opinterno@bca.com', DEV_PASSWORD, 'Op', 'Interno BCA', UserRole.OPERADOR_INTERNO, empresaBCA.id);
  await createUserIfNotExists('admininterno@bca.com', DEV_PASSWORD, 'Admin', 'Interno BCA', UserRole.ADMIN_INTERNO, empresaBCA.id);
  await createUserIfNotExists('dador@bca.com', DEV_PASSWORD, 'Dador', 'Carga BCA', UserRole.DADOR_DE_CARGA, empresaBCA.id);
  await createUserIfNotExists('transportista@bca.com', DEV_PASSWORD, 'Transportista', 'BCA', UserRole.TRANSPORTISTA, empresaBCA.id);
  await createUserIfNotExists('chofer@bca.com', DEV_PASSWORD, 'Chofer', 'BCA', UserRole.CHOFER, empresaBCA.id);
  await createUserIfNotExists('cliente@bca.com', DEV_PASSWORD, 'Cliente', 'BCA', UserRole.CLIENTE, empresaBCA.id);
  await createUserIfNotExists('resolver@bca.com', DEV_PASSWORD, 'Resolver', 'BCA', UserRole.RESOLVER, empresaBCA.id);

  // ==========================================
  // TENANT: TRANSPORTES DEL SUR
  // ==========================================
  await createUserIfNotExists('superadmin@sur.com', DEV_PASSWORD, 'Super', 'Admin', UserRole.SUPERADMIN, empresaSur.id);
  await createUserIfNotExists('admin@sur.com', DEV_PASSWORD, 'Admin', 'Sur', UserRole.ADMIN, empresaSur.id);
  await createUserIfNotExists('operador@sur.com', DEV_PASSWORD, 'Operador', 'Sur', UserRole.OPERATOR, empresaSur.id);
  await createUserIfNotExists('opinterno@sur.com', DEV_PASSWORD, 'Op', 'Interno Sur', UserRole.OPERADOR_INTERNO, empresaSur.id);
  await createUserIfNotExists('admininterno@sur.com', DEV_PASSWORD, 'Admin', 'Interno Sur', UserRole.ADMIN_INTERNO, empresaSur.id);
  await createUserIfNotExists('dador@sur.com', DEV_PASSWORD, 'Dador', 'Carga Sur', UserRole.DADOR_DE_CARGA, empresaSur.id);
  await createUserIfNotExists('transportista@sur.com', DEV_PASSWORD, 'Transportista', 'Sur', UserRole.TRANSPORTISTA, empresaSur.id);
  await createUserIfNotExists('chofer@sur.com', DEV_PASSWORD, 'Chofer', 'Sur', UserRole.CHOFER, empresaSur.id);
  await createUserIfNotExists('cliente@sur.com', DEV_PASSWORD, 'Cliente', 'Sur', UserRole.CLIENTE, empresaSur.id);
  await createUserIfNotExists('resolver@sur.com', DEV_PASSWORD, 'Resolver', 'Sur', UserRole.RESOLVER, empresaSur.id);

  // ==========================================
  // TENANT: LOGISTICA NORTE
  // ==========================================
  await createUserIfNotExists('superadmin@norte.com', DEV_PASSWORD, 'Super', 'Admin', UserRole.SUPERADMIN, empresaNorte.id);
  await createUserIfNotExists('admin@norte.com', DEV_PASSWORD, 'Admin', 'Norte', UserRole.ADMIN, empresaNorte.id);
  await createUserIfNotExists('operador@norte.com', DEV_PASSWORD, 'Operador', 'Norte', UserRole.OPERATOR, empresaNorte.id);
  await createUserIfNotExists('opinterno@norte.com', DEV_PASSWORD, 'Op', 'Interno Norte', UserRole.OPERADOR_INTERNO, empresaNorte.id);
  await createUserIfNotExists('admininterno@norte.com', DEV_PASSWORD, 'Admin', 'Interno Norte', UserRole.ADMIN_INTERNO, empresaNorte.id);
  await createUserIfNotExists('dador@norte.com', DEV_PASSWORD, 'Dador', 'Carga Norte', UserRole.DADOR_DE_CARGA, empresaNorte.id);
  await createUserIfNotExists('transportista@norte.com', DEV_PASSWORD, 'Transportista', 'Norte', UserRole.TRANSPORTISTA, empresaNorte.id);
  await createUserIfNotExists('chofer@norte.com', DEV_PASSWORD, 'Chofer', 'Norte', UserRole.CHOFER, empresaNorte.id);
  await createUserIfNotExists('cliente@norte.com', DEV_PASSWORD, 'Cliente', 'Norte', UserRole.CLIENTE, empresaNorte.id);
  await createUserIfNotExists('resolver@norte.com', DEV_PASSWORD, 'Resolver', 'Norte', UserRole.RESOLVER, empresaNorte.id);

  // Usuario extra para pruebas
  await createUserIfNotExists('cliente-test@grupobca.com', DEV_PASSWORD, 'Cliente', 'Test', UserRole.CLIENTE, empresaBCA.id);

  console.log('\n--- Seeding finished ---');
  console.log(`
================================================================================
CREDENCIALES DE DESARROLLO (password: ${DEV_PASSWORD})
================================================================================

GRUPO BCA:
  superadmin@bca.com | admin@bca.com | operador@bca.com | opinterno@bca.com
  admininterno@bca.com | dador@bca.com | transportista@bca.com | chofer@bca.com
  cliente@bca.com | resolver@bca.com | cliente-test@grupobca.com

TRANSPORTES DEL SUR:
  superadmin@sur.com | admin@sur.com | operador@sur.com | opinterno@sur.com
  admininterno@sur.com | dador@sur.com | transportista@sur.com | chofer@sur.com
  cliente@sur.com | resolver@sur.com

LOGISTICA NORTE:
  superadmin@norte.com | admin@norte.com | operador@norte.com | opinterno@norte.com
  admininterno@norte.com | dador@norte.com | transportista@norte.com | chofer@norte.com
  cliente@norte.com | resolver@norte.com
================================================================================
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
