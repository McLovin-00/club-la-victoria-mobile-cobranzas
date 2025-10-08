import { render, screen } from '@testing-library/react';
import ApprovalDetailPage from '../ApprovalDetailPage';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../api/documentosApiSlice', () => ({
  useGetApprovalPendingByIdQuery: () => ({ data: { id: 1, uploadedAt: new Date().toISOString(), classification: { detectedEntityType: 'CHOFER', detectedEntityId: 10, detectedDocumentType: 'Licencia', confidence: 0.9 }, previewUrl: 'about:blank' }, isFetching: false }),
  useApprovePendingDocumentMutation: () => [jest.fn(), { isLoading: false }],
  useRejectPendingDocumentMutation: () => [jest.fn(), { isLoading: false }],
}));

describe('ApprovalDetailPage', () => {
  it('shows preview and classification metadata', () => {
    render(<ApprovalDetailPage />);
    expect(screen.getByText(/Revisión de Documento/i)).toBeInTheDocument();
    expect(screen.getByText('Entidad detectada')).toBeInTheDocument();
    expect(screen.getByText('Identidad detectada')).toBeInTheDocument();
    expect(screen.getByText('Tipo documento')).toBeInTheDocument();
  });
});


