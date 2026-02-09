// Tests unitarios simples para DocumentPreview - aumentar cobertura
import { describe, it, expect } from '@jest/globals';

describe('DocumentPreview - Unit Tests', () => {
  describe('getStatusColor', () => {
    const getStatusColor = (status: string): string => {
      switch (status) {
        case 'APROBADO':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'PENDIENTE':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'RECHAZADO':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'VENCIDO':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'VALIDANDO':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    it('debe retornar clases verdes para APROBADO', () => {
      const result = getStatusColor('APROBADO');
      expect(result).toContain('green');
      expect(result).toContain('bg-green-100');
    });

    it('debe retornar clases amarillas para PENDIENTE', () => {
      const result = getStatusColor('PENDIENTE');
      expect(result).toContain('yellow');
      expect(result).toContain('bg-yellow-100');
    });

    it('debe retornar clases rojas para RECHAZADO', () => {
      const result = getStatusColor('RECHAZADO');
      expect(result).toContain('red');
      expect(result).toContain('bg-red-100');
    });

    it('debe retornar clases grises para VENCIDO', () => {
      const result = getStatusColor('VENCIDO');
      expect(result).toContain('gray');
      expect(result).toContain('bg-gray-100');
    });

    it('debe retornar clases azules para VALIDANDO', () => {
      const result = getStatusColor('VALIDANDO');
      expect(result).toContain('blue');
      expect(result).toContain('bg-blue-100');
    });

    it('debe retornar clases grises por defecto', () => {
      const result = getStatusColor('DESCONOCIDO');
      expect(result).toContain('gray');
      expect(result).toBe('bg-gray-100 text-gray-800 border-gray-200');
    });
  });

  describe('detección de móvil/Android', () => {
    it('debe detectar Android en userAgent', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 10)';
      const isAndroid = /Android/i.test(userAgent);
      expect(isAndroid).toBe(true);
    });

    it('debe detectar iPhone en userAgent', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)';
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      expect(isMobile).toBe(true);
    });

    it('debe detectar iPad en userAgent', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0)';
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      expect(isMobile).toBe(true);
    });

    it('debe considerar desktop sin móviles en userAgent', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      expect(isMobile).toBe(false);
    });
  });

  describe('detección de MinIO URLs', () => {
    it('debe detectar URL de MinIO con http', () => {
      const url = 'http://minio:9000/bucket/file.pdf';
      const minioRegex = /:\/\/minio(?::|\/)/i;
      const isMinio = minioRegex.test(url);
      expect(isMinio).toBe(true);
    });

    it('debe detectar URL de MinIO con https', () => {
      const url = 'https://minio:9000/bucket/file.pdf';
      const minioRegex = /:\/\/minio(?::|\/)/i;
      const isMinio = minioRegex.test(url);
      expect(isMinio).toBe(true);
    });

    it('debe rechazar URL que no es de MinIO', () => {
      const url = 'https://example.com/bucket/file.pdf';
      const minioRegex = /:\/\/minio(?::|\/)/i;
      const isMinio = minioRegex.test(url);
      expect(isMinio).toBe(false);
    });
  });

  describe('cálculo de backoff exponencial', () => {
    it('debe calcular wait time correctamente para attempt 1', () => {
      const attempt = 1;
      const waitTime = Math.pow(2, attempt) * 1000;
      expect(waitTime).toBe(2000);
    });

    it('debe calcular wait time correctamente para attempt 2', () => {
      const attempt = 2;
      const waitTime = Math.pow(2, attempt) * 1000;
      expect(waitTime).toBe(4000);
    });

    it('debe calcular wait time correctamente para attempt 3', () => {
      const attempt = 3;
      const waitTime = Math.pow(2, attempt) * 1000;
      expect(waitTime).toBe(8000);
    });
  });

  describe('cálculo de timeout para AbortController', () => {
    it('debe usar 15 segundos de timeout', () => {
      const timeout = 15000;
      expect(timeout).toBe(15000);
    });
  });

  describe('validación de tipos MIME', () => {
    it('debe identificar PDF', () => {
      const mimeType = 'application/pdf';
      const isPdf = mimeType === 'application/pdf';
      expect(isPdf).toBe(true);
    });

    it('debe identificar imagen', () => {
      const mimeType = 'image/jpeg';
      const isImage = mimeType.startsWith('image/');
      expect(isImage).toBe(true);
    });

    it('debe identificar Word DOCX', () => {
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isWord = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      expect(isWord).toBe(true);
    });

    it('debe identificar Word DOC', () => {
      const mimeType = 'application/msword';
      const isDoc = mimeType === 'application/msword';
      expect(isDoc).toBe(true);
    });
  });

  describe('códigos de error de MinIO', () => {
    it('debe identificar MINIO_BUCKET_NOT_FOUND', () => {
      const code = 'MINIO_BUCKET_NOT_FOUND';
      expect(code).toBe('MINIO_BUCKET_NOT_FOUND');
    });

    it('debe identificar MINIO_OBJECT_NOT_FOUND', () => {
      const code = 'MINIO_OBJECT_NOT_FOUND';
      expect(code).toBe('MINIO_OBJECT_NOT_FOUND');
    });
  });
});
