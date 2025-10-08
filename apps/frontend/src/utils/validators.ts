export const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export const validatePhone = (value: string): boolean => phoneRegex.test(value);

export const validateRequired = (value: string | number | undefined | null): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateEmail = (email: string): boolean => emailRegex.test(email);

export const cuitRegex = /^\d{2}-?\d{8}-?\d$/;
export const validateCuit = (cuit: string): boolean => cuitRegex.test(cuit.replace(/\D+/g, ''));

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxBytes: number): boolean => {
  return file.size <= maxBytes;
};


