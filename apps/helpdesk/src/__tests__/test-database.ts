/**
 * Test Database Utilities
 * Provides isolated test database connection and cleanup for integration tests
 */

import { PrismaClient } from '@helpdesk/prisma-client';

let prisma: PrismaClient | null = null;

/**
 * Get or create the test database connection
 * Uses singleton pattern to reuse connection across tests
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

/**
 * Clear all tables in the test database
 * Uses TRUNCATE with RESTART IDENTITY for clean state
 */
export async function clearTestDatabase(): Promise<void> {
  const db = getTestDatabase();
  
  await db.$executeRaw`
    TRUNCATE TABLE 
      "ticket_read_states",
      "message_attachments",
      "ticket_messages",
      "tickets",
      "resolver_configs",
      "helpdesk_configs"
    RESTART IDENTITY CASCADE;
  `;
}

/**
 * Seed the test database with minimal required data
 * Returns seeded entities for use in tests
 */
export async function seedTestDatabase(): Promise<{
  prisma: PrismaClient;
  configs: {
    technicalResolver: ResolverConfigData;
    operationalResolver: ResolverConfigData;
  };
}> {
  const db = getTestDatabase();

  // Create resolver configs for each category
  const technicalResolver = await db.resolverConfig.upsert({
    where: { category: 'TECHNICAL' },
    update: {},
    create: {
      category: 'TECHNICAL',
      telegramGroupId: '-1001111111111',
      telegramGroupName: 'Soporte Tecnico Test',
      resolverNames: ['Tech Resolver 1', 'Tech Resolver 2'],
      isActive: true,
    },
  });

  const operationalResolver = await db.resolverConfig.upsert({
    where: { category: 'OPERATIONAL' },
    update: {},
    create: {
      category: 'OPERATIONAL',
      telegramGroupId: '-1002222222222',
      telegramGroupName: 'Soporte Operativo Test',
      resolverNames: ['Ops Resolver 1'],
      isActive: true,
    },
  });

  return {
    prisma: db,
    configs: {
      technicalResolver,
      operationalResolver,
    },
  };
}

/**
 * Disconnect the test database connection
 * Call this in afterAll() for cleanup
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Type for resolver config data
interface ResolverConfigData {
  id: number;
  category: string;
  telegramGroupId: string;
  telegramGroupName: string | null;
  resolverNames: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
