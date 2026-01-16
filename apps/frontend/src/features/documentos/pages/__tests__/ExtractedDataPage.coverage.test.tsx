/**
 * Coverage test para ExtractedDataPage
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetExtractedDataListQuery: () => ({
    data: {
      data: [
        { id: 1, entityType: 'CHOFER', entityId: '123', fieldName: 'nombre', extractedValue: 'Juan' },
      ],
      pagination: { total: 1 }
    },
    isFetching: false,
  }),
  useUpdateEntityExtractedDataMutation: () => [jest.fn(), { isLoading: false }],
  useDeleteEntityExtractedDataMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: ExtractedDataPage } = await import('../ExtractedDataPage');

describe('ExtractedDataPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(ExtractedDataPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<ExtractedDataPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Datos Extraídos/i)).toBeInTheDocument();
    });
  });
});
