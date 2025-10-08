import { render, screen } from '@testing-library/react';
import ApprovalQueuePage from '../ApprovalQueuePage';

jest.mock('../../api/documentosApiSlice', () => ({
  useGetApprovalKpisQuery: () => ({ data: { pending: 3, approvedToday: 5, rejectedToday: 1, avgReviewMinutes: 7 } }),
  useGetApprovalPendingQuery: () => ({ data: [
    { id: 1, uploadedAt: new Date().toISOString(), classification: { detectedEntityType: 'CHOFER', detectedEntityId: 10, detectedDocumentType: 'Licencia', confidence: 0.92 } },
  ], isFetching: false, refetch: jest.fn() }),
}));

describe('ApprovalQueuePage', () => {
  it('renders KPIs and list', () => {
    render(<ApprovalQueuePage />);
    expect(screen.getByText('Aprobación de Documentos')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Aprobados hoy')).toBeInTheDocument();
    expect(screen.getByText('Rechazados hoy')).toBeInTheDocument();
    expect(screen.getByText('T. medio revisión (m)')).toBeInTheDocument();
    expect(screen.getByText('CHOFER')).toBeInTheDocument();
    expect(screen.getByText('Licencia')).toBeInTheDocument();
  });
});


