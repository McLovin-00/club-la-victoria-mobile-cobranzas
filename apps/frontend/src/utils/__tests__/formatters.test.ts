import { formatDate, formatDateTime, formatCuit, formatCurrency, formatFileSize } from '../../utils/formatters';

describe('formatters', () => {
  it('formatDate should format valid date', () => {
    expect(formatDate('2024-01-02')).toMatch(/02\/01\/2024|01\/02\/2024/);
  });
  it('formatDate should return - for invalid date', () => {
    expect(formatDate('invalid')).toBe('-');
  });
  it('formatDateTime should return - for invalid date', () => {
    expect(formatDateTime('x')).toBe('-');
  });
  it('formatCuit should format CUIT', () => {
    expect(formatCuit('20123456789')).toBe('20-12345678-9');
  });
  it('formatCurrency should format number', () => {
    expect(formatCurrency(1234.56)).toMatch(/\$\s?1?\,?234\.56|1.234,56/);
  });
  it('formatFileSize should format bytes', () => {
    expect(formatFileSize(1024)).toContain('KB');
  });
});


