export function getApiErrorMessage(error: any): string {
  if (!error) return 'Ocurrió un error';
  const data = (error as any).data;
  const msg = data?.message || (error as any).message || (error as any).error || (typeof error === 'string' ? error : 'Ocurrió un error');
  return String(msg);
}


