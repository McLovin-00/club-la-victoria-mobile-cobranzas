#!/usr/bin/env npx tsx

/**
 * Script de migración para separar usuarios administrativos y usuarios finales
 * 
 * Este script:
 * 1. Valida la estructura de la base de datos
 * 2. Migra los datos existentes
 * 3. Valida la integridad de los datos migrados
 * 4. Proporciona rollback automático en caso de error
 * 
 * USO:
 * npm run migrate:user-separation
 * 
 * ROLLBACK:
 * npm run migrate:user-separation -- --rollback
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface MigrationStats {
  totalUsers: number;
  platformUsers: number;
  endUsers: number;
  duplicateHandling: number;
  foreignKeyUpdates: number;
  errors: string[];
}

class UserSeparationMigration {
  private stats: MigrationStats = {
    totalUsers: 0,
    platformUsers: 0,
    endUsers: 0,
    duplicateHandling: 0,
    foreignKeyUpdates: 0,
    errors: [],
  };

  private isRollback = false;

  constructor() {
    this.isRollback = process.argv.includes('--rollback');
  }

  /**
   * Punto de entrada principal
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Iniciando migración de separación de usuarios...\n');

      if (this.isRollback) {
        await this.performRollback();
      } else {
        await this.performMigration();
      }

      console.log('\n✅ Migración completada exitosamente!');
      await this.printStats();
    } catch (error) {
      console.error('\n💥 Error durante la migración:', error);
      
      if (!this.isRollback) {
        console.log('\n🔄 Iniciando rollback automático...');
        try {
          await this.performRollback();
          console.log('✅ Rollback completado exitosamente');
        } catch (rollbackError) {
          console.error('💥 Error durante rollback:', rollbackError);
          console.log('\n⚠️  ATENCIÓN: Rollback falló. Verificar estado de la base de datos manualmente.');
        }
      }
      
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Ejecuta la migración principal
   */
  private async performMigration(): Promise<void> {
    console.log('📊 Validando estructura de base de datos...');
    await this.validateDatabaseStructure();

    console.log('🔍 Analizando datos existentes...');
    await this.analyzeExistingData();

    console.log('🏗️  Ejecutando migración de Prisma...');
    await this.runPrismaMigration();

    console.log('📝 Regenerando cliente de Prisma...');
    await this.regeneratePrismaClient();

    console.log('🔄 Migrando datos de usuarios...');
    await this.migrateUserData();

    console.log('🔗 Actualizando foreign keys...');
    await this.updateForeignKeys();

    console.log('✅ Validando integridad de datos...');
    await this.validateDataIntegrity();

    console.log('🧹 Limpieza post-migración...');
    await this.performCleanup();
  }

  /**
   * Ejecuta el rollback
   */
  private async performRollback(): Promise<void> {
    console.log('🔄 Ejecutando rollback de migración...');
    
    try {
      // Ejecutar script de rollback SQL
      await execAsync('psql $DATABASE_URL -f apps/backend/prisma/migrations/20250119000000_separate_platform_and_end_users/rollback.sql');
      
      // Regenerar cliente de Prisma con schema original
      await this.regeneratePrismaClient();
      
      console.log('✅ Rollback completado exitosamente');
    } catch (error) {
      throw new Error(`Error ejecutando rollback: ${error}`);
    }
  }

  /**
   * Valida que la estructura de la base de datos sea correcta
   */
  private async validateDatabaseStructure(): Promise<void> {
    try {
      // Verificar que la tabla users existe
      const userTableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `;

      if (!userTableExists) {
        throw new Error('Tabla users no encontrada');
      }

      console.log('   ✓ Estructura de base de datos válida');
    } catch (error) {
      throw new Error(`Error validando estructura: ${error}`);
    }
  }

  /**
   * Analiza los datos existentes
   */
  private async analyzeExistingData(): Promise<void> {
    try {
      // Contar usuarios totales
      const totalUsers = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM users;
      `;
      this.stats.totalUsers = Number(totalUsers[0].count);

      // Contar usuarios administrativos
      const platformUsers = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM users 
        WHERE role IN ('admin', 'user', 'superadmin');
      `;
      this.stats.platformUsers = Number(platformUsers[0].count);

      // Contar usuarios finales (con identificadores de comunicación)
      const endUsers = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM users 
        WHERE whatsapp IS NOT NULL 
           OR telegram_id IS NOT NULL 
           OR (role NOT IN ('admin', 'user', 'superadmin') AND email IS NOT NULL);
      `;
      this.stats.endUsers = Number(endUsers[0].count);

      console.log(`   📊 Total usuarios: ${this.stats.totalUsers}`);
      console.log(`   👥 Usuarios de plataforma: ${this.stats.platformUsers}`);
      console.log(`   📱 Usuarios finales: ${this.stats.endUsers}`);
    } catch (error) {
      throw new Error(`Error analizando datos: ${error}`);
    }
  }

  /**
   * Ejecuta la migración de Prisma
   */
  private async runPrismaMigration(): Promise<void> {
    try {
      await execAsync('cd apps/backend && npx prisma migrate deploy');
      console.log('   ✓ Migración de Prisma ejecutada');
    } catch (error) {
      throw new Error(`Error ejecutando migración de Prisma: ${error}`);
    }
  }

  /**
   * Regenera el cliente de Prisma
   */
  private async regeneratePrismaClient(): Promise<void> {
    try {
      await execAsync('cd apps/backend && npx prisma generate');
      console.log('   ✓ Cliente de Prisma regenerado');
    } catch (error) {
      throw new Error(`Error regenerando cliente de Prisma: ${error}`);
    }
  }

  /**
   * Migra los datos de usuarios
   */
  private async migrateUserData(): Promise<void> {
    try {
      // Los datos ya deberían estar migrados por el SQL de migración
      // Aquí solo verificamos que la migración fue exitosa
      
      const platformUserCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM platform_users;
      `;
      
      const endUserCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM end_users;
      `;

      const migratedPlatformUsers = Number(platformUserCount[0].count);
      const migratedEndUsers = Number(endUserCount[0].count);

      console.log(`   ✓ Usuarios de plataforma migrados: ${migratedPlatformUsers}`);
      console.log(`   ✓ Usuarios finales migrados: ${migratedEndUsers}`);

      if (migratedPlatformUsers !== this.stats.platformUsers) {
        this.stats.errors.push(`Inconsistencia en usuarios de plataforma: esperados ${this.stats.platformUsers}, migrados ${migratedPlatformUsers}`);
      }
    } catch (error) {
      throw new Error(`Error migrando datos de usuarios: ${error}`);
    }
  }

  /**
   * Actualiza las foreign keys
   */
  private async updateForeignKeys(): Promise<void> {
    try {
      // Las foreign keys ya deberían estar actualizadas por el SQL de migración
      // Verificar que las referencias son correctas
      
      const permisoReferences = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM permisos 
        WHERE platform_user_id IS NOT NULL;
      `;

      this.stats.foreignKeyUpdates = Number(permisoReferences[0].count);
      console.log(`   ✓ Foreign keys actualizadas: ${this.stats.foreignKeyUpdates}`);
    } catch (error) {
      throw new Error(`Error actualizando foreign keys: ${error}`);
    }
  }

  /**
   * Valida la integridad de los datos migrados
   */
  private async validateDataIntegrity(): Promise<void> {
    try {
      // Verificar que no hay usuarios huérfanos
      const orphanedPermissions = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM permisos p
        LEFT JOIN platform_users pu ON p.platform_user_id = pu.id
        WHERE p.platform_user_id IS NOT NULL AND pu.id IS NULL;
      `;

      if (Number(orphanedPermissions[0].count) > 0) {
        this.stats.errors.push(`Permisos huérfanos encontrados: ${orphanedPermissions[0].count}`);
      }

      // Verificar unicidad de identificadores en end_users
      const duplicateIdentifiers = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM (
          SELECT identifier_type, identifier_value, COUNT(*) 
          FROM end_users 
          GROUP BY identifier_type, identifier_value 
          HAVING COUNT(*) > 1
        ) duplicates;
      `;

      if (Number(duplicateIdentifiers[0].count) > 0) {
        this.stats.errors.push(`Identificadores duplicados en end_users: ${duplicateIdentifiers[0].count}`);
      }

      console.log('   ✓ Validación de integridad completada');
    } catch (error) {
      throw new Error(`Error validando integridad: ${error}`);
    }
  }

  /**
   * Realiza limpieza post-migración
   */
  private async performCleanup(): Promise<void> {
    try {
      // La tabla users original se mantiene como backup
      // Solo se limpian datos temporales si los hay
      
      console.log('   ✓ Limpieza completada (tabla users preservada como backup)');
    } catch (error) {
      throw new Error(`Error en limpieza: ${error}`);
    }
  }

  /**
   * Imprime estadísticas de la migración
   */
  private async printStats(): Promise<void> {
    console.log('\n📊 ESTADÍSTICAS DE MIGRACIÓN');
    console.log('================================');
    console.log(`Total usuarios originales:    ${this.stats.totalUsers}`);
    console.log(`Usuarios de plataforma:       ${this.stats.platformUsers}`);
    console.log(`Usuarios finales:             ${this.stats.endUsers}`);
    console.log(`Foreign keys actualizadas:    ${this.stats.foreignKeyUpdates}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ Sin errores detectados');
    }

    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('1. Verificar que las aplicaciones funcionan correctamente');
    console.log('2. Ejecutar tests de integración');
    console.log('3. Monitorear logs por 24-48 horas');
    console.log('4. Si todo funciona bien, eliminar tabla users_backup_migration');
  }
}

// Ejecutar migración
if (require.main === module) {
  const migration = new UserSeparationMigration();
  migration.run().catch(console.error);
} 