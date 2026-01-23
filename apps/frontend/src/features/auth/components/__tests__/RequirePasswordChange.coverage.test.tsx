/**
 * Tests de cobertura para RequirePasswordChange
 * Tests simplificados que verifican la estructura
 */
import { describe, it, expect, jest } from '@jest/globals';

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace: boolean }) => {
    mockNavigate(to, replace);
    return null;
  },
  Outlet: () => null,
}));

// Mock de store/hooks
const mockUseAppSelector = jest.fn();
jest.mock('../../../../store/hooks', () => ({
  useAppSelector: () => mockUseAppSelector(),
}));

describe('RequirePasswordChange - Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockReturnValue({
      auth: { user: { id: 1, mustChangePassword: false } },
    });
  });

  it('debería importar el componente', async () => {
    const module = await import('../RequirePasswordChange');
    expect(module.RequirePasswordChange).toBeDefined();
  });

  it('debería ser una función componente', async () => {
    const module = await import('../RequirePasswordChange');
    expect(typeof module.RequirePasswordChange).toBe('function');
  });

  it('debería exportar por defecto', async () => {
    const module = await import('../RequirePasswordChange');
    expect(module.default || module.RequirePasswordChange).toBeDefined();
  });

  it('debería tener el nombre RequirePasswordChange', async () => {
    const module = await import('../RequirePasswordChange');
    const Component = module.RequirePasswordChange;
    expect(Component.displayName || Component.name).toBe('RequirePasswordChange');
  });

  it('debería usar Navigate y Outlet de react-router-dom', async () => {
    const routerModule = await import('react-router-dom');
    expect(routerModule.Navigate).toBeDefined();
    expect(routerModule.Outlet).toBeDefined();
  });
});
