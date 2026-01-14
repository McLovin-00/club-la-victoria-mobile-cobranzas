import axios from 'axios';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { prisma } from '../config/database';
import type { EntityType } from '../../node_modules/.prisma/documentos';

// =================================
// Interfaces
// =================================

interface EntityData {
  dni?: string;
  cuil?: string;
  nombre?: string;
  apellido?: string;
  cuit?: string;
  razonSocial?: string;
  patente?: string;
  marca?: string;
  modelo?: string;
  tipo?: string;
}

interface ValidationRequest {
  documentId: number;
  imageBase64: string;
  mimeType: string;
  fileName: string;
  tipoDocumento: string;
  tipoEntidad: EntityType;
  datosEntidad: EntityData;
  vencimientoPrecargado?: string | null;
  solicitadoPor?: number;
  esRechequeo?: boolean;
}

interface Disparidad {
  campo: string;
  valorEnSistema: unknown;
  valorEnDocumento: unknown;
  severidad: 'critica' | 'advertencia' | 'info';
  mensaje: string;
}

interface ValidationResponse {
  esDocumentoCorrecto: boolean;
  tipoDocumentoDetectado: string;
  confianza: number;
  motivoSiIncorrecto?: string | null;
  datosExtraidos: Record<string, unknown>;
  vencimientoEnDocumento?: string | null;
  coincideVencimiento: boolean;
  disparidades: Disparidad[];
  datosNuevos: Record<string, unknown>;
  observaciones?: string;
}

interface ValidationResult {
  success: boolean;
  data?: ValidationResponse;
  error?: string;
}

// =================================
// DocumentValidationService
// =================================

export class DocumentValidationService {
  private static instance: DocumentValidationService;

  private constructor() {}

  static getInstance(): DocumentValidationService {
    if (!DocumentValidationService.instance) {
      DocumentValidationService.instance = new DocumentValidationService();
    }
    return DocumentValidationService.instance;
  }

  /**
   * Verifica si la validación está habilitada
   */
  isEnabled(): boolean {
    const env = getEnvironment();
    return env.FLOWISE_VALIDATION_ENABLED === true && 
           !!env.FLOWISE_VALIDATION_BASE_URL && 
           !!env.FLOWISE_VALIDATION_FLOW_ID;
  }

  /**
   * Obtiene datos de la entidad desde la BD
   */
  async getEntityData(entityType: EntityType, entityId: number): Promise<EntityData> {
    switch (entityType) {
      case 'CHOFER': {
        const chofer = await prisma.chofer.findUnique({
          where: { id: entityId },
          include: { empresaTransportista: true },
        });
        return {
          dni: chofer?.dni,
          nombre: chofer?.nombre || undefined,
          apellido: chofer?.apellido || undefined,
          cuit: chofer?.empresaTransportista?.cuit,
        };
      }

      case 'CAMION': {
        const camion = await prisma.camion.findUnique({
          where: { id: entityId },
        });
        return {
          patente: camion?.patente,
          marca: camion?.marca || undefined,
          modelo: camion?.modelo || undefined,
        };
      }

      case 'ACOPLADO': {
        const acoplado = await prisma.acoplado.findUnique({
          where: { id: entityId },
        });
        return {
          patente: acoplado?.patente,
          tipo: acoplado?.tipo || undefined,
        };
      }

      case 'EMPRESA_TRANSPORTISTA': {
        const empresa = await prisma.empresaTransportista.findUnique({
          where: { id: entityId },
        });
        return {
          cuit: empresa?.cuit,
          razonSocial: empresa?.razonSocial,
        };
      }

      default:
        return {};
    }
  }

  /**
   * Ejecuta la validación del documento con Flowise
   */
  async validateDocument(request: ValidationRequest): Promise<ValidationResult> {
    if (!this.isEnabled()) {
      AppLogger.debug('⏭️ Validación de documentos deshabilitada');
      return { success: false, error: 'VALIDATION_DISABLED' };
    }

    const env = getEnvironment();
    const endpoint = `${env.FLOWISE_VALIDATION_BASE_URL}/api/v1/prediction/${env.FLOWISE_VALIDATION_FLOW_ID}`;

    const question = this.buildPrompt(request);

    try {
      AppLogger.info('🔍 Iniciando validación de documento', {
        documentId: request.documentId,
        tipoDocumento: request.tipoDocumento,
        tipoEntidad: request.tipoEntidad,
      });

      const response = await axios.post(
        endpoint,
        {
          question,
          uploads: [
            {
              type: 'file',
              name: request.fileName,
              data: `data:${request.mimeType};base64,${request.imageBase64}`,
              mime: request.mimeType,
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: env.FLOWISE_VALIDATION_TIMEOUT,
        }
      );

      const rawText = response.data?.text || response.data;
      const parsed = this.parseResponse(rawText);

      if (!parsed) {
        AppLogger.warn('⚠️ No se pudo parsear respuesta de Flowise', {
          documentId: request.documentId,
          rawText: typeof rawText === 'string' ? rawText.substring(0, 500) : 'non-string',
        });
        return { success: false, error: 'PARSE_ERROR' };
      }

      // Guardar resultado en classification
      await this.saveClassificationResult(request.documentId, parsed);

      // Guardar log de extracción
      await this.saveExtractionLog(request, parsed);

      // Actualizar datos extraídos de la entidad
      if (parsed.esDocumentoCorrecto && parsed.confianza >= 0.7) {
        await this.updateEntityExtractedData(request, parsed);
      }

      AppLogger.info('✅ Validación completada', {
        documentId: request.documentId,
        esValido: parsed.esDocumentoCorrecto,
        confianza: parsed.confianza,
        disparidades: parsed.disparidades?.length || 0,
      });

      return { success: true, data: parsed };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      AppLogger.error('💥 Error en validación de documento', {
        documentId: request.documentId,
        error: message,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Construye el prompt para Flowise
   */
  private buildPrompt(request: ValidationRequest): string {
    return `Analiza este documento y responde en JSON.

## DATOS DEL SISTEMA (lo que tenemos en base de datos):

- Tipo de documento esperado: ${request.tipoDocumento}
- Tipo de entidad: ${request.tipoEntidad}
- Datos de la entidad:
${JSON.stringify(request.datosEntidad, null, 2)}
- Vencimiento precargado: ${request.vencimientoPrecargado || 'null'}

## INSTRUCCIONES:

1. Analiza la imagen adjunta
2. Determina si ES o NO un documento de tipo "${request.tipoDocumento}"
3. Extrae TODOS los datos legibles
4. Compara con los datos del sistema
5. Identifica disparidades

## RESPONDE ÚNICAMENTE CON JSON VÁLIDO`;
  }

  /**
   * Parsea la respuesta de Flowise
   */
  private parseResponse(rawText: unknown): ValidationResponse | null {
    try {
      if (typeof rawText === 'object' && rawText !== null) {
        return rawText as ValidationResponse;
      }

      if (typeof rawText !== 'string') {
        return null;
      }

      // NOSONAR: Regex for JSON extraction - [\s\S]* is intentional to match 
      // multiline JSON. Input is bounded AI response, not user-provided text.
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      return JSON.parse(jsonMatch[0]) as ValidationResponse;
    } catch {
      return null;
    }
  }

  /**
   * Guarda el resultado en DocumentClassification
   */
  private async saveClassificationResult(documentId: number, result: ValidationResponse): Promise<void> {
    const tieneDisparidades = result.disparidades?.some(d => d.severidad === 'critica' || d.severidad === 'advertencia') || false;
    
    let vencimientoDetectado: Date | null = null;
    if (result.vencimientoEnDocumento) {
      const parsed = new Date(result.vencimientoEnDocumento);
      if (!isNaN(parsed.getTime())) {
        vencimientoDetectado = parsed;
      }
    }

    await prisma.documentClassification.upsert({
      where: { documentId },
      update: {
        documentoEsValido: result.esDocumentoCorrecto,
        motivoInvalidez: result.motivoSiIncorrecto || null,
        datosExtraidos: result.datosExtraidos as any,
        disparidades: result.disparidades as any,
        tieneDisparidades,
        vencimientoDetectado,
        vencimientoOrigen: result.vencimientoEnDocumento ? 'documento' : null,
        confidence: result.confianza,
        aiResponse: result as any,
        detectedDocumentType: result.tipoDocumentoDetectado,
        validationStatus: 'validated', // Marcar como validado por IA
        updatedAt: new Date(),
      },
      create: {
        documentId,
        documentoEsValido: result.esDocumentoCorrecto,
        motivoInvalidez: result.motivoSiIncorrecto || null,
        datosExtraidos: result.datosExtraidos as any,
        disparidades: result.disparidades as any,
        tieneDisparidades,
        vencimientoDetectado,
        vencimientoOrigen: result.vencimientoEnDocumento ? 'documento' : null,
        confidence: result.confianza,
        aiResponse: result as any,
        detectedDocumentType: result.tipoDocumentoDetectado,
        validationStatus: 'validated', // Marcar como validado por IA
      },
    });
  }

  /**
   * Guarda el log de extracción
   */
  private async saveExtractionLog(request: ValidationRequest, result: ValidationResponse): Promise<void> {
    const doc = await prisma.document.findUnique({
      where: { id: request.documentId },
      select: { tenantEmpresaId: true, entityType: true, entityId: true },
    });

    if (!doc) return;

    await prisma.entityExtractionLog.create({
      data: {
        tenantEmpresaId: doc.tenantEmpresaId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        documentId: request.documentId,
        templateName: request.tipoDocumento,
        datosExtraidos: (result.datosExtraidos ?? {}) as any, // Valor por defecto si es undefined
        disparidades: (result.disparidades ?? []) as any, // Valor por defecto si es undefined
        esValido: result.esDocumentoCorrecto ?? false,
        confianza: result.confianza ?? 0,
        solicitadoPor: request.solicitadoPor || null,
        esRechequeo: request.esRechequeo || false,
      },
    });
  }

  /**
   * Actualiza los datos extraídos de la entidad (consolidados)
   */
  private async updateEntityExtractedData(request: ValidationRequest, result: ValidationResponse): Promise<void> {
    const doc = await prisma.document.findUnique({
      where: { id: request.documentId },
      select: { tenantEmpresaId: true, dadorCargaId: true, entityType: true, entityId: true },
    });

    if (!doc) return;

    const extracted = result.datosExtraidos || {};
    
    // Preparar campos consolidados según tipo de entidad
    const consolidatedFields = this.extractConsolidatedFields(doc.entityType, extracted);

    await prisma.entityExtractedData.upsert({
      where: {
        tenantEmpresaId_entityType_entityId: {
          tenantEmpresaId: doc.tenantEmpresaId,
          entityType: doc.entityType,
          entityId: doc.entityId,
        },
      },
      update: {
        datosExtraidos: this.mergeExtractedData(extracted) as any,
        ultimaExtraccionAt: new Date(),
        ultimoDocumentoId: request.documentId,
        ultimoDocumentoTipo: request.tipoDocumento,
        confianzaPromedio: result.confianza,
        ...consolidatedFields,
        updatedAt: new Date(),
      },
      create: {
        tenantEmpresaId: doc.tenantEmpresaId,
        dadorCargaId: doc.dadorCargaId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        datosExtraidos: extracted as any,
        ultimaExtraccionAt: new Date(),
        ultimoDocumentoId: request.documentId,
        ultimoDocumentoTipo: request.tipoDocumento,
        confianzaPromedio: result.confianza,
        ...consolidatedFields,
      },
    });
  }

  /**
   * Extrae campos consolidados según tipo de entidad
   */
  private extractConsolidatedFields(entityType: EntityType, data: Record<string, unknown>): Record<string, unknown> {
    const extractors: Record<string, (d: Record<string, unknown>) => Record<string, unknown>> = {
      CHOFER: this.extractChoferFields,
      CAMION: this.extractVehiculoFields,
      ACOPLADO: this.extractVehiculoFields,
      EMPRESA_TRANSPORTISTA: this.extractEmpresaFields,
    };
    const extractor = extractors[entityType];
    return extractor ? extractor(data) : {};
  }

  private extractChoferFields(data: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (data.cuil) fields.cuil = String(data.cuil);
    if (data.nacionalidad) fields.nacionalidad = String(data.nacionalidad);
    if (data.numeroLicencia) fields.numeroLicencia = String(data.numeroLicencia);
    if (Array.isArray(data.clases)) fields.clasesLicencia = data.clases.map(String);
    
    const fechaNac = this.parseDate(data.fechaNacimiento);
    if (fechaNac) fields.fechaNacimiento = fechaNac;
    
    const vencLic = this.parseDate(data.vencimiento);
    if (vencLic) fields.vencimientoLicencia = vencLic;
    
    return fields;
  }

  private extractVehiculoFields(data: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (data.anio) fields.anioFabricacion = Number(data.anio);
    if (data.numeroMotor) fields.numeroMotor = String(data.numeroMotor);
    if (data.numeroChasis) fields.numeroChasis = String(data.numeroChasis);
    
    if (data.titular) {
      const titular = data.titular;
      if (typeof titular === 'string') {
        fields.titular = titular;
      } else if (typeof titular === 'object' && titular !== null) {
        const t = titular as Record<string, unknown>;
        fields.titular = String(t.nombre || '');
        if (t.dni) fields.titularDni = String(t.dni);
      }
    }
    return fields;
  }

  private extractEmpresaFields(data: Record<string, unknown>): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (data.condicionIva) fields.condicionIva = String(data.condicionIva);
    if (data.domicilioFiscal) fields.domicilioFiscal = data.domicilioFiscal;
    if (data.actividadPrincipal) fields.actividadPrincipal = data.actividadPrincipal;
    if (data.cantidadEmpleados) fields.cantidadEmpleados = Number(data.cantidadEmpleados);
    
    if (typeof data.art === 'object' && data.art !== null) {
      const art = data.art as Record<string, unknown>;
      if (art.nombre) fields.artNombre = String(art.nombre);
      if (art.poliza) fields.artPoliza = String(art.poliza);
    }
    return fields;
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Merge de datos extraídos existentes con nuevos
   */
  private mergeExtractedData(newData: Record<string, unknown>): Record<string, unknown> {
    // Por ahora retornamos los nuevos datos
    // En el futuro se podría hacer merge con datos anteriores
    return newData;
  }
}

export const documentValidationService = DocumentValidationService.getInstance();

