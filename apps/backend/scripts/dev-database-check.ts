#!/usr/bin/env ts-node

// Configurar dotenv para cargar variables desde el .env centralizado
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables desde el .env del root del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { AppLogger } from '../src/config/logger';
import { DatabaseInitializationService } from '../src/services/database-initialization.service';

async function checkDatabaseForDevelopment() {
  AppLogger.info('🔍 Verificando estado de la base de datos para desarrollo...');
  
  const dbService = new DatabaseInitializationService();
  
  try {
    // Verificar e inicializar base de datos completa
    const result = await dbService.initializeDatabase();
    
    if (result.success) {
      AppLogger.info('✅ Base de datos lista para desarrollo');
      process.exit(0);
    } else {
      AppLogger.error('❌ Error configurando base de datos para desarrollo');
      process.exit(1);
    }
  } catch (error) {
    AppLogger.error('❌ Error crítico en verificación de base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar verificación
checkDatabaseForDevelopment(); 