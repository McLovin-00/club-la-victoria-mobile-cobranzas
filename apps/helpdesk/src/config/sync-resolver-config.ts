/**
 * Sincroniza resolver_configs desde variables de entorno al arranque.
 * Permite configurar los grupos de Telegram por env en producción sin tocar la base a mano.
 */

import { AppLogger } from './logger';
import { prisma } from './database';

export async function syncResolverConfigFromEnv(): Promise<void> {
  const technicalId = process.env.HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID?.trim();
  const operationalId = process.env.HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID?.trim();

  if (!technicalId && !operationalId) return;

  try {
    if (technicalId) {
      await prisma.resolverConfig.upsert({
        where: { category: 'TECHNICAL' },
        create: {
          category: 'TECHNICAL',
          telegramGroupId: technicalId,
          telegramGroupName: 'Grupo Técnica (env)',
          resolverNames: ['Resolver'],
          isActive: true,
          updatedAt: new Date(),
        },
        update: {
          telegramGroupId: technicalId,
          updatedAt: new Date(),
        },
      });
      AppLogger.info(`Resolver config TECHNICAL sincronizado desde env (groupId: ${technicalId})`);
    }
    if (operationalId) {
      await prisma.resolverConfig.upsert({
        where: { category: 'OPERATIONAL' },
        create: {
          category: 'OPERATIONAL',
          telegramGroupId: operationalId,
          telegramGroupName: 'Grupo Operativa (env)',
          resolverNames: ['Resolver'],
          isActive: true,
          updatedAt: new Date(),
        },
        update: {
          telegramGroupId: operationalId,
          updatedAt: new Date(),
        },
      });
      AppLogger.info(`Resolver config OPERATIONAL sincronizado desde env (groupId: ${operationalId})`);
    }
  } catch (error) {
    AppLogger.error('Error sincronizando resolver_configs desde env:', error);
    // No hacemos exit(1); el servicio puede arrancar y usar config ya existente en DB
  }
}
