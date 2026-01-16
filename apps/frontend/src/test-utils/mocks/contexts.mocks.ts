/**
 * Mocks para Contexts de React
 * 
 * Provee mocks configurables para contextos de la aplicación.
 */

import { createContext } from 'react';

// =============================================================================
// MOCK DE ConfirmContext
// =============================================================================

export const createConfirmContextMock = (overrides: { confirmResult?: boolean } = {}) => {
  const confirmFn = jest.fn().mockResolvedValue(overrides.confirmResult ?? true);
  
  return {
    ConfirmContext: createContext({ confirm: confirmFn }),
    useConfirm: () => ({ confirm: confirmFn }),
    // Exportar para assertions
    __confirmFn: confirmFn,
  };
};

export const mockConfirmContext = createConfirmContextMock();

// =============================================================================
// MOCK DE ToastContext
// =============================================================================

export const createToastContextMock = () => {
  const showFn = jest.fn();
  
  return {
    ToastContext: createContext({ show: showFn }),
    useToastContext: () => ({ show: showFn }),
    // Exportar para assertions
    __showFn: showFn,
  };
};

export const mockToastContext = createToastContextMock();

