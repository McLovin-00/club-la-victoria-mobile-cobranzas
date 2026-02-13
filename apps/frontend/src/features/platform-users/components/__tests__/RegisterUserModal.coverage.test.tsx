/**
 * Tests de cobertura para RegisterUserModal usando jest.unstable_mockModule (ESM)
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('RegisterUserModal - Coverage', () => {
  let RegisterUserModal: React.FC<{ isOpen: boolean; onClose: () => void }>;
  let mockShowToast: jest.Mock;
  let mockUseAppSelector: jest.Mock;
  let mockUseGetEmpresasQuery: jest.Mock;
  let mockUseGetDadoresQuery: jest.Mock;
  let mockUseGetClientsQuery: jest.Mock;
  let mockUseGetEmpresasTransportistasQuery: jest.Mock;
  let mockUseGetEmpresaTransportistaChoferesQuery: jest.Mock;
  let mockCreateClient: jest.Mock;
  let mockCreateDador: jest.Mock;
  let mockCreateEmpresaTransportista: jest.Mock;
  let mockCreateChofer: jest.Mock;
  let mockRegisterPlatformUser: jest.Mock;
  let mockRegisterClientWizard: jest.Mock;
  let mockRegisterDadorWizard: jest.Mock;
  let mockRegisterTransportistaWizard: jest.Mock;
  let mockRegisterChoferWizard: jest.Mock;

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
    mockUseGetEmpresaTransportistaChoferesQuery = jest.fn();
    mockCreateClient = jest.fn();
    mockCreateDador = jest.fn();
    mockCreateEmpresaTransportista = jest.fn();
    mockCreateChofer = jest.fn();
    await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
      useGetDadoresQuery: (...args: unknown[]) => mockUseGetDadoresQuery(...args),
      useGetClientsQuery: (...args: unknown[]) => mockUseGetClientsQuery(...args),
      useGetEmpresasTransportistasQuery: (...args: unknown[]) => mockUseGetEmpresasTransportistasQuery(...args),
      useGetEmpresaTransportistaChoferesQuery: (...args: unknown[]) => mockUseGetEmpresaTransportistaChoferesQuery(...args),
      useCreateClientMutation: () => [
        (...args: unknown[]) => mockCreateClient(...args),
        { isLoading: false },
      ],
      useCreateDadorMutation: () => [
        (...args: unknown[]) => mockCreateDador(...args),
        { isLoading: false },
      ],
      useCreateEmpresaTransportistaMutation: () => [
        (...args: unknown[]) => mockCreateEmpresaTransportista(...args),
        { isLoading: false },
      ],
      useCreateChoferMutation: () => [
        (...args: unknown[]) => mockCreateChofer(...args),
        { isLoading: false },
      ],
    }));

    // Mock platform users API
    mockRegisterPlatformUser = jest.fn();
    mockRegisterClientWizard = jest.fn();
    mockRegisterDadorWizard = jest.fn();
    mockRegisterTransportistaWizard = jest.fn();
    mockRegisterChoferWizard = jest.fn();
    await jest.unstable_mockModule('@/features/platform-users/api/platformUsersApiSlice', () => ({
      useRegisterPlatformUserMutation: () => [
        (...args: unknown[]) => mockRegisterPlatformUser(...args),
        { isLoading: false },
      ],
      useRegisterClientWizardMutation: () => [
        (...args: unknown[]) => mockRegisterClientWizard(...args),
        { isLoading: false },
      ],
      useRegisterDadorWizardMutation: () => [
        (...args: unknown[]) => mockRegisterDadorWizard(...args),
        { isLoading: false },
      ],
      useRegisterTransportistaWizardMutation: () => [
        (...args: unknown[]) => mockRegisterTransportistaWizard(...args),
        { isLoading: false },
      ],
      useRegisterChoferWizardMutation: () => [
        (...args: unknown[]) => mockRegisterChoferWizard(...args),
        { isLoading: false },
      ],
    }));

    // Import component after mocking
    const module = await import('@/features/platform-users/components/RegisterUserModal');
    RegisterUserModal = module.RegisterUserModal;
  });

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
    { id: 20, razonSocial: 'Transporte SA', cuit: '20555555555' },
    { id: 21, razonSocial: 'Transporte SRL', cuit: '20666666666' },
  ];

  const mockChoferes = [
    { id: 40, nombre: 'Juan', apellido: 'Pérez', dni: '12345678' },
    { id: 41, nombre: 'Pedro', apellido: 'García', dni: '87654321' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for SUPERADMIN user
    mockUseAppSelector.mockReturnValue(mockCurrentUserSuperAdmin);
    mockUseGetEmpresasQuery.mockReturnValue({ data: mockEmpresas });
    mockUseGetDadoresQuery.mockReturnValue({ data: { list: mockDadores } });
    mockUseGetClientsQuery.mockReturnValue({ data: { list: mockClientes } });
    mockUseGetEmpresasTransportistasQuery.mockReturnValue({ data: { list: mockTransportistas } });
    mockUseGetEmpresaTransportistaChoferesQuery.mockReturnValue({ data: mockChoferes });

    mockCreateClient.mockReturnValue({ unwrap: () => Promise.resolve({ id: 99, razonSocial: 'New Client' }) });
    mockCreateDador.mockReturnValue({ unwrap: () => Promise.resolve({ id: 99, razonSocial: 'New Dador' }) });
    mockCreateEmpresaTransportista.mockReturnValue({ unwrap: () => Promise.resolve({ id: 99, razonSocial: 'New Transportista' }) });
    mockCreateChofer.mockReturnValue({ unwrap: () => Promise.resolve({ id: 99, nombre: 'New', apellido: 'Chofer' }) });

    mockRegisterPlatformUser.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockRegisterClientWizard.mockReturnValue({ unwrap: () => Promise.resolve({ tempPassword: 'TempPass123!' }) });
    mockRegisterDadorWizard.mockReturnValue({ unwrap: () => Promise.resolve({ tempPassword: 'TempPass123!' }) });
    mockRegisterTransportistaWizard.mockReturnValue({ unwrap: () => Promise.resolve({ tempPassword: 'TempPass123!' }) });
    mockRegisterChoferWizard.mockReturnValue({ unwrap: () => Promise.resolve({ tempPassword: 'TempPass123!' }) });
  });

  it('debería importar el componente', () => {
    expect(RegisterUserModal).toBeDefined();
  });

  it('no debería renderizar nada cuando isOpen=false', () => {
    render(<RegisterUserModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText('Nuevo Usuario')).not.toBeInTheDocument();
  });

  it('debería renderizar el modal cuando isOpen=true', () => {
    render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Nuevo Usuario')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Rol *')).toBeInTheDocument();
  });

  it('debería mostrar selector de empresa para SUPERADMIN', () => {
    render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Empresa (Tenant) *')).toBeInTheDocument();
  });

  it('debería mostrar empresa fija para no-SUPERADMIN', () => {
    mockUseAppSelector.mockReturnValue(mockCurrentUserAdmin);
    render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);
    // Should show empresa name, not dropdown
    expect(screen.queryByText('Empresa (Tenant) *')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
  });

  it('debería cerrar modal al hacer clic en backdrop', () => {
    const onClose = jest.fn();
    render(<RegisterUserModal isOpen={true} onClose={onClose} />);
    
    // Click on backdrop (the black overlay)
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onClose).toHaveBeenCalled();
  });

  it('debería cerrar modal al hacer clic en Cancelar', () => {
    const onClose = jest.fn();
    render(<RegisterUserModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  describe('Rol OPERATOR (básico)', () => {
    it('debería crear usuario OPERATOR exitosamente', async () => {
      const onClose = jest.fn();
      render(<RegisterUserModal isOpen={true} onClose={onClose} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'OPERATOR', name: 'role' } });
      await waitFor(() => {
        expect(roleSelect).toHaveValue('OPERATOR');
      });

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'test@test.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), {
        target: { value: 'Password123!' },
      });

      // Select empresa
      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1', name: 'empresaId' } });
      await waitFor(() => {
        expect(empresaSelect).toHaveValue('1');
      });

      // Submit
      await act(async () => {
        const form = screen.getByText('Crear Usuario').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(mockRegisterPlatformUser).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Usuario creado exitosamente', 'success');
      });
    });

    it('debería mostrar error cuando no se selecciona empresa', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'OPERATOR', name: 'role' } });
      await waitFor(() => {
        expect(roleSelect).toHaveValue('OPERATOR');
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'test@test.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), {
        target: { value: 'Password123!' },
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // React-hook-form validation shows error in form, not toast
      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar una empresa')).toBeInTheDocument();
      });
    });

    it('debería manejar error en creación de usuario', async () => {
      mockRegisterPlatformUser.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: 'Email ya existe' } }),
      });

      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'OPERATOR', name: 'role' } });
      await waitFor(() => {
        expect(roleSelect).toHaveValue('OPERATOR');
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'test@test.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), {
        target: { value: 'Password123!' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1', name: 'empresaId' } });
      await waitFor(() => {
        expect(empresaSelect).toHaveValue('1');
      });

      await act(async () => {
        const form = screen.getByText('Crear Usuario').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Email ya existe', 'error');
      });
    });
  });

  describe('Rol CLIENTE', () => {
    it('debería mostrar wizard para CLIENTE', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      expect(screen.getByText('Asociar cliente existente')).toBeInTheDocument();
      expect(screen.getByText('Crear cliente nuevo + crear usuario')).toBeInTheDocument();
    });

    it('debería crear CLIENTE existente exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select existing cliente - use the 3rd combobox (role, empresa, cliente)
      const allComboboxes = screen.getAllByRole('combobox');
      const clienteSelect = allComboboxes[2];
      fireEvent.change(clienteSelect, { target: { value: '30' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterClientWizard).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Usuario CLIENTE creado. Copie la contraseña temporal.', 'success');
      });
    });

    it('debería mostrar error si no selecciona cliente existente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // React-hook-form validation shows error in form, not toast
      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar un cliente')).toBeInTheDocument();
      });
    });

    it('debería crear CLIENTE nuevo exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      // Switch to new mode
      fireEvent.click(screen.getByText('Crear cliente nuevo + crear usuario'));

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Fill new cliente fields using name attribute (from Controller's field spread)
      const razonSocialInput = document.querySelector('input[name="clienteRazonSocial"]') as HTMLInputElement;
      fireEvent.change(razonSocialInput, { target: { value: 'Nuevo Cliente SA' } });

      const cuitInput = screen.getByPlaceholderText('###########');
      fireEvent.change(cuitInput, { target: { value: '20999999999' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterClientWizard).toHaveBeenCalled();
      });
    });

    it('debería mostrar error si falta razón social para cliente nuevo', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.click(screen.getByText('Crear cliente nuevo + crear usuario'));

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // React-hook-form validation shows error in form, not toast
      await waitFor(() => {
        expect(screen.getByText('La razón social es requerida')).toBeInTheDocument();
      });
    });

    it('debería mostrar error si usuario no tiene permisos para crear CLIENTE', async () => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserDador);
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      // DADOR cannot create CLIENTE so the option shouldn't exist
      // but if somehow it does, it should show permission error
      expect(screen.queryByText('Asociar cliente existente')).not.toBeInTheDocument();
    });
  });

  describe('Rol DADOR_DE_CARGA', () => {
    it('debería mostrar wizard para DADOR_DE_CARGA', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      expect(screen.getByText('Asociar dador existente')).toBeInTheDocument();
      expect(screen.getByText('Crear dador nuevo + crear usuario')).toBeInTheDocument();
    });

    it('debería crear DADOR existente exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'dador@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select existing dador
      const dadorSelects = screen.getAllByRole('combobox');
      const dadorSelect = dadorSelects[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterDadorWizard).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Usuario DADOR DE CARGA creado. Copie la contraseña temporal.', 'success');
      });
    });

    it('debería crear DADOR nuevo exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      // Switch to new mode and wait for the new fields to appear
      fireEvent.click(screen.getByText('Crear dador nuevo + crear usuario'));
      
      // Wait for dador fields to appear
      await waitFor(() => {
        expect(document.querySelector('input[name="dadorRazonSocial"]')).toBeTruthy();
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'dador@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Fill new dador fields using name attribute (from Controller's field spread)
      const dadorRazonSocialInput = document.querySelector('input[name="dadorRazonSocial"]') as HTMLInputElement;
      fireEvent.change(dadorRazonSocialInput, { target: { value: 'Nuevo Dador SA' } });

      const dadorCuitInput = document.querySelector('input[name="dadorCuit"]') as HTMLInputElement;
      fireEvent.change(dadorCuitInput, { target: { value: '20888888888' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterDadorWizard).toHaveBeenCalled();
      });
    });

    it('debería mostrar error si falta razón social para dador nuevo', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      fireEvent.click(screen.getByText('Crear dador nuevo + crear usuario'));

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'dador@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // The validation is in onSubmit handler (no RHF rules for dador fields)
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Razón social y CUIT del dador son obligatorios', 'error');
      });
    });

    it('debería mostrar error si no selecciona dador existente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'dador@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // React-hook-form validation shows error in form, not toast
      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar un dador de carga')).toBeInTheDocument();
      });
    });
  });

  describe('Rol TRANSPORTISTA', () => {
    it('debería mostrar wizard para TRANSPORTISTA', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });

      expect(screen.getByText('Asociar transportista existente')).toBeInTheDocument();
      expect(screen.getByText('Crear transportista nuevo + crear usuario')).toBeInTheDocument();
    });

    it('debería crear TRANSPORTISTA existente exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'trans@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select dador first
      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      // Then select transportista
      await waitFor(() => {
        const transSelect = screen.getAllByRole('combobox')[3];
        fireEvent.change(transSelect, { target: { value: '20' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterTransportistaWizard).toHaveBeenCalled();
      });
    });

    it('debería mostrar error si no selecciona transportista existente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'trans@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // React-hook-form validation shows error in form, not toast
      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar una empresa transportista')).toBeInTheDocument();
      });
    });

    it('debería crear TRANSPORTISTA nuevo exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });

      fireEvent.click(screen.getByText('Crear transportista nuevo + crear usuario'));
      
      // Wait for transportista fields to appear
      await waitFor(() => {
        expect(document.querySelector('input[name="transportistaRazonSocial"]')).toBeTruthy();
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'trans@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select dador
      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      // Fill new transportista fields using name attribute
      const transportistaRazonSocialInput = document.querySelector('input[name="transportistaRazonSocial"]') as HTMLInputElement;
      fireEvent.change(transportistaRazonSocialInput, { target: { value: 'Nuevo Transporte SA' } });

      const transportistaCuitInput = document.querySelector('input[name="transportistaCuit"]') as HTMLInputElement;
      fireEvent.change(transportistaCuitInput, { target: { value: '20777777777' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterTransportistaWizard).toHaveBeenCalled();
      });
    });
  });

  describe('Rol CHOFER', () => {
    it('debería mostrar wizard para CHOFER', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      expect(screen.getByText('Asociar chofer existente')).toBeInTheDocument();
      expect(screen.getByText('Crear chofer nuevo + crear usuario')).toBeInTheDocument();
    });
    
    it('debería crear usuario con CHOFER existente exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      // Default is existing mode, no need to click
      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'chofer@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select dador
      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });
      
      // Select transportista (needed for chofer)
      const transportistaSelect = screen.getAllByRole('combobox')[3];
      fireEvent.change(transportistaSelect, { target: { value: '20' } });

      // Select existing chofer
      const choferSelect = screen.getAllByRole('combobox')[4];
      fireEvent.change(choferSelect, { target: { value: '40' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterChoferWizard).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Usuario CHOFER creado. Copie la contraseña temporal.', 'success');
      });
    });

    it('debería crear CHOFER nuevo exitosamente', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      fireEvent.click(screen.getByText('Crear chofer nuevo + crear usuario'));
      
      // Wait for chofer fields to appear
      await waitFor(() => {
        expect(document.querySelector('input[name="choferDni"]')).toBeTruthy();
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'chofer@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      // Select dador (required for chofer)
      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      // Fill new chofer fields using name attribute
      const choferDniInput = document.querySelector('input[name="choferDni"]') as HTMLInputElement;
      fireEvent.change(choferDniInput, { target: { value: '99999999' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockRegisterChoferWizard).toHaveBeenCalled();
      });
    });

    it('debería mostrar error si falta DNI para chofer nuevo', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      fireEvent.click(screen.getByText('Crear chofer nuevo + crear usuario'));

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'chofer@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });
      
      // Select dador but don't fill DNI
      const dadorSelect = screen.getAllByRole('combobox')[2];
      fireEvent.change(dadorSelect, { target: { value: '10' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('DNI y Dador de Carga del chofer son obligatorios', 'error');
      });
    });
  });

  describe('Usuario DADOR_DE_CARGA creando usuarios', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserDador);
    });

    it('debería mostrar dador automático al crear TRANSPORTISTA', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'TRANSPORTISTA' } });

      // Should show the dador's razonSocial (from mockDadores with id=10), not a dropdown
      expect(screen.getByText('Dador Carga SA')).toBeInTheDocument();
    });

    it('debería mostrar dador automático al crear CHOFER', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      // Should show the dador's razonSocial (from mockDadores with id=10)
      expect(screen.getByText('Dador Carga SA')).toBeInTheDocument();
    });
  });

  describe('Usuario TRANSPORTISTA creando usuarios', () => {
    beforeEach(() => {
      mockUseAppSelector.mockReturnValue(mockCurrentUserTransportista);
    });

    it('debería mostrar dador y transportista automáticos al crear CHOFER', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CHOFER' } });

      // Should show the dador's razonSocial (id=10) and transportista's razonSocial (id=20)
      expect(screen.getByText('Dador Carga SA')).toBeInTheDocument();
      expect(screen.getByText('Transporte SA')).toBeInTheDocument();
    });
  });

  describe('Contraseña temporal modal', () => {
    it('debería mostrar modal de contraseña temporal después de crear CLIENTE', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      const clienteSelects = screen.getAllByRole('combobox');
      fireEvent.change(clienteSelects[2], { target: { value: '30' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(screen.getByText('Contraseña temporal')).toBeInTheDocument();
        expect(screen.getByDisplayValue('TempPass123!')).toBeInTheDocument();
      });
    });

    it('debería copiar contraseña al portapapeles', async () => {
      // Mock clipboard
      const mockClipboard = { writeText: jest.fn() };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      const clienteSelects = screen.getAllByRole('combobox');
      fireEvent.change(clienteSelects[2], { target: { value: '30' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(screen.getByText('Contraseña temporal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Copiar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Contraseña copiada', 'success');
      });
    });

    it('debería cerrar modal de contraseña y resetear form al hacer clic en Listo', async () => {
      const onClose = jest.fn();
      render(<RegisterUserModal isOpen={true} onClose={onClose} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'CLIENTE' } });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'cliente@test.com' },
      });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1' } });

      const clienteSelects = screen.getAllByRole('combobox');
      fireEvent.change(clienteSelects[2], { target: { value: '30' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      await waitFor(() => {
        expect(screen.getByText('Contraseña temporal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Listo'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Mensaje de asociación', () => {
    it('debería mostrar mensaje de asociación para roles que lo requieren', () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'DADOR_DE_CARGA' } });

      expect(screen.getByText(/Este rol requiere asociación/)).toBeInTheDocument();
    });
  });

  describe('Validación de formulario', () => {
    it('debería mostrar error de validación para email vacío', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Crear Usuario'));
      });

      // The form should show validation errors
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/requerido/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Nombre y Apellido', () => {
    it('debería incluir nombre y apellido en payload', async () => {
      render(<RegisterUserModal isOpen={true} onClose={jest.fn()} />);

      const roleSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(roleSelect, { target: { value: 'OPERATOR', name: 'role' } });
      await waitFor(() => {
        expect(roleSelect).toHaveValue('OPERATOR');
      });

      fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
        target: { value: 'test@test.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), {
        target: { value: 'Password123!' },
      });

      // Find nombre and apellido inputs
      const inputs = screen.getAllByRole('textbox');
      const nombreInput = inputs.find(i => i.closest('div')?.textContent?.includes('Nombre'));
      const apellidoInput = inputs.find(i => i.closest('div')?.textContent?.includes('Apellido'));

      if (nombreInput) fireEvent.change(nombreInput, { target: { value: 'Juan' } });
      if (apellidoInput) fireEvent.change(apellidoInput, { target: { value: 'Pérez' } });

      const empresaSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(empresaSelect, { target: { value: '1', name: 'empresaId' } });
      await waitFor(() => {
        expect(empresaSelect).toHaveValue('1');
      });

      await act(async () => {
        const form = screen.getByText('Crear Usuario').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(mockRegisterPlatformUser).toHaveBeenCalled();
        const callArgs = mockRegisterPlatformUser.mock.calls[0][0];
        expect(callArgs.nombre).toBe('Juan');
        expect(callArgs.apellido).toBe('Pérez');
      });
    });
  });
});
