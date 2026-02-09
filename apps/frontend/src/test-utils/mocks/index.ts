/**
 * Mocks modulares para tests del Frontend
 * 
 * Uso:
 * ```ts
 * import { mockStore, mockDocumentosApi } from '@/test-utils/mocks';
 * 
 * // En el test:
 * jest.mock('@/store/store', () => mockStore);
 * jest.mock('@/features/documentos/api/documentosApiSlice', () => mockDocumentosApi);
 * ```
 * 
 * NOTA: Estos mocks son helpers opcionales. Los tests deben preferir
 * ejecutar código real cuando sea posible.
 */

export * from './store.mock';
export * from './api.mocks';
export * from './hooks.mocks';
export * from './contexts.mocks';
export * from './services.mocks';

