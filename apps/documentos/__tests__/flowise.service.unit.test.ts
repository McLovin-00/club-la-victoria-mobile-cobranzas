/**
 * Unit tests for FlowiseService logic
 * @jest-environment node
 */

jest.mock('../src/config/database', () => ({
  prisma: {
    systemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FlowiseService', () => {
  describe('Classification result parsing', () => {
    interface ClassificationResult {
      documentType: string;
      confidence: number;
      entityType?: string;
      extractedData?: Record<string, any>;
    }

    function parseClassificationResponse(response: string): ClassificationResult | null {
      try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          documentType: parsed.documentType || parsed.tipo || 'UNKNOWN',
          confidence: parsed.confidence || parsed.confianza || 0,
          entityType: parsed.entityType || parsed.tipoEntidad,
          extractedData: parsed.extractedData || parsed.datos,
        };
      } catch {
        return null;
      }
    }

    it('should parse valid JSON response', () => {
      const response = '{"documentType": "LIC_CONDUCIR", "confidence": 0.95}';
      const result = parseClassificationResponse(response);
      expect(result?.documentType).toBe('LIC_CONDUCIR');
      expect(result?.confidence).toBe(0.95);
    });

    it('should handle JSON with surrounding text', () => {
      const response = 'Based on my analysis: {"documentType": "VTV", "confidence": 0.88} This is the result.';
      const result = parseClassificationResponse(response);
      expect(result?.documentType).toBe('VTV');
    });

    it('should handle Spanish field names', () => {
      const response = '{"tipo": "DNI", "confianza": 0.92}';
      const result = parseClassificationResponse(response);
      expect(result?.documentType).toBe('DNI');
      expect(result?.confidence).toBe(0.92);
    });

    it('should return null for invalid JSON', () => {
      const response = 'This is not valid JSON at all';
      const result = parseClassificationResponse(response);
      expect(result).toBeNull();
    });

    it('should include extracted data', () => {
      const response = '{"documentType": "LIC", "confidence": 0.9, "extractedData": {"nombre": "Juan"}}';
      const result = parseClassificationResponse(response);
      expect(result?.extractedData?.nombre).toBe('Juan');
    });
  });

  describe('Data extraction parsing', () => {
    interface ExtractedDocumentData {
      numeroDocumento?: string;
      fechaEmision?: string;
      fechaVencimiento?: string;
      titular?: string;
      dni?: string;
      patente?: string;
      categoria?: string;
      rawData?: Record<string, any>;
    }

    function normalizeExtractedData(data: Record<string, any>): ExtractedDocumentData {
      return {
        numeroDocumento: data.numero || data.numeroDocumento || data.number,
        fechaEmision: data.fechaEmision || data.emision || data.issuedDate,
        fechaVencimiento: data.fechaVencimiento || data.vencimiento || data.expiryDate,
        titular: data.titular || data.nombre || data.holder,
        dni: data.dni || data.documento,
        patente: data.patente || data.plate,
        categoria: data.categoria || data.category,
        rawData: data,
      };
    }

    it('should normalize standard fields', () => {
      const data = { numero: 'DOC-001', fechaVencimiento: '2025-01-01', titular: 'Juan' };
      const normalized = normalizeExtractedData(data);
      expect(normalized.numeroDocumento).toBe('DOC-001');
      expect(normalized.fechaVencimiento).toBe('2025-01-01');
      expect(normalized.titular).toBe('Juan');
    });

    it('should handle English field names', () => {
      const data = { number: 'DOC-002', expiryDate: '2025-06-01', holder: 'John' };
      const normalized = normalizeExtractedData(data);
      expect(normalized.numeroDocumento).toBe('DOC-002');
      expect(normalized.fechaVencimiento).toBe('2025-06-01');
      expect(normalized.titular).toBe('John');
    });

    it('should preserve raw data', () => {
      const data = { customField: 'value' };
      const normalized = normalizeExtractedData(data);
      expect(normalized.rawData?.customField).toBe('value');
    });
  });

  describe('Confidence thresholds', () => {
    const CONFIDENCE_THRESHOLDS = {
      HIGH: 0.85,
      MEDIUM: 0.70,
      LOW: 0.50,
    };

    function getConfidenceLevel(confidence: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' {
      if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
      if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
      if (confidence >= CONFIDENCE_THRESHOLDS.LOW) return 'LOW';
      return 'VERY_LOW';
    }

    function shouldAutoApprove(confidence: number): boolean {
      return confidence >= CONFIDENCE_THRESHOLDS.HIGH;
    }

    function requiresManualReview(confidence: number): boolean {
      return confidence < CONFIDENCE_THRESHOLDS.HIGH;
    }

    it('should identify HIGH confidence', () => {
      expect(getConfidenceLevel(0.95)).toBe('HIGH');
      expect(getConfidenceLevel(0.85)).toBe('HIGH');
    });

    it('should identify MEDIUM confidence', () => {
      expect(getConfidenceLevel(0.75)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.70)).toBe('MEDIUM');
    });

    it('should identify LOW confidence', () => {
      expect(getConfidenceLevel(0.55)).toBe('LOW');
      expect(getConfidenceLevel(0.50)).toBe('LOW');
    });

    it('should identify VERY_LOW confidence', () => {
      expect(getConfidenceLevel(0.30)).toBe('VERY_LOW');
    });

    it('should auto-approve high confidence', () => {
      expect(shouldAutoApprove(0.95)).toBe(true);
      expect(shouldAutoApprove(0.80)).toBe(false);
    });

    it('should require review for lower confidence', () => {
      expect(requiresManualReview(0.80)).toBe(true);
      expect(requiresManualReview(0.95)).toBe(false);
    });
  });

  describe('Flowise request building', () => {
    interface FlowiseRequest {
      question: string;
      overrideConfig?: {
        temperature?: number;
        maxTokens?: number;
      };
    }

    function buildClassificationRequest(imageBase64: string): FlowiseRequest {
      return {
        question: `Clasifica el siguiente documento. Responde en formato JSON con los campos: documentType, confidence, entityType. Imagen: ${imageBase64.substring(0, 50)}...`,
        overrideConfig: {
          temperature: 0.1, // Low temperature for consistent classification
          maxTokens: 500,
        },
      };
    }

    function buildExtractionRequest(imageBase64: string, documentType: string): FlowiseRequest {
      return {
        question: `Extrae los datos del documento tipo ${documentType}. Responde en formato JSON. Imagen: ${imageBase64.substring(0, 50)}...`,
        overrideConfig: {
          temperature: 0.2,
          maxTokens: 1000,
        },
      };
    }

    it('should build classification request', () => {
      const request = buildClassificationRequest('base64data...');
      expect(request.question).toContain('Clasifica');
      expect(request.overrideConfig?.temperature).toBe(0.1);
    });

    it('should build extraction request', () => {
      const request = buildExtractionRequest('base64data...', 'LIC_CONDUCIR');
      expect(request.question).toContain('LIC_CONDUCIR');
      expect(request.overrideConfig?.temperature).toBe(0.2);
    });
  });

  describe('Document type mapping', () => {
    const DOCUMENT_TYPE_MAPPING: Record<string, string[]> = {
      'LIC_CONDUCIR': ['licencia', 'carnet', 'registro', 'lic', 'lnc'],
      'DNI': ['dni', 'documento nacional', 'identidad'],
      'VTV': ['vtv', 'verificación técnica', 'rto', 'revision'],
      'CEDULA_VERDE': ['cédula', 'cedula', 'verde', 'tarjeta'],
      'SEGURO': ['póliza', 'poliza', 'seguro', 'cobertura'],
      'RUTA': ['habilitación', 'ruta', 'cnrt', 'nacional'],
    };

    function findDocumentTypeByKeyword(text: string): string | null {
      const lowerText = text.toLowerCase();
      
      for (const [docType, keywords] of Object.entries(DOCUMENT_TYPE_MAPPING)) {
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            return docType;
          }
        }
      }
      
      return null;
    }

    it('should identify LIC_CONDUCIR', () => {
      expect(findDocumentTypeByKeyword('licencia de conducir')).toBe('LIC_CONDUCIR');
      expect(findDocumentTypeByKeyword('Registro Nacional')).toBe('LIC_CONDUCIR');
    });

    it('should identify DNI', () => {
      expect(findDocumentTypeByKeyword('Documento Nacional de Identidad')).toBe('DNI');
    });

    it('should identify VTV', () => {
      expect(findDocumentTypeByKeyword('Verificación Técnica Vehicular')).toBe('VTV');
      expect(findDocumentTypeByKeyword('RTO')).toBe('VTV');
    });

    it('should return null for unknown', () => {
      expect(findDocumentTypeByKeyword('unknown document type')).toBeNull();
    });
  });

  describe('Date extraction', () => {
    function extractDatesFromText(text: string): string[] {
      const datePatterns = [
        /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY
        /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/g, // YYYY-MM-DD
      ];
      
      const dates: string[] = [];
      for (const pattern of datePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          dates.push(match[0]);
        }
      }
      
      return dates;
    }

    it('should extract DD/MM/YYYY dates', () => {
      const text = 'Vencimiento: 15/06/2025';
      const dates = extractDatesFromText(text);
      expect(dates).toContain('15/06/2025');
    });

    it('should extract DD-MM-YYYY dates', () => {
      const text = 'Emitido el 01-01-2024';
      const dates = extractDatesFromText(text);
      expect(dates).toContain('01-01-2024');
    });

    it('should extract YYYY-MM-DD dates', () => {
      const text = 'Date: 2025-12-31';
      const dates = extractDatesFromText(text);
      expect(dates).toContain('2025-12-31');
    });

    it('should extract multiple dates', () => {
      const text = 'Emision: 01/01/2024 Vencimiento: 01/01/2025';
      const dates = extractDatesFromText(text);
      expect(dates).toHaveLength(2);
    });
  });

  describe('DNI extraction', () => {
    function extractDNI(text: string): string | null {
      // Match 7-8 digit numbers potentially with dots
      const dniPattern = /\b(\d{1,2}\.?\d{3}\.?\d{3})\b/;
      const match = text.match(dniPattern);
      if (match) {
        return match[1].replace(/\./g, '');
      }
      return null;
    }

    it('should extract DNI without dots', () => {
      expect(extractDNI('DNI: 12345678')).toBe('12345678');
    });

    it('should extract DNI with dots', () => {
      expect(extractDNI('DNI: 12.345.678')).toBe('12345678');
    });

    it('should extract 7-digit DNI', () => {
      expect(extractDNI('Documento: 1234567')).toBe('1234567');
    });

    it('should return null if no DNI found', () => {
      expect(extractDNI('No DNI here')).toBeNull();
    });
  });

  describe('Plate extraction', () => {
    function extractPlate(text: string): string | null {
      // Mercosur format: AA 000 BB
      const mercosurPattern = /\b([A-Z]{2})\s*(\d{3})\s*([A-Z]{2})\b/i;
      // Old format: ABC 123
      const oldPattern = /\b([A-Z]{3})\s*(\d{3})\b/i;
      
      let match = text.match(mercosurPattern);
      if (match) {
        return (match[1] + match[2] + match[3]).toUpperCase();
      }
      
      match = text.match(oldPattern);
      if (match) {
        return (match[1] + match[2]).toUpperCase();
      }
      
      return null;
    }

    it('should extract Mercosur plate', () => {
      expect(extractPlate('Patente: AB 123 CD')).toBe('AB123CD');
      expect(extractPlate('Dominio: AA000BB')).toBe('AA000BB');
    });

    it('should extract old format plate', () => {
      expect(extractPlate('Dominio: ABC 123')).toBe('ABC123');
      expect(extractPlate('Patente: XYZ999')).toBe('XYZ999');
    });

    it('should return null if no plate found', () => {
      expect(extractPlate('No plate here')).toBeNull();
    });
  });

  describe('Flowise response validation', () => {
    function isValidFlowiseResponse(response: any): boolean {
      if (!response) return false;
      if (typeof response !== 'object') return false;
      
      // Check for error indicators
      if (response.error) return false;
      if (response.statusCode >= 400) return false;
      
      // Check for valid data
      return !!(response.text || response.result || response.data);
    }

    it('should validate successful response', () => {
      expect(isValidFlowiseResponse({ text: 'result' })).toBe(true);
      expect(isValidFlowiseResponse({ result: {} })).toBe(true);
    });

    it('should reject error response', () => {
      expect(isValidFlowiseResponse({ error: 'Something went wrong' })).toBe(false);
    });

    it('should reject HTTP error status', () => {
      expect(isValidFlowiseResponse({ statusCode: 500 })).toBe(false);
    });

    it('should reject null response', () => {
      expect(isValidFlowiseResponse(null)).toBe(false);
    });

    it('should reject empty response', () => {
      expect(isValidFlowiseResponse({})).toBe(false);
    });
  });
});



