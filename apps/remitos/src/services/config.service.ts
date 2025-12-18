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

const DEFAULT_PROMPT = `Eres un experto en lectura de remitos de transporte de áridos y materiales de construcción en Argentina.

Analiza la imagen del remito y extrae TODOS los datos visibles en formato JSON estricto.

FORMATO DE RESPUESTA OBLIGATORIO:
\`\`\`json
{
  "numeroRemito": "0012-00026443",
  "fechaOperacion": "17/05/2025",
  "emisor": {
    "nombre": "RAIMUNDO DARIO",
    "detalle": "Cantera La Chola II"
  },
  "cliente": "PROSIL",
  "producto": "TN. ARENA LAVADA CLASIFICADA #100 ER",
  "transportista": "QUEBRACHO BLANCO",
  "chofer": {
    "nombre": "RODRIGUEZ, RAIMUNDO DARIO",
    "dni": "12345678"
  },
  "patentes": {
    "chasis": "AG-492-LP",
    "acoplado": "AG-413-RI"
  },
  "pesosOrigen": {
    "bruto": 52300,
    "tara": 16360,
    "neto": 35940
  },
  "pesosDestino": {
    "bruto": 51360,
    "tara": 16540,
    "neto": 34820
  },
  "confianza": 85,
  "camposDetectados": ["numeroRemito", "fechaOperacion", "emisor", "cliente", "producto", "transportista", "chofer", "patentes", "pesosOrigen", "pesosDestino"],
  "errores": []
}
\`\`\`

REGLAS IMPORTANTES:
1. Los PESOS son números en KILOGRAMOS sin puntos ni "kg" (52300, no "52.300 kg")
2. Las PATENTES en formato argentino (AA-123-BB o ABC123)
3. La FECHA en formato DD/MM/YYYY
4. Si no hay ticket de destino, pesosDestino = null
5. Si no puedes leer un campo, ponlo como null
6. La confianza (0-100) refleja qué tan seguro estás de la extracción
7. Lista en "errores" los campos ilegibles o problemas encontrados
8. Lista en "camposDetectados" solo los campos que pudiste leer correctamente

DEVUELVE SOLO EL JSON, sin explicaciones adicionales.`;

export class ConfigService {
  
  static async getFlowiseConfig(): Promise<FlowiseConfig> {
    try {
      const configs = await db.getClient().remitoSystemConfig.findMany({
        where: { key: { startsWith: FLOWISE_PREFIX } },
      });
      
      const map = new Map<string, string>();
      configs.forEach(c => map.set(c.key.replace(FLOWISE_PREFIX, ''), c.value));
      
      // Usar variables de entorno como fallback si la DB no tiene valores
      const envEnabled = process.env.FLOWISE_ENABLED === 'true';
      const envBaseUrl = process.env.FLOWISE_BASE_URL || '';
      const envApiKey = process.env.FLOWISE_API_KEY || '';
      const envFlowId = process.env.FLOWISE_FLOW_ID || '';
      const envTimeout = parseInt(process.env.FLOWISE_TIMEOUT || '60000', 10);
      
      return {
        enabled: map.has('enabled') ? map.get('enabled') === 'true' : envEnabled,
        baseUrl: map.get('baseUrl') || envBaseUrl,
        apiKey: map.get('apiKey') || envApiKey,
        flowId: map.get('flowId') || envFlowId,
        timeout: map.has('timeout') ? parseInt(map.get('timeout')!, 10) : envTimeout,
        systemPrompt: map.get('systemPrompt') || DEFAULT_PROMPT,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo config Flowise:', error);
      // Fallback completo a variables de entorno
      return {
        enabled: process.env.FLOWISE_ENABLED === 'true',
        baseUrl: process.env.FLOWISE_BASE_URL || '',
        apiKey: process.env.FLOWISE_API_KEY || '',
        flowId: process.env.FLOWISE_FLOW_ID || '',
        timeout: parseInt(process.env.FLOWISE_TIMEOUT || '60000', 10),
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
      // Usar variables de entorno como valores iniciales si están disponibles
      const envEnabled = process.env.FLOWISE_ENABLED === 'true' ? 'true' : 'false';
      const envBaseUrl = process.env.FLOWISE_BASE_URL || '';
      const envApiKey = process.env.FLOWISE_API_KEY || '';
      const envFlowId = process.env.FLOWISE_FLOW_ID || '';
      const envTimeout = process.env.FLOWISE_TIMEOUT || '60000';
      
      await db.getClient().remitoSystemConfig.createMany({
        data: [
          { key: `${FLOWISE_PREFIX}enabled`, value: envEnabled },
          { key: `${FLOWISE_PREFIX}baseUrl`, value: envBaseUrl },
          { key: `${FLOWISE_PREFIX}apiKey`, value: envApiKey },
          { key: `${FLOWISE_PREFIX}flowId`, value: envFlowId },
          { key: `${FLOWISE_PREFIX}timeout`, value: envTimeout },
          { key: `${FLOWISE_PREFIX}systemPrompt`, value: DEFAULT_PROMPT },
        ],
        skipDuplicates: true,
      });
      AppLogger.info('📝 Configuraciones Flowise inicializadas desde variables de entorno');
    }
  }
}

