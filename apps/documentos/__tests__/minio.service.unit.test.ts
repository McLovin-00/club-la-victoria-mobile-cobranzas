/**
 * Unit tests for MinIO Service logic
 * @jest-environment node
 */

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MinIOService', () => {
  describe('Bucket naming', () => {
    const BUCKET_PREFIX = 'docs';

    function generateBucketName(tenantId: number): string {
      return `${BUCKET_PREFIX}-tenant-${tenantId}`;
    }

    it('should generate bucket name with prefix', () => {
      expect(generateBucketName(100)).toBe('docs-tenant-100');
    });

    it('should generate unique bucket per tenant', () => {
      const bucket1 = generateBucketName(100);
      const bucket2 = generateBucketName(200);
      expect(bucket1).not.toBe(bucket2);
    });
  });

  describe('Object key generation', () => {
    function generateObjectKey(
      entityType: string,
      entityId: number,
      templateId: number,
      fileName: string
    ): string {
      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      return `${entityType.toLowerCase()}/${entityId}/template_${templateId}/${timestamp}_${sanitizedName}`;
    }

    it('should generate path with entity type', () => {
      const key = generateObjectKey('CHOFER', 1, 5, 'doc.pdf');
      expect(key).toContain('chofer/');
    });

    it('should include entity ID', () => {
      const key = generateObjectKey('CAMION', 123, 5, 'doc.pdf');
      expect(key).toContain('/123/');
    });

    it('should include template ID', () => {
      const key = generateObjectKey('CHOFER', 1, 42, 'doc.pdf');
      expect(key).toContain('template_42/');
    });

    it('should sanitize filename', () => {
      const key = generateObjectKey('CHOFER', 1, 5, 'doc with spaces.pdf');
      expect(key).not.toContain(' ');
      expect(key).toContain('doc_with_spaces.pdf');
    });
  });

  describe('Content type detection', () => {
    function getContentType(fileName: string): string {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      return contentTypes[ext || ''] || 'application/octet-stream';
    }

    it('should detect PDF', () => {
      expect(getContentType('document.pdf')).toBe('application/pdf');
    });

    it('should detect JPEG', () => {
      expect(getContentType('photo.jpg')).toBe('image/jpeg');
      expect(getContentType('photo.jpeg')).toBe('image/jpeg');
    });

    it('should detect PNG', () => {
      expect(getContentType('image.png')).toBe('image/png');
    });

    it('should default to octet-stream', () => {
      expect(getContentType('unknown.xyz')).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', () => {
      expect(getContentType('DOC.PDF')).toBe('application/pdf');
    });
  });

  describe('File size validation', () => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

    function validateFile(size: number, mimeType: string): { valid: boolean; error?: string } {
      if (size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size exceeds maximum allowed (50MB)' };
      }
      if (!ALLOWED_TYPES.includes(mimeType)) {
        return { valid: false, error: 'File type not allowed' };
      }
      return { valid: true };
    }

    it('should accept valid PDF', () => {
      const result = validateFile(1024 * 1024, 'application/pdf');
      expect(result.valid).toBe(true);
    });

    it('should accept valid image', () => {
      const result = validateFile(500 * 1024, 'image/jpeg');
      expect(result.valid).toBe(true);
    });

    it('should reject oversized file', () => {
      const result = validateFile(100 * 1024 * 1024, 'application/pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size exceeds');
    });

    it('should reject invalid type', () => {
      const result = validateFile(1024, 'application/exe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('type not allowed');
    });
  });

  describe('Presigned URL generation', () => {
    function generatePresignedUrlParams(
      bucket: string,
      key: string,
      expiresInSeconds: number = 3600
    ): { bucket: string; key: string; expires: number } {
      return {
        bucket,
        key,
        expires: expiresInSeconds,
      };
    }

    it('should generate params with default expiry', () => {
      const params = generatePresignedUrlParams('bucket', 'key');
      expect(params.expires).toBe(3600);
    });

    it('should use custom expiry', () => {
      const params = generatePresignedUrlParams('bucket', 'key', 7200);
      expect(params.expires).toBe(7200);
    });

    it('should include bucket and key', () => {
      const params = generatePresignedUrlParams('my-bucket', 'path/to/file.pdf');
      expect(params.bucket).toBe('my-bucket');
      expect(params.key).toBe('path/to/file.pdf');
    });
  });

  describe('File path parsing', () => {
    function parseObjectPath(path: string): {
      entityType: string;
      entityId: string;
      templateId: string;
      fileName: string;
    } | null {
      const parts = path.split('/');
      if (parts.length < 4) return null;

      const [entityType, entityId, templatePart, ...fileNameParts] = parts;
      const templateId = templatePart.replace('template_', '');

      return {
        entityType: entityType.toUpperCase(),
        entityId,
        templateId,
        fileName: fileNameParts.join('/'),
      };
    }

    it('should parse valid path', () => {
      const path = 'chofer/123/template_5/1234567890_doc.pdf';
      const parsed = parseObjectPath(path);
      expect(parsed?.entityType).toBe('CHOFER');
      expect(parsed?.entityId).toBe('123');
      expect(parsed?.templateId).toBe('5');
    });

    it('should return null for invalid path', () => {
      expect(parseObjectPath('invalid')).toBeNull();
    });
  });

  describe('Metadata building', () => {
    interface FileMetadata {
      'x-amz-meta-tenant-id': string;
      'x-amz-meta-entity-type': string;
      'x-amz-meta-entity-id': string;
      'x-amz-meta-template-id': string;
      'x-amz-meta-uploaded-by': string;
      'x-amz-meta-original-name': string;
    }

    function buildMetadata(params: {
      tenantId: number;
      entityType: string;
      entityId: number;
      templateId: number;
      uploadedBy: number;
      originalName: string;
    }): FileMetadata {
      return {
        'x-amz-meta-tenant-id': String(params.tenantId),
        'x-amz-meta-entity-type': params.entityType,
        'x-amz-meta-entity-id': String(params.entityId),
        'x-amz-meta-template-id': String(params.templateId),
        'x-amz-meta-uploaded-by': String(params.uploadedBy),
        'x-amz-meta-original-name': params.originalName,
      };
    }

    it('should build complete metadata', () => {
      const metadata = buildMetadata({
        tenantId: 100,
        entityType: 'CHOFER',
        entityId: 1,
        templateId: 5,
        uploadedBy: 10,
        originalName: 'licencia.pdf',
      });

      expect(metadata['x-amz-meta-tenant-id']).toBe('100');
      expect(metadata['x-amz-meta-entity-type']).toBe('CHOFER');
      expect(metadata['x-amz-meta-original-name']).toBe('licencia.pdf');
    });
  });

  describe('Retention policy', () => {
    function calculateRetentionDate(
      documentExpiryDate: Date | null,
      retentionYears: number = 5
    ): Date {
      const baseDate = documentExpiryDate || new Date();
      const retentionDate = new Date(baseDate);
      retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);
      return retentionDate;
    }

    it('should calculate retention from expiry', () => {
      const expiryDate = new Date(2024, 0, 15); // Use explicit constructor to avoid timezone issues
      const retention = calculateRetentionDate(expiryDate, 5);
      expect(retention.getFullYear()).toBe(2029);
    });

    it('should calculate retention from today if no expiry', () => {
      const retention = calculateRetentionDate(null, 5);
      expect(retention.getFullYear()).toBe(new Date().getFullYear() + 5);
    });

    it('should support custom retention years', () => {
      const expiryDate = new Date(2024, 0, 15); // Use explicit constructor
      const retention = calculateRetentionDate(expiryDate, 10);
      expect(retention.getFullYear()).toBe(2034);
    });
  });

  describe('File cleanup logic', () => {
    interface FileVersion {
      key: string;
      lastModified: Date;
      size: number;
    }

    function identifyFilesToDelete(
      versions: FileVersion[],
      keepVersions: number = 3
    ): FileVersion[] {
      if (versions.length <= keepVersions) return [];

      // Sort by most recent first
      const sorted = [...versions].sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );

      // Return old versions to delete
      return sorted.slice(keepVersions);
    }

    it('should keep specified number of versions', () => {
      const versions: FileVersion[] = [
        { key: 'v1', lastModified: new Date('2024-01-01'), size: 1024 },
        { key: 'v2', lastModified: new Date('2024-02-01'), size: 1024 },
        { key: 'v3', lastModified: new Date('2024-03-01'), size: 1024 },
        { key: 'v4', lastModified: new Date('2024-04-01'), size: 1024 },
        { key: 'v5', lastModified: new Date('2024-05-01'), size: 1024 },
      ];

      const toDelete = identifyFilesToDelete(versions, 3);
      expect(toDelete).toHaveLength(2);
      expect(toDelete.map(v => v.key)).toContain('v1');
      expect(toDelete.map(v => v.key)).toContain('v2');
    });

    it('should not delete if fewer versions than limit', () => {
      const versions: FileVersion[] = [
        { key: 'v1', lastModified: new Date('2024-01-01'), size: 1024 },
        { key: 'v2', lastModified: new Date('2024-02-01'), size: 1024 },
      ];

      const toDelete = identifyFilesToDelete(versions, 3);
      expect(toDelete).toHaveLength(0);
    });
  });

  describe('Batch delete logic', () => {
    function batchKeys(keys: string[], batchSize: number = 1000): string[][] {
      const batches: string[][] = [];
      for (let i = 0; i < keys.length; i += batchSize) {
        batches.push(keys.slice(i, i + batchSize));
      }
      return batches;
    }

    it('should batch keys into groups', () => {
      const keys = Array.from({ length: 2500 }, (_, i) => `key_${i}`);
      const batches = batchKeys(keys, 1000);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(1000);
      expect(batches[1]).toHaveLength(1000);
      expect(batches[2]).toHaveLength(500);
    });

    it('should handle fewer keys than batch size', () => {
      const keys = ['key1', 'key2', 'key3'];
      const batches = batchKeys(keys, 1000);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const batches = batchKeys([]);
      expect(batches).toHaveLength(0);
    });
  });
});

