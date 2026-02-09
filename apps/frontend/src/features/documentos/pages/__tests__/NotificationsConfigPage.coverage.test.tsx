/**
 * Coverage test para NotificationsConfigPage
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetNotificationsConfigQuery: () => ({
    data: { enabled: false, apiKey: '', url: '' },
    isFetching: false,
  }),
  useUpdateNotificationsConfigMutation: () => [jest.fn(), { isLoading: false }],
}));

const { default: NotificationsConfigPage } = await import('../NotificationsConfigPage');

describe('NotificationsConfigPage - Coverage', () => {
  it('debería importar el componente', async () => {
    expect(NotificationsConfigPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<NotificationsConfigPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText(/Notificaciones/i)).toBeInTheDocument();
    });
  });
});
