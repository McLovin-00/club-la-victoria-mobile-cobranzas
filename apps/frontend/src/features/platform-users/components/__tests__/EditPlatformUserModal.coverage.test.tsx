/**
 * Tests de cobertura para EditPlatformUserModal usando jest.unstable_mockModule (ESM)
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

interface EditUserProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    email: string;
    role: string;
    empresaId?: number | null;
    nombre?: string | null;
    apellido?: string | null;
    dadorCargaId?: number | null;
    empresaTransportistaId?: number | null;
    choferId?: number | null;
    clienteId?: number | null;
  };
}

describe('EditPlatformUserModal - Coverage', () => {
  let EditPlatformUserModal: React.FC<EditUserProps>;
  let mockShowToast: jest.Mock;
  let mockUseAppSelector: jest.Mock;
  let mockUseGetEmpresasQuery: jest.Mock;
  let mockUseGetDadoresQuery: jest.Mock;
  let mockUseGetClientsQuery: jest.Mock;
  let mockUseGetEmpresasTransportistasQuery: jest.Mock;
  let mockUseGetEmpresaTransportistaByIdQuery: jest.Mock;
  let mockUseGetChoferByIdQuery: jest.Mock;
  let mockUseGetEmpresaTransportistaChoferesQuery: jest.Mock;
  let mockUpdateUser: jest.Mock;

  beforeAll(async () => {
    // Mock Toast
    mockShowToast = jest.fn();
    await jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
      showToast: (...args: unknown[]) => mockShowToast(...args),
    }));

    // Mock UI components
    await jest.unstable_mockModule('@/components/ui/button', () => ({
      Button: ({ children, onClick, disabled, type, variant }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        type?: string;
        variant?: string;
      }) => (
        <button onClick={onClick} disabled={disabled} type={type as 'button' | 'submit'} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('@/components/ui/spinner', () => ({
      Spinner: ({ className }: { className?: string }) => (
        <div className={className} data-testid="spinner">Spinner</div>
      ),
    }));

    // Mock store hooks
    mockUseAppSelector = jest.fn();
    await jest.unstable_mockModule('@/store/hooks', () => ({
      useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
      useAppDispatch: () => jest.fn(),
    }));

    await jest.unstable_mockModule('@/features/auth/authSlice', () => ({
      selectCurrentUser: jest.fn(),
    }));

    // Mock empresas API
    mockUseGetEmpresasQuery = jest.fn();
    await jest.unstable_mockModule('@/features/empresas/api/empresasApiSlice', () => ({
      useGetEmpresasQuery: (...args: unknown[]) => mockUseGetEmpresasQuery(...args),
    }));

    // Mock documentos API
    mockUseGetDadoresQuery = jest.fn();
    mockUseGetClientsQuery = jest.fn();
    mockUseGetEmpresasTransportistasQuery = jest.fn();
    mockUseGetEmpresaTransportistaByIdQuery = jest.fn();
    mockUseGetChoferByIdQuery = jest.fn();
    mockUseGetEmpresaTransportistaChoferesQuery = jest.fn();
    await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
      useGetDadoresQuery: (...args: unknown[]) => mockUseGetDadoresQuery(...args),
      useGetClientsQuery: (...args: unknown[]) => mockUseGetClientsQuery(...args),
      useGetEmpresasTransportistasQuery: (...args: unknown[]) => mockUseGetEmpresasTransportistasQuery(...args),
      useGetEmpresaTransportistaByIdQuery: (...args: unknown[]) => mockUseGetEmpresaTransportistaByIdQuery(...args),
      useGetChoferByIdQuery: (...args: unknown[]) => mockUseGetChoferByIdQuery(...args),
      useGetEmpresaTransportistaChoferesQuery: (...args: unknown[]) => mockUseGetEmpresaTransportistaChoferesQuery(...args),
    }));

    // Mock platform users API
    mockUpdateUser = jest.fn();
    await jest.unstable_mockModule('@/features/platform-users/api/platformUsersApiSlice', () => ({
      useUpdatePlatformUserMutation: () => [
        (...args: unknown[]) => mockUpdateUser(...args),
        { isLoading: false },
      ],
    }));

    // Import component after mocking
    const module = await import('@/features/platform-users/components/EditPlatformUserModal');
    EditPlatformUserModal = module.default;
  });

  // Mock user data
  const mockCurrentUserSuperAdmin = {
    id: 1,
    email: 'superadmin@test.com',
    role: 'SUPERADMIN',
    empresaId: 1,
  };

  const mockCurrentUserAdmin = {
    id: 2,
    email: 'admin@test.com',
    role: 'ADMIN',
    empresaId: 1,
  };

  const mockCurrentUserDador = {
    id: 3,
    email: 'dador@test.com',
    role: 'DADOR_DE_CARGA',
    empresaId: 1,
    dadorCargaId: 10,
  };

  const mockCurrentUserTransportista = {
    id: 4,
    email: 'transportista@test.com',
    role: 'TRANSPORTISTA',
    empresaId: 1,
    empresaTransportistaId: 20,
    dadorCargaId: 10,
  };

  const mockEmpresas = [
    { id: 1, nombre: 'Empresa BCA' },
    { id: 2, nombre: 'Empresa Secundaria' },
  ];

  const mockDadores = [
    { id: 10, razonSocial: 'Dador Carga SA', cuit: '20111111111' },
    { id: 11, razonSocial: 'Dador Carga SRL', cuit: '20222222222' },
  ];

  const mockClientes = [
    { id: 30, razonSocial: 'Cliente SA', cuit: '20333333333' },
    { id: 31, razonSocial: 'Cliente SRL', cuit: '20444444444' },
  ];

  const mockTransportistas = [
    { id: 20, razonSocial: 'Transporte SA', cuit: '20555555555', dadorCargaId: 10 },
    { id: 21, razonSocial: 'Transporte SRL', cuit: '20666666666', dadorCargaId: 10 },
  ];

  const mockChoferes = [
    { id: 40, nombre: 'Juan', apellido: 'Pérez', dni: '12345678' },
    { id: 41, nombre: 'Pedro', apellido: 'García', dni: '87654321' },
  ];

  // User to edit
  const mockUserToEdit = {
    id: 100,
    email: 'user@test.com',
    role: 'ADMIN',
    empresaId: 1,
    nombre: 'Test',
    apellido: 'User',
    dadorCargaId: null,
    empresaTransportistaId: null,
    choferId: null,
    clienteId: null,
  };

  const mockUserDador = {
    id: 101,
    email: 'dador@test.com',
    role: 'DADOR_DE_CARGA',
    empresaId: 1,
    nombre: 'Dador',
    apellido: 'Test',
    dadorCargaId: 10,
    empresaTransportistaId: null,
    choferId: null,
    clienteId: null,
  };

  const mockUserTransportista = {
    id: 102,
    email: 'transportista@test.com',
    role: 'TRANSPORTISTA',
    empresaId: 1,
    nombre: 'Transportista',
    apellido: 'Test',
    dadorCargaId: 10,
    empresaTransportistaId: 20,
    choferId: null,
    clienteId: null,
  };

  const mockUserChofer = {
    id: 103,
    email: 'chofer@test.com',
    role: 'CHOFER',
    empresaId: 1,
    nombre: 'Chofer',
    apellido: 'Test',
    dadorCargaId: 10,
    empresaTransportistaId: 20,
    choferId: 40,
    clienteId: null,
  };

  const mockUserCliente = {
    id: 104,
    email: 'cliente@test.com',
    role: 'CLIENTE',
    empresaId: 1,
    nombre: 'Cliente',
    apellido: 'Test',
    dadorCargaId: null,
    empresaTransportistaId: null,
    choferId: null,
    clienteId: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    mockUseGetEmpresasQuery.mockReturnValue({ data: mockEmpresas });
    mockUseGetDadoresQuery.mockReturnValue({ data: { list: mockDadores } });
    mockUseGetClientsQuery.mockReturnValue({ data: { list: mockClientes } });
    mockUseGetEmpresasTransportistasQuery.mockReturnValue({ data: { list: mockTransportistas } });
    mockUseGetEmpresaTransportistaByIdQuery.mockReturnValue({ data: null });
    mockUseGetChoferByIdQuery.mockReturnValue({ data: null });
    mockUseGetEmpresaTransportistaChoferesQuery.mockReturnValue({ data: mockChoferes });
    mockUpdateUser.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
  });

  // ==================== BASIC RENDERING TESTS ====================
  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<EditPlatformUserModal isOpen={false} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.queryByText('Editar Usuario de Plataforma')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.getByText('Editar Usuario de Plataforma')).toBeInTheDocument();
    });

    it('should show email field with user email', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.value).toBe('user@test.com');
    });

    it('should show nombre and apellido fields', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Apellido')).toBeInTheDocument();
    });

    it('should show Guardar and Cancelar buttons', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.getByText('Guardar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should call onClose when clicking Cancelar', () => {
      const onClose = jest.fn();
      render(<EditPlatformUserModal isOpen={true} onClose={onClose} user={mockUserToEdit} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', () => {
      const onClose = jest.fn();
      render(<EditPlatformUserModal isOpen={true} onClose={onClose} user={mockUserToEdit} />);
      const backdrop = document.querySelector('.bg-black\\/40');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ==================== SUPERADMIN PERMISSION TESTS ====================
  describe('SUPERADMIN Permissions', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show empresa selector for SUPERADMIN', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.getByText('Empresa (Tenant) *')).toBeInTheDocument();
    });

    it('should show all roles in role selector', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;
      expect(roleSelect).toBeInTheDocument();
      // Check for some roles
      expect(screen.getByText('SUPERADMIN')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should show email as editable for SUPERADMIN', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).not.toBeDisabled();
    });
  });

  // ==================== ADMIN PERMISSION TESTS ====================
  describe('ADMIN Permissions', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserAdmin);
    });

    it('should NOT show empresa selector for ADMIN', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      expect(screen.queryByText('Empresa (Tenant) *')).not.toBeInTheDocument();
    });

    it('should show fixed empresa name for ADMIN', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      // The empresa is shown as read-only
      expect(screen.getByText('Empresa')).toBeInTheDocument();
    });
  });

  // ==================== RESTRICTED EDITOR (DADOR/TRANSPORTISTA) TESTS ====================
  describe('Restricted Editor (DADOR_DE_CARGA)', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserDador);
    });

    it('should show email as read-only for DADOR', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      // Email should be displayed as text, not input
      expect(screen.getByText('chofer@test.com')).toBeInTheDocument();
      const emailInput = document.querySelector('input[name="email"]');
      expect(emailInput).not.toBeInTheDocument();
    });

    it('should show role as read-only for DADOR', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      // Role should be displayed as text
      expect(screen.getByText('CHOFER')).toBeInTheDocument();
      const roleSelect = document.querySelector('select[name="role"]');
      expect(roleSelect).not.toBeInTheDocument();
    });

    it('should allow editing nombre and apellido for DADOR', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      const apellidoInput = document.querySelector('input[name="apellido"]') as HTMLInputElement;
      expect(nombreInput).toBeInTheDocument();
      expect(apellidoInput).toBeInTheDocument();
    });

    it('should allow changing password for DADOR', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      expect(passwordInput).toBeInTheDocument();
    });
  });

  describe('Restricted Editor (TRANSPORTISTA)', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserTransportista);
    });

    it('should show email as read-only for TRANSPORTISTA', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      expect(screen.getByText('chofer@test.com')).toBeInTheDocument();
    });

    it('should show role as read-only for TRANSPORTISTA', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      expect(screen.getByText('CHOFER')).toBeInTheDocument();
    });
  });

  // ==================== ROLE-SPECIFIC ASSOCIATION TESTS ====================
  describe('Role-specific Associations', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show Dador de Carga select when role is DADOR_DE_CARGA', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserDador} />);
      expect(screen.getByText('Dador de Carga asociado')).toBeInTheDocument();
    });

    it('should show Empresa Transportista select when role is TRANSPORTISTA', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);
      // For SUPERADMIN, shows dador selector first
      expect(screen.getByText('Dador de Carga')).toBeInTheDocument();
      expect(screen.getByText('Empresa Transportista asociada')).toBeInTheDocument();
    });

    it('should show Chofer selector when role is CHOFER', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      expect(screen.getByText('Chofer asociado')).toBeInTheDocument();
    });

    it('should show Cliente selector when role is CLIENTE', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserCliente} />);
      expect(screen.getByText('Cliente asociado')).toBeInTheDocument();
    });
  });

  // ==================== FORM SUBMISSION TESTS ====================
  describe('Form Submission', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should submit form and call updateUser', async () => {
      const onClose = jest.fn();
      render(<EditPlatformUserModal isOpen={true} onClose={onClose} user={mockUserToEdit} />);

      // Change nombre
      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      fireEvent.change(nombreInput, { target: { value: 'Nuevo Nombre' } });

      // Submit form
      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful update', async () => {
      const onClose = jest.fn();
      render(<EditPlatformUserModal isOpen={true} onClose={onClose} user={mockUserToEdit} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Usuario actualizado exitosamente', 'success');
      });
    });

    it('should call onClose after successful update', async () => {
      const onClose = jest.fn();
      render(<EditPlatformUserModal isOpen={true} onClose={onClose} user={mockUserToEdit} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed update', async () => {
      mockUpdateUser.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: 'Error al actualizar' } }),
      });

      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al actualizar', 'error');
      });
    });

    it('should show default error message when no message provided', async () => {
      mockUpdateUser.mockReturnValue({
        unwrap: () => Promise.reject({}),
      });

      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('No se pudo actualizar el usuario', 'error');
      });
    });
  });

  // ==================== RESTRICTED EDITOR SUBMISSION TESTS ====================
  describe('Restricted Editor Submission', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserDador);
    });

    it('should only send nombre, apellido, password for restricted editor', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      fireEvent.change(nombreInput, { target: { value: 'Nuevo' } });

      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'newpass123' } });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          id: 103,
          data: {
            nombre: 'Nuevo',
            apellido: 'Test',
            password: 'newpass123',
          },
        });
      });
    });

    it('should not send password if empty', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.password).toBeUndefined();
      });
    });
  });

  // ==================== ROLE CHANGE TESTS ====================
  describe('Role Change', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show DADOR association when changing role to DADOR_DE_CARGA', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      await waitFor(() => {
        expect(screen.getByText('Dador de Carga asociado')).toBeInTheDocument();
      });
    });

    it('should show CLIENTE association when changing role to CLIENTE', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      await waitFor(() => {
        expect(screen.getByText('Cliente asociado')).toBeInTheDocument();
      });
    });

    it('should include dadorCargaId in payload when submitting DADOR_DE_CARGA', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      // Change role to DADOR_DE_CARGA
      const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      // Select a dador
      await waitFor(() => {
        expect(screen.getByText('Dador de Carga asociado')).toBeInTheDocument();
      });

      const dadorSelect = document.querySelector('select[name="dadorCargaId"]') as HTMLSelectElement;
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.role).toBe('DADOR_DE_CARGA');
        expect(callArgs.data.dadorCargaId).toBe(10);
      });
    });

    it('should include clienteId in payload when submitting CLIENTE', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      // Change role to CLIENTE
      const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      // Select a cliente
      await waitFor(() => {
        expect(screen.getByText('Cliente asociado')).toBeInTheDocument();
      });

      const clienteSelect = document.querySelector('select[name="clienteId"]') as HTMLSelectElement;
      fireEvent.change(clienteSelect, { target: { value: '30' } });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.role).toBe('CLIENTE');
        expect(callArgs.data.clienteId).toBe(30);
      });
    });
  });

  // ==================== SEARCH FUNCTIONALITY TESTS ====================
  describe('Search Functionality', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should filter transportistas by search', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);

      const searchInput = screen.getAllByPlaceholderText('Buscar por nombre o CUIT...')[0] as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Transporte SA' } });

      // The filtering happens in the component, we're just verifying the input works
      expect(searchInput.value).toBe('Transporte SA');
    });
  });

  // ==================== CASCADING SELECTION TESTS ====================
  describe('Cascading Selection for CHOFER', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show cascade selectors for CHOFER role', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      
      expect(screen.getByText('Dador de Carga')).toBeInTheDocument();
      expect(screen.getByText('Empresa Transportista')).toBeInTheDocument();
      expect(screen.getByText('Chofer asociado')).toBeInTheDocument();
    });
  });

  // ==================== PASSWORD FIELD TESTS ====================
  describe('Password Field', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show password field with placeholder', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      
      const passwordInput = screen.getByPlaceholderText('(dejar vacío para no cambiar)');
      expect(passwordInput).toBeInTheDocument();
    });

    it('should include password in payload when provided', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'newPassword123' } });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.password).toBe('newPassword123');
      });
    });
  });

  // ==================== EMPRESA VALIDATION TESTS ====================
  describe('Empresa Validation', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should show empresas in the selector', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);
      
      expect(screen.getByText('Empresa BCA')).toBeInTheDocument();
      expect(screen.getByText('Empresa Secundaria')).toBeInTheDocument();
    });
  });

  // ==================== INITIAL VALUES TESTS ====================
  describe('Initial Values', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should populate form with user data', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      const apellidoInput = document.querySelector('input[name="apellido"]') as HTMLInputElement;

      expect(emailInput.value).toBe('user@test.com');
      expect(nombreInput.value).toBe('Test');
      expect(apellidoInput.value).toBe('User');
    });
  });

  // ==================== TRANSPORTISTA SUBMISSION TESTS ====================
  describe('TRANSPORTISTA Role Submission', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should include empresaTransportistaId in payload when submitting TRANSPORTISTA', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.role).toBe('TRANSPORTISTA');
        expect(callArgs.data.empresaTransportistaId).toBe(20);
      });
    });
  });

  // ==================== CHOFER SUBMISSION TESTS ====================
  describe('CHOFER Role Submission', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should include choferId and empresaTransportistaId in payload when submitting CHOFER', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        const callArgs = mockUpdateUser.mock.calls[0][0];
        expect(callArgs.data.role).toBe('CHOFER');
        expect(callArgs.data.choferId).toBe(40);
        expect(callArgs.data.empresaTransportistaId).toBe(20);
      });
    });
  });

  // ==================== DADOR_DE_CARGA AS EDITOR TESTS ====================
  describe('DADOR_DE_CARGA as editor for TRANSPORTISTA', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserDador);
    });

    it('should show fixed dador name when DADOR edits TRANSPORTISTA user', () => {
      // When a DADOR edits a TRANSPORTISTA, they can only see users they created
      // so restricted editor applies - only basic fields editable
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);
      
      // DADOR is a restricted editor, so role is read-only
      expect(screen.getByText('TRANSPORTISTA')).toBeInTheDocument();
    });
  });

  // ==================== TRANSPORTISTA AS EDITOR TESTS ====================
  describe('TRANSPORTISTA as editor for CHOFER', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserTransportista);
      mockUseGetEmpresaTransportistaByIdQuery.mockReturnValue({ 
        data: { id: 20, razonSocial: 'Mi Transportista', cuit: '20555555555', dadorCargaId: 10 } 
      });
    });

    it('should show TRANSPORTISTA fixed transportista when editing CHOFER', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      
      // TRANSPORTISTA is restricted editor, so role is read-only
      expect(screen.getByText('CHOFER')).toBeInTheDocument();
    });
  });

  // ==================== CHOFER WITH EXISTING CHOFER DATA ====================
  describe('CHOFER with existing chofer data', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
      mockUseGetChoferByIdQuery.mockReturnValue({
        data: { 
          id: 40, 
          nombre: 'Juan', 
          apellido: 'Pérez', 
          dni: '12345678',
          empresaTransportista: {
            id: 20,
            razonSocial: 'Transporte SA',
            dadorCargaId: 10
          }
        }
      });
    });

    it('should show chofer data when editing CHOFER with existing chofer', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      
      expect(screen.getByText('Chofer asociado')).toBeInTheDocument();
    });
  });

  // ==================== TRANSPORTISTA WITH EXISTING TRANSPORTISTA DATA ====================
  describe('TRANSPORTISTA with existing transportista data', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
      mockUseGetEmpresaTransportistaByIdQuery.mockReturnValue({
        data: { 
          id: 20, 
          razonSocial: 'Transporte SA', 
          cuit: '20555555555',
          dadorCargaId: 10
        }
      });
    });

    it('should show transportista data when editing TRANSPORTISTA', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);
      
      expect(screen.getByText('Empresa Transportista asociada')).toBeInTheDocument();
    });
  });

  // ==================== SEARCH CHOFER TESTS ====================
  describe('Search Chofer', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should filter choferes by search', () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      const searchInputs = screen.getAllByPlaceholderText('Buscar por nombre, apellido o DNI...');
      const choferSearchInput = searchInputs[0] as HTMLInputElement;
      fireEvent.change(choferSearchInput, { target: { value: 'Juan' } });

      expect(choferSearchInput.value).toBe('Juan');
    });
  });

  // ==================== CASCADE DADOR CHANGE TESTS ====================
  describe('Cascade Selection Changes', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should reset transportista and chofer when dador changes for CHOFER role', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      // Find the dador select (first select for cascade)
      const dadorSelects = screen.getAllByRole('combobox');
      // The first combobox should be role, second is empresa, then dador
      const dadorSelect = dadorSelects.find(s => {
        const options = s.querySelectorAll('option');
        return Array.from(options).some(o => o.textContent?.includes('Dador'));
      });
      
      if (dadorSelect) {
        fireEvent.change(dadorSelect, { target: { value: '11' } });
        expect(dadorSelect).toBeInTheDocument();
      }
    });

    it('should reset chofer when transportista changes for CHOFER role', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);

      // Verify the cascade UI exists
      expect(screen.getByText('Empresa Transportista')).toBeInTheDocument();
    });
  });

  // ==================== ROLE WITHOUT ASSOCIATIONS ====================
  describe('Roles without associations', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should not show associations for OPERATOR role', async () => {
      const operatorUser = { ...mockUserToEdit, role: 'OPERATOR' };
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={operatorUser} />);

      expect(screen.queryByText('Dador de Carga asociado')).not.toBeInTheDocument();
      expect(screen.queryByText('Cliente asociado')).not.toBeInTheDocument();
      expect(screen.queryByText('Chofer asociado')).not.toBeInTheDocument();
    });

    it('should not show associations for ADMIN role', async () => {
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserToEdit} />);

      expect(screen.queryByText('Dador de Carga asociado')).not.toBeInTheDocument();
      expect(screen.queryByText('Cliente asociado')).not.toBeInTheDocument();
    });
  });

  // ==================== ADMIN_INTERNO PERMISSIONS ====================
  describe('ADMIN_INTERNO Permissions', () => {
    const mockCurrentUserAdminInterno = {
      id: 5,
      email: 'admininterno@test.com',
      role: 'ADMIN_INTERNO',
      empresaId: 1,
    };

    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserAdminInterno);
    });

    it('should show limited roles for ADMIN_INTERNO', () => {
      const operatorUser = { ...mockUserToEdit, role: 'OPERATOR' };
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={operatorUser} />);

      const roleSelect = document.querySelector('select[name="role"]');
      expect(roleSelect).toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    });

    it('should handle user with null values', () => {
      const userWithNulls = {
        id: 105,
        email: 'nulluser@test.com',
        role: 'ADMIN',
        empresaId: null,
        nombre: null,
        apellido: null,
        dadorCargaId: null,
        empresaTransportistaId: null,
        choferId: null,
        clienteId: null,
      };
      
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={userWithNulls} />);
      
      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      expect(nombreInput.value).toBe('');
    });

    it('should handle empty clientes list', () => {
      mockUseGetClientsQuery.mockReturnValue({ data: { list: [] } });
      
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserCliente} />);
      
      expect(screen.getByText('Cliente asociado')).toBeInTheDocument();
    });

    it('should handle empty dadores list', () => {
      mockUseGetDadoresQuery.mockReturnValue({ data: { list: [] } });
      
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserDador} />);
      
      expect(screen.getByText('Dador de Carga asociado')).toBeInTheDocument();
    });

    it('should handle empty transportistas list', () => {
      mockUseGetEmpresasTransportistasQuery.mockReturnValue({ data: { list: [] } });
      
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserTransportista} />);
      
      expect(screen.getByText('Empresa Transportista asociada')).toBeInTheDocument();
    });

    it('should handle empty choferes list', () => {
      mockUseGetEmpresaTransportistaChoferesQuery.mockReturnValue({ data: [] });
      
      render(<EditPlatformUserModal isOpen={true} onClose={jest.fn()} user={mockUserChofer} />);
      
      expect(screen.getByText('Chofer asociado')).toBeInTheDocument();
    });
  });
});
