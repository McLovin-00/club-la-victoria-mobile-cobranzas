import { PrismaClient } from '.prisma/documentos';
import { AppLogger } from './logger';

// Singleton pattern para PrismaClient - elegancia y eficiencia
class DatabaseService {
	private static instance: DatabaseService;
	private prisma: PrismaClient;

	private constructor() {
    this.prisma = new PrismaClient({
			log: [
				{ emit: 'event', level: 'query' },
				{ emit: 'event', level: 'error' },
				{ emit: 'event', level: 'info' },
				{ emit: 'event', level: 'warn' },
			],
			errorFormat: 'pretty',
		}) as PrismaClient;

		// Event listeners para logging elegante
		(this.prisma as any).$on('query', (e: any) => {
			if (process.env.ENABLE_QUERY_LOGGING === 'true') {
				AppLogger.debug(`🔍 Query: ${e.query}`);
				AppLogger.debug(`📊 Params: ${e.params}`);
				AppLogger.debug(`⏱️ Duration: ${e.duration}ms`);
			}
		});

		(this.prisma as any).$on('error', (e: any) => {
			AppLogger.error('💥 Database Error:', e);
		});

		(this.prisma as any).$on('info', (e: any) => {
			AppLogger.info(`ℹ️ Database Info: ${e.message}`);
		});

		(this.prisma as any).$on('warn', (e: any) => {
			AppLogger.warn(`⚠️ Database Warning: ${e.message}`);
		});
	}

	public static getInstance(): DatabaseService {
		if (!DatabaseService.instance) {
			DatabaseService.instance = new DatabaseService();
		}
		return DatabaseService.instance;
	}

	public getClient(): PrismaClient {
		return this.prisma;
	}

	public async connect(): Promise<void> {
		try {
			await (this.prisma as any).$connect();
			AppLogger.info('✅ Database connected successfully');
		} catch (error) {
			AppLogger.error('💥 Failed to connect to database:', error);
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		try {
			await (this.prisma as any).$disconnect();
			AppLogger.info('👋 Database disconnected successfully');
		} catch (error) {
			AppLogger.error('❌ Error disconnecting from database:', error);
			throw error;
		}
	}

	public async healthCheck(): Promise<boolean> {
		try {
			await (this.prisma as any).$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			AppLogger.error('💔 Database health check failed:', error);
			return false;
		}
	}

	// Método para refrescar vista materializada
	public async refreshMaterializedView(): Promise<void> {
		try {
			await (this.prisma as any).$executeRaw`
				REFRESH MATERIALIZED VIEW CONCURRENTLY document_status_summary;
			`;
			AppLogger.debug('🔄 Materialized view refreshed');
		} catch (error) {
			AppLogger.error('❌ Failed to refresh materialized view:', error);
			throw error;
		}
	}
}

// Exportar instancia singleton
export const db = DatabaseService.getInstance();
export const prisma: PrismaClient = db.getClient();