import {
  paginationSchema,
  idParamSchema,
  ticketNumberParamSchema,
  dateRangeSchema,
  searchSchema,
} from '../../schemas/common.schema';

describe('common.schema', () => {
  describe('paginationSchema', () => {
    it('applies defaults when no input', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('parses valid page and limit', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    it('coerces string values', () => {
      const result = paginationSchema.safeParse({ page: '2', limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it('rejects page below 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects limit above 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('clamps to min values', () => {
      const result = paginationSchema.safeParse({ page: -5, limit: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('idParamSchema', () => {
    it('accepts valid cuid', () => {
      const result = idParamSchema.safeParse({ id: 'clabcdefghijklmnopqrstuvwx' });
      expect(result.success).toBe(true);
    });

    it('rejects non-cuid', () => {
      const result = idParamSchema.safeParse({ id: 'not-a-cuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('ticketNumberParamSchema', () => {
    it('accepts valid cuid', () => {
      const result = ticketNumberParamSchema.safeParse({ ticketId: 'clabcdefghijklmnopqrstuvwx' });
      expect(result.success).toBe(true);
    });

    it('rejects non-cuid', () => {
      const result = ticketNumberParamSchema.safeParse({ ticketId: 'bad' });
      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('accepts empty object with defaults', () => {
      const result = dateRangeSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBeUndefined();
        expect(result.data.to).toBeUndefined();
      }
    });

    it('accepts valid dates', () => {
      const result = dateRangeSchema.safeParse({
        from: '2024-01-01',
        to: '2024-12-31',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('searchSchema', () => {
    it('accepts empty object', () => {
      const result = searchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it('accepts valid search string', () => {
      const result = searchSchema.safeParse({ search: '  test query  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('test query');
      }
    });

    it('trims whitespace from search', () => {
      const result = searchSchema.safeParse({ search: '  spaced  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('spaced');
      }
    });

    it('rejects search exceeding 200 chars', () => {
      const result = searchSchema.safeParse({ search: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('accepts search at exactly 200 chars', () => {
      const result = searchSchema.safeParse({ search: 'a'.repeat(200) });
      expect(result.success).toBe(true);
    });
  });
});
