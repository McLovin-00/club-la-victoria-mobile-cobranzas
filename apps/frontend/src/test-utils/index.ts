/**
 * Test Utilities para Frontend
 * 
 * Exporta helpers, wrappers y mocks para tests.
 */

// Wrappers para renderizar componentes con providers
export * from './testWrappers';

// Datos mock para tests
export * from './mockApiResponses';

// Mocks modulares (usar selectivamente)
export * from './mocks';

// Re-exportar testing-library para conveniencia
export { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

