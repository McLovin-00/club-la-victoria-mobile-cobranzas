import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType } from '../../node_modules/.prisma/documentos';

/**
 * Servicio para estandarizar nombres de archivos de documentos
 * Formato: {IDENTIFICADOR}_{PLANTILLA_NORMALIZADA}.{ext}
 */
export class FileNamingService {
  /**
   * Genera el nombre estandarizado para un documento
   */
  static async generateStandardizedName(
    entityType: EntityType,
    entityId: number,
    templateName: string,
    originalExtension: string
  ): Promise<string> {
    const identifier = await this.getEntityIdentifier(entityType, entityId);
    const normalizedTemplate = this.normalizeTemplateName(templateName);
    const ext = originalExtension.startsWith('.') ? originalExtension : `.${originalExtension}`;
    
    return `${identifier}_${normalizedTemplate}${ext}`;
  }

  /**
   * Obtiene el identificador de la entidad (DNI, CUIT o Patente)
   */
  static async getEntityIdentifier(entityType: EntityType, entityId: number): Promise<string> {
    try {
      switch (entityType) {
        case 'EMPRESA_TRANSPORTISTA': {
          const empresa = await prisma.empresaTransportista.findUnique({
            where: { id: entityId },
            select: { cuit: true },
          });
          if (empresa?.cuit) {
            return this.normalizeCuit(empresa.cuit);
          }
          return `empresa_${entityId}`;
        }

        case 'CHOFER': {
          const chofer = await prisma.chofer.findUnique({
            where: { id: entityId },
            select: { dni: true },
          });
          if (chofer?.dni) {
            return this.normalizeDni(chofer.dni);
          }
          return `chofer_${entityId}`;
        }

        case 'CAMION': {
          const camion = await prisma.camion.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          if (camion?.patente) {
            return this.normalizePatente(camion.patente);
          }
          return `camion_${entityId}`;
        }

        case 'ACOPLADO': {
          const acoplado = await prisma.acoplado.findUnique({
            where: { id: entityId },
            select: { patente: true },
          });
          if (acoplado?.patente) {
            return this.normalizePatente(acoplado.patente);
          }
          return `acoplado_${entityId}`;
        }

        case 'DADOR': {
          const dador = await prisma.dadorCarga.findUnique({
            where: { id: entityId },
            select: { cuit: true },
          });
          if (dador?.cuit) {
            return this.normalizeCuit(dador.cuit);
          }
          return `dador_${entityId}`;
        }

        default:
          return `unknown_${entityId}`;
      }
    } catch (error) {
      AppLogger.warn('⚠️ Error obteniendo identificador de entidad', {
        entityType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return `${entityType.toLowerCase()}_${entityId}`;
    }
  }

  /**
   * Normaliza el nombre de la plantilla
   * - Minúsculas
   * - Espacios → guiones bajos
   * - Sin tildes ni caracteres especiales
   */
  static normalizeTemplateName(templateName: string): string {
    return templateName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9]/g, '_')       // Solo alfanuméricos
      .replace(/_+/g, '_')              // Colapsar guiones múltiples
      .replace(/^_/, '').replace(/_$/, '');   // Trim guiones inicio/fin
  }

  /**
   * Normaliza CUIT (solo dígitos)
   */
  static normalizeCuit(cuit: string): string {
    return cuit.replace(/\D/g, '');
  }

  /**
   * Normaliza DNI (solo dígitos)
   */
  static normalizeDni(dni: string): string {
    return dni.replace(/\D/g, '');
  }

  /**
   * Normaliza Patente (mayúsculas, sin guiones ni espacios)
   */
  static normalizePatente(patente: string): string {
    return patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Extrae la extensión de un nombre de archivo
   */
  static getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1 || lastDot === fileName.length - 1) {
      return '';
    }
    return fileName.substring(lastDot).toLowerCase();
  }
}

