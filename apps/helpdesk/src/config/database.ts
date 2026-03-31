import { PrismaClient } from '@helpdesk/prisma-client';
import { AppLogger } from './logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

export const db = {
  connect: async (): Promise<void> => {
    try {
      await prisma.$connect();
      AppLogger.info('✅ Conectado a la base de datos (schema: helpdesk)');
    } catch (error) {
      AppLogger.error('❌ Error conectando a la base de datos:', error);
      throw error;
    }
  },

  disconnect: async (): Promise<void> => {
    try {
      await prisma.$disconnect();
      AppLogger.info('🔌 Desconectado de la base de datos');
    } catch (error) {
      AppLogger.error('❌ Error desconectando de la base de datos:', error);
      throw error;
    }
  },

  getClient: (): PrismaClient => {
    return prisma;
  }
};

export { prisma };
