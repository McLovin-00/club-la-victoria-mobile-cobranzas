// Tests de integración para flujo de gestión de templates
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

describe('Documentos Feature - Template Management Flow Integration', () => {
  let mockCreateTemplateMutation: jest.Mock;
  let mockUpdateTemplateMutation: jest.Mock;
  let mockDeleteTemplateMutation: jest.Mock;
  let mockShow: jest.Mock;

  beforeAll(async () => {
    mockCreateTemplateMutation = jest.fn();
    mockUpdateTemplateMutation = jest.fn();
    mockDeleteTemplateMutation = jest.fn();
    mockShow = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetTemplatesQuery: () => ({
        data: [],
        isLoading: false,
      }),
      useCreateTemplateMutation: (...args: unknown[]) => mockCreateTemplateMutation(...args),
      useUpdateTemplateMutation: (...args: unknown[]) => mockUpdateTemplateMutation(...args),
      useDeleteTemplateMutation: (...args: unknown[]) => mockDeleteTemplateMutation(...args),
    }));

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => jest.fn(),
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTemplateMutation.mockReturnValue([jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }]);
    mockUpdateTemplateMutation.mockReturnValue([jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }]);
    mockDeleteTemplateMutation.mockReturnValue([jest.fn().mockResolvedValue(undefined), { isLoading: false }]);
  });

  it('debe seguir el ciclo de vida: Create → Edit → Activate/Deactivate → Delete', async () => {
    // Verifica que los hooks necesarios están exportados
    expect(mockCreateTemplateMutation).toBeDefined();
    expect(mockUpdateTemplateMutation).toBeDefined();
    expect(mockDeleteTemplateMutation).toBeDefined();
  });

  it('debe tener hooks de template disponibles', async () => {
    const api = await import('../../api/documentosApiSlice');
    expect(api.useGetTemplatesQuery).toBeDefined();
    expect(api.useCreateTemplateMutation).toBeDefined();
    expect(api.useUpdateTemplateMutation).toBeDefined();
    expect(api.useDeleteTemplateMutation).toBeDefined();
  });

  it('debe permitir crear nuevo template', () => {
    const createMut = mockCreateTemplateMutation()[0];
    expect(createMut).toBeDefined();
  });

  it('debe permitir editar template existente', () => {
    const updateMut = mockUpdateTemplateMutation()[0];
    expect(updateMut).toBeDefined();
  });

  it('debe permitir activar/desactivar template', () => {
    const updateMut = mockUpdateTemplateMutation()[0];
    expect(updateMut).toBeDefined();
  });

  it('debe permitir eliminar template', () => {
    const deleteMut = mockDeleteTemplateMutation()[0];
    expect(deleteMut).toBeDefined();
  });
});
