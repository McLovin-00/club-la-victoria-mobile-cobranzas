import { PrismaClient } from '.prisma/remitos';
import { AppLogger } from './logger';

class Database {
  private client: PrismaClient | null = null;
  
  async connect(): Promise<void> {
    if (this.client) return;
    
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
    
    await this.client.$connect();
    AppLogger.info('🗄️ Conectado a PostgreSQL (schema: remitos)');
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      AppLogger.info('🔌 Desconectado de PostgreSQL');
    }
  }
  
  getClient(): PrismaClient {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client;
  }
}

export const db = new Database();

