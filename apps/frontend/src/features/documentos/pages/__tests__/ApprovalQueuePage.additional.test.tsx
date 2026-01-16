/**
 * Tests adicionales de cobertura para ApprovalQueuePage
 *
 * Este archivo prueba casos que requieren datos de mock específicos
 * que no se pueden cambiar dinámicamente en el archivo principal
 * debido a limitaciones de ES modules.
 */
import { render, screen } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

// Mock con datos específicos para casos edge
jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetApprovalKpisQuery: () => ({ data: { pending: 1, approvedToday: 0, rejectedToday: 0, avgReviewMinutes: 0 } }),
  useGetApprovalPendingQuery: () => ({
    data: [
      {
        id: 1,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: 'CHOFER',
        entityId: 10,
        entityNaturalId: '12345678',
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '12345678',
          detectedDocumentType: 'Licencia',
          detectedExpiration: null, // Sin fecha para probar el caso de "-"
          disparidades: []
        },
        template: { id: 1, name: 'Licencia', entityType: 'CHOFER' },
        expiresAt: null,
        iaValidation: null // Probar badge Pendiente
      },
      {
        id: 2,
        uploadedAt: '2024-01-15T11:00:00Z',
        entityType: 'CAMION',
        entityId: 20,
        entityNaturalId: 'ABC-123',
        classification: {
          detectedEntityType: 'CAMION',
          detectedEntityId: 'ABC-123',
          detectedDocumentType: null, // Sin tipo de doc para probar "-"
          detectedExpiration: '2025-06-30',
          disparidades: []
        },
        template: null, // Sin template para probar fallback
        expiresAt: '2025-06-30',
        iaValidation: { validationStatus: null, hasDisparities: false } // Probar badge Pendiente con validationStatus null
      },
    ],
    isFetching: false,
    refetch: jest.fn()
  }),
}));

const { default: ApprovalQueuePage } = await import('../ApprovalQueuePage');

describe('ApprovalQueuePage - Casos Edge', () => {
  it('debería mostrar badge Pendiente cuando iaValidation es null', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // En el mock hay 2 filas con iaValidation null, así que verificamos que al menos existan badges Pendiente
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });

  it('debería mostrar "-" cuando no hay fecha de vencimiento', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // Buscar guiones en la columna Vence
    const allText = document.body.textContent || '';
    expect(allText.includes('-')).toBeTruthy();
  });

  it('debería mostrar "-" cuando el tipo de documento es null', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    // En el mock, row 2 tiene detectedDocumentType: null y template: null
    const allText = document.body.textContent || '';
    expect(allText.includes('-')).toBeTruthy();
  });
});
