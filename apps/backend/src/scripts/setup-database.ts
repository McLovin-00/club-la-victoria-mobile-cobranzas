import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const backendDir = path.resolve(__dirname, '../../');

/**
 * Ejecuta un comando del sistema de forma segura.
 * NOSONAR: Los comandos son hardcodeados (npx prisma) y no provienen de input del usuario.
 * Esta función solo se usa internamente para setup de BD en desarrollo.
 */
const runCommand = (command: string) => {
  try {
    // NOSONAR: command-injection safe - commands are hardcoded, not from user input
    execSync(command, { stdio: 'inherit', cwd: backendDir });
  } catch (_error) {
    console.error(`Error ejecutando el comando: ${command}`);
    process.exit(1);
  }
};

export const main = async () => {
  console.log('--- Iniciando configuración de la base de datos ---');

  // 1. Sincronizar esquema con la base de datos
  console.log('Paso 1: Sincronizando esquema de Prisma con la base de datos...');
  runCommand('npx dotenv-cli -e ../../.env -- npx prisma db push --schema=./prisma/schema.prisma');

  // 2. Verificar si es necesario poblar la base de datos
  console.log('Paso 2: Verificando si la base de datos necesita ser poblada...');
  const prisma = new PrismaClient();
  try {
    const seedCompany = await prisma.empresa.findFirst({
      where: { nombre: 'Empresa de Prueba' },
    });

    if (!seedCompany) {
      console.log('La empresa de seed no existe. Ejecutando el script de seed...');
      runCommand('npx dotenv-cli -e ../../.env -- npx prisma db seed --schema=./prisma/schema.prisma');
      console.log('¡Script de seed completado exitosamente!');
    } else {
      console.log('La base de datos ya contiene los datos de seed. No se requiere seeding.');
    }
  } catch (_error) {
    console.error('Error al verificar la empresa de seed:', _error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('--- Configuración de la base de datos completada exitosamente ---');
};

if (require.main === module) {
  main().catch((_error) => {
    console.error('Error inesperado durante la configuración de la base de datos:', _error);
    process.exit(1);
  });
}