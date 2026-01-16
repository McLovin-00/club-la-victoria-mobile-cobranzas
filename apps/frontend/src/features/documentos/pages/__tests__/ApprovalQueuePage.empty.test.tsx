/**
 * Tests para el estado vacío de ApprovalQueuePage
 */
import { render, screen } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

// Mock con lista vacía
jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetApprovalKpisQuery: () => ({ data: { pending: 0, approvedToday: 0, rejectedToday: 0, avgReviewMinutes: 0 } }),
  useGetApprovalPendingQuery: () => ({
    data: [], // Lista vacía
    isFetching: false,
    refetch: jest.fn()
  }),
}));

const { default: ApprovalQueuePage } = await import('../ApprovalQueuePage');

describe('ApprovalQueuePage - Estado Vacío', () => {
  it('debería mostrar mensaje cuando no hay documentos', () => {
    render(<ApprovalQueuePage />, { wrapper: AllProviders });
    expect(screen.getByText('No hay documentos pendientes.')).toBeInTheDocument();
  });
});
