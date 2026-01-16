/**
 * Coverage test para EvolutionConfigPage
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetEvolutionConfigQuery: () => ({
    data: { enabled: false, apiKey: '' },
    isFetching: false,
  }),
  useUpdateEvolutionConfigMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: EvolutionConfigPage } = await import('../EvolutionConfigPage');

describe('EvolutionConfigPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(EvolutionConfigPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<EvolutionConfigPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Evolution/i)).toBeInTheDocument();
    });
  });
});
