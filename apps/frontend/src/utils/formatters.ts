export const formatDate = (dateString: string | Date, locale = 'es-AR', options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale, options);
};

export const formatDateTime = (dateString: string | Date, locale = 'es-AR') => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale);
};

export const formatCuit = (cuit?: string) => {
  if (!cuit) return '';
  const clean = cuit.replace(/\D+/g, '');
  if (clean.length !== 11) return cuit;
  return `${clean.slice(0,2)}-${clean.slice(2,10)}-${clean.slice(10)}`;
};

export const formatCurrency = (amount: number, currency: string = 'ARS', locale: string = 'es-AR') => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return String(amount);
  }
};

export const formatPhone = (phone: string) => {
  const clean = phone.replace(/\s+/g, '');
  return clean;
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${value} ${sizes[i]}`;
};


