import { db } from '../config/database';
import { AppLogger } from '../config/logger';

export interface FlowiseConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  flowId: string;
  timeout: number;
  systemPrompt: string;
}

const FLOWISE_PREFIX = 'flowise.';

const DEFAULT_PROMPT = `Analiza la imagen del remito de transporte y extrae los siguientes campos en formato JSON:

{
  "numeroRemito": "string o null",
  "fechaOperacion": "DD/MM/YYYY o null",
  "emisor": { "nombre": "string", "detalle": "string o null" },
  "cliente": "string o null",
  "producto": "string o null",
  "transportista": "string o null",
  "chofer": { "nombre": "string", "dni": "string o null" },
  "patentes": { "chasis": "string o null", "acoplado": "string o null" },
  "pesosOrigen": { "bruto": number, "tara": number, "neto": number },
  "pesosDestino": { "bruto": number, "tara": number, "neto": number } | null,
  "confianza": 0-100,
  "camposDetectados": ["lista de campos detectados"],
  "errores": ["lista de problemas"]
}`;

export class ConfigService {
  
  static async getFlowiseConfig(): Promise<FlowiseConfig> {
    try {
      const configs = await db.getClient().remitoSystemConfig.findMany({
        where: { key: { startsWith: FLOWISE_PREFIX } },
      });
      
      const map = new Map<string, string>();
      configs.forEach(c => map.set(c.key.replace(FLOWISE_PREFIX, ''), c.value));
      
      return {
        enabled: map.get('enabled') === 'true',
        baseUrl: map.get('baseUrl') || '',
        apiKey: map.get('apiKey') || '',
        flowId: map.get('flowId') || '',
        timeout: parseInt(map.get('timeout') || '60000', 10),
        systemPrompt: map.get('systemPrompt') || DEFAULT_PROMPT,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo config Flowise:', error);
      return {
        enabled: false,
        baseUrl: '',
        apiKey: '',
        flowId: '',
        timeout: 60000,
        systemPrompt: DEFAULT_PROMPT,
      };
    }
  }
  
  static async updateFlowiseConfig(config: Partial<FlowiseConfig>, userId: number): Promise<void> {
    const updates: Array<{ key: string; value: string }> = [];
    
    if (config.enabled !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}enabled`, value: String(config.enabled) });
    }
    if (config.baseUrl !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}baseUrl`, value: config.baseUrl });
    }
    if (config.apiKey !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}apiKey`, value: config.apiKey });
    }
    if (config.flowId !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}flowId`, value: config.flowId });
    }
    if (config.timeout !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}timeout`, value: String(config.timeout) });
    }
    if (config.systemPrompt !== undefined) {
      updates.push({ key: `${FLOWISE_PREFIX}systemPrompt`, value: config.systemPrompt });
    }
    
    await db.getClient().$transaction(async (prisma) => {
      for (const { key, value } of updates) {
        await prisma.remitoSystemConfig.upsert({
          where: { key },
          update: { value, updatedBy: userId, updatedAt: new Date() },
          create: { key, value, updatedBy: userId },
        });
      }
    });
    
    AppLogger.info('✅ Configuración Flowise actualizada', { userId });
  }
  
  static async initializeDefaults(): Promise<void> {
    const existing = await db.getClient().remitoSystemConfig.findFirst({
      where: { key: `${FLOWISE_PREFIX}enabled` },
    });
    
    if (!existing) {
      await db.getClient().remitoSystemConfig.createMany({
        data: [
          { key: `${FLOWISE_PREFIX}enabled`, value: 'false' },
          { key: `${FLOWISE_PREFIX}baseUrl`, value: '' },
          { key: `${FLOWISE_PREFIX}apiKey`, value: '' },
          { key: `${FLOWISE_PREFIX}flowId`, value: '' },
          { key: `${FLOWISE_PREFIX}timeout`, value: '60000' },
          { key: `${FLOWISE_PREFIX}systemPrompt`, value: DEFAULT_PROMPT },
        ],
        skipDuplicates: true,
      });
      AppLogger.info('📝 Configuraciones por defecto inicializadas');
    }
  }
}

