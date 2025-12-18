import { Request } from 'express';

export interface AuthUser {
  id: number;           // Mapeado desde userId del JWT
  userId?: number;      // Campo original del JWT
  email: string;
  role: string;
  empresaId?: number;
  dadorId?: number;
  dadorCargaId?: number;
  tenantId?: number;
  choferId?: number;
  empresaTransportistaId?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  tenantId?: number;
  dadorId?: number;
}

export interface FlowiseRemitoResponse {
  numeroRemito: string | null;
  fechaOperacion: string | null;
  emisor: {
    nombre: string | null;
    detalle: string | null;
  };
  cliente: string | null;
  producto: string | null;
  transportista: string | null;
  chofer: {
    nombre: string | null;
    dni: string | null;
  };
  patentes: {
    chasis: string | null;
    acoplado: string | null;
  };
  pesosOrigen: {
    bruto: number | null;
    tara: number | null;
    neto: number | null;
  };
  pesosDestino: {
    bruto: number | null;
    tara: number | null;
    neto: number | null;
  } | null;
  confianza: number;
  camposDetectados: string[];
  errores: string[];
}

export interface RemitoAnalysisJobData {
  remitoId: number;
  imagenId: number;
  tenantEmpresaId: number;
  bucketName: string;
  objectKey: string;
  originalInputsCount?: number;  // Cantidad de inputs originales
}

/**
 * Formato de respuesta esperado de Flowise para análisis de remitos
 * 
 * El prompt de Flowise debe instruir a la IA a devolver este JSON:
 */
export const FLOWISE_REMITO_EXPECTED_FORMAT = `
Analiza la imagen del remito de transporte y extrae los siguientes datos en formato JSON:

{
  "numeroRemito": "string - Número del remito (ej: '0012-00026443')",
  "fechaOperacion": "string - Fecha en formato DD/MM/YYYY",
  "emisor": {
    "nombre": "string - Nombre del emisor/cantera",
    "detalle": "string o null - Detalle adicional (ej: 'Cantera La Chola II')"
  },
  "cliente": "string - Nombre del cliente destino",
  "producto": "string - Descripción del producto transportado",
  "transportista": "string - Nombre de la empresa transportista",
  "chofer": {
    "nombre": "string - Nombre completo del chofer",
    "dni": "string o null - DNI del chofer si es visible"
  },
  "patentes": {
    "chasis": "string - Patente del camión/chasis",
    "acoplado": "string o null - Patente del acoplado/semi"
  },
  "pesosOrigen": {
    "bruto": number - Peso bruto en kg,
    "tara": number - Peso tara en kg,
    "neto": number - Peso neto en kg
  },
  "pesosDestino": {
    "bruto": number,
    "tara": number,
    "neto": number
  } | null - Solo si hay ticket de destino visible,
  "confianza": number - Porcentaje de confianza del 0 al 100,
  "camposDetectados": ["lista", "de", "campos", "encontrados"],
  "errores": ["lista de problemas o campos no legibles"]
}

REGLAS:
- Todos los pesos deben ser números en kilogramos (sin "kg" ni puntos de miles)
- Las patentes deben estar en formato argentino (AA-123-BB o similar)
- Si no puedes leer un campo, devuélvelo como null
- La confianza debe reflejar qué tan seguro estás de la extracción
- En errores lista los campos que no pudiste leer o tienen problemas
`;

