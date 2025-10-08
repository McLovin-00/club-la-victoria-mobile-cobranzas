import { validatePhone, validateRequired, validateEmail, validateCuit, validateFileType, validateFileSize } from '../../utils/validators';

describe('validators', () => {
  it('validatePhone', () => {
    expect(validatePhone('+5491122334455')).toBe(true);
    expect(validatePhone('123')).toBe(false);
  });
  it('validateRequired', () => {
    expect(validateRequired('a')).toBe(true);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired(0)).toBe(true);
  });
  it('validateEmail', () => {
    expect(validateEmail('a@b.com')).toBe(true);
    expect(validateEmail('bad')).toBe(false);
  });
  it('validateCuit', () => {
    expect(validateCuit('20-12345678-9')).toBe(true);
    expect(validateCuit('2012345678')).toBe(false);
  });
  it('file validators', () => {
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' });
    expect(validateFileType(file, ['text/plain'])).toBe(true);
    expect(validateFileType(file, ['image/png'])).toBe(false);
    expect(validateFileSize(file, 10)).toBe(true);
    expect(validateFileSize(file, 1)).toBe(false);
  });
});


