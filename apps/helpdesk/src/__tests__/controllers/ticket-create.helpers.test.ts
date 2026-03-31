import type { Express } from 'express';
import {
  buildInitialTicketMessage,
  isMultipartCreateRequest,
  normalizeMulterFiles,
  parseMultipartTicketBody,
  prevalidateTicketAttachments,
  toCreateTicketInput,
} from '../../controllers/ticket-create.helpers';

describe('ticket-create.helpers', () => {
  describe('isMultipartCreateRequest', () => {
    it('detecta content-type multipart', () => {
      expect(
        isMultipartCreateRequest({
          headers: { 'content-type': 'multipart/form-data; boundary=----' },
        })
      ).toBe(true);
    });

    it('detecta multipart en mayusculas', () => {
      expect(
        isMultipartCreateRequest({
          headers: { 'content-type': 'MULTIPART/FORM-DATA' },
        })
      ).toBe(true);
    });

    it('rechaza application/json', () => {
      expect(isMultipartCreateRequest({ headers: { 'content-type': 'application/json' } })).toBe(false);
    });

    it('rechaza cuando content-type no esta definido', () => {
      expect(isMultipartCreateRequest({ headers: {} })).toBe(false);
    });

    it('rechaza cuando content-type no es string', () => {
      expect(isMultipartCreateRequest({ headers: { 'content-type': undefined } })).toBe(false);
    });

    it('rechaza cuando headers es vacio', () => {
      expect(isMultipartCreateRequest({ headers: {} })).toBe(false);
    });
  });

  describe('normalizeMulterFiles', () => {
    it('devuelve array si ya es array', () => {
      const files = [{ fieldname: 'file' }] as unknown as Express.Multer.File[];
      expect(normalizeMulterFiles(files)).toBe(files);
    });

    it('devuelve array vacio si no es array', () => {
      expect(normalizeMulterFiles(null)).toEqual([]);
      expect(normalizeMulterFiles(undefined)).toEqual([]);
      expect(normalizeMulterFiles('string')).toEqual([]);
      expect(normalizeMulterFiles({})).toEqual([]);
    });
  });

  describe('buildInitialTicketMessage', () => {
    it('acepta mensaje de 10+ caracteres sin archivos', () => {
      expect(buildInitialTicketMessage('1234567890', 0).ok).toBe(true);
      if (buildInitialTicketMessage('1234567890', 0).ok) {
        expect((buildInitialTicketMessage('1234567890', 0) as any).message).toBe('1234567890');
      }
    });

    it('rechaza mensaje corto sin archivos', () => {
      expect(buildInitialTicketMessage('corta', 0).ok).toBe(false);
    });

    it('acepta mensaje vacio con archivos (usa fallback)', () => {
      const result = buildInitialTicketMessage('', 1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.message).toContain('archivos adjuntos');
      }
    });

    it('acepta mensaje corto con archivos (agrega nota)', () => {
      const result = buildInitialTicketMessage('hola', 1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.message).toContain('Incluye archivos adjuntos');
      }
    });

    it('acepta mensaje exacto de 10 caracteres', () => {
      expect(buildInitialTicketMessage('1234567890', 0).ok).toBe(true);
    });

    it('rechaza mensaje de 9 caracteres sin archivos', () => {
      expect(buildInitialTicketMessage('123456789', 0).ok).toBe(false);
    });

    it('mensaje de error contiene el minimo requerido', () => {
      const result = buildInitialTicketMessage('corta', 0);
      if (!result.ok) {
        expect(result.message).toContain('10');
      }
    });
  });

  describe('parseMultipartTicketBody', () => {
    it('parsea campos validos', () => {
      const result = parseMultipartTicketBody({
        category: 'TECHNICAL',
        subcategory: 'ERROR',
        subject: 'Test ticket subject',
        priority: 'NORMAL',
        message: 'Test message for ticket creation',
      });

      expect(result.ok).toBe(true);
    });

    it('rechaza campos invalidos', () => {
      const result = parseMultipartTicketBody({
        category: 'INVALID',
      });

      expect(result.ok).toBe(false);
    });

    it('rechaza body vacio', () => {
      const result = parseMultipartTicketBody({});
      expect(result.ok).toBe(false);
    });
  });

  describe('prevalidateTicketAttachments', () => {
    it('acepta archivo valido', () => {
      const valid = {
        mimetype: 'image/jpeg',
        size: 100,
        originalname: 'test.jpg',
        buffer: Buffer.from('a'),
      } as unknown as Express.Multer.File;
      expect(prevalidateTicketAttachments([valid]).ok).toBe(true);
    });

    it('rechaza mime invalido', () => {
      const bad = {
        mimetype: 'application/x-bad',
        size: 100,
        originalname: 'x.bin',
        buffer: Buffer.from('a'),
      } as unknown as Express.Multer.File;
      expect(prevalidateTicketAttachments([bad]).ok).toBe(false);
    });

    it('acepta array vacio', () => {
      expect(prevalidateTicketAttachments([]).ok).toBe(true);
    });

    it('rechaza primer archivo invalido en lista', () => {
      const bad = {
        mimetype: 'application/x-bad',
        size: 100,
        originalname: 'x.bin',
        buffer: Buffer.from('a'),
      } as unknown as Express.Multer.File;
      const good = {
        mimetype: 'image/jpeg',
        size: 100,
        originalname: 'test.jpg',
        buffer: Buffer.from('a'),
      } as unknown as Express.Multer.File;
      expect(prevalidateTicketAttachments([good, bad]).ok).toBe(false);
    });
  });

  describe('toCreateTicketInput', () => {
    it('arma el input correctamente', () => {
      const result = toCreateTicketInput(
        {
          category: 'TECHNICAL',
          subcategory: 'ERROR',
          subject: 'Test',
          priority: 'NORMAL',
          message: 'Test message',
        },
        'Resolved message'
      );

      expect(result).toEqual({
        category: 'TECHNICAL',
        subcategory: 'ERROR',
        subject: 'Test',
        priority: 'NORMAL',
        message: 'Resolved message',
      });
    });

    it('trunca mensaje a 5000 caracteres', () => {
      const longMsg = 'a'.repeat(6000);
      const result = toCreateTicketInput(
        {
          category: 'TECHNICAL',
          subcategory: 'ERROR',
          subject: 'Test',
          priority: 'NORMAL',
          message: 'short',
        },
        longMsg
      );

      expect(result.message.length).toBe(5000);
    });
  });
});
