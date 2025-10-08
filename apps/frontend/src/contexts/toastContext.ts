import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export const ToastContext = createContext<{ show: (message: string, variant?: ToastVariant, durationMs?: number)=>void }>({ show: () => {} });


