/**
 * Fixtures de datos de prueba para Platform Users
 *
 * Datos mock consistentes para usar en tests de platform-users.
 * Mantener sincronizado con la estructura de datos real.
 */

// =============================================================================
// TIPOS
// =============================================================================

export interface DadorFixture {
  id: number;
  razonSocial: string;
  cuit: string;
  activo: boolean;
  notas?: string;
}

export interface ClienteFixture {
  id: number;
  razonSocial: string;
  cuit: string;
  activo: boolean;
  notas?: string;
}

export interface EmpresaTransportistaFixture {
  id: number;
  razonSocial: string;
  cuit: string;
  dadorCargaId: number;
  activo: boolean;
  notas?: string;
}

export interface ChoferFixture {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  empresaTransportistaId?: number;
  activo: boolean;
  phones?: unknown[];
}

export interface EmpresaFixture {
  id: number;
  nombre: string;
}

export interface PlatformUserFixture {
  id: number;
  email: string;
  role: string;
  nombre?: string;
  apellido?: string;
  empresaId?: number | null;
  empresa?: { id: number; nombre: string } | null;
  activo?: boolean;
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FIXTURES DE DADORES
// =============================================================================

export const mockDadores: DadorFixture[] = [
  {
    id: 1,
    razonSocial: 'Dador de Carga Uno S.A.',
    cuit: '20111111111',
    activo: true,
  },
  {
    id: 2,
    razonSocial: 'Dador de Carga Dos S.A.',
    cuit: '20222222222',
    activo: true,
  },
  {
    id: 3,
    razonSocial: 'Dador de Carga Tres S.A.',
    cuit: '20333333333',
    activo: true,
  },
  {
    id: 4,
    razonSocial: 'Dador Inactivo',
    cuit: '20444444444',
    activo: false,
  },
  {
    id: 5,
    razonSocial: 'Dador con Notas',
    cuit: '20555555555',
    activo: true,
    notas: 'Dador especial con requisitos adicionales',
  },
];

// Dador único por ID para tests específicos
export const mockDador1 = mockDadores[0];
export const mockDador2 = mockDadores[1];

// =============================================================================
// FIXTURES DE CLIENTES
// =============================================================================

export const mockClientes: ClienteFixture[] = [
  {
    id: 1,
    razonSocial: 'Cliente Uno S.A.',
    cuit: '30111111111',
    activo: true,
  },
  {
    id: 2,
    razonSocial: 'Cliente Dos S.A.',
    cuit: '30222222222',
    activo: true,
  },
  {
    id: 3,
    razonSocial: 'Cliente Tres S.R.L.',
    cuit: '30333333333',
    activo: true,
  },
  {
    id: 4,
    razonSocial: 'Cliente Inactivo',
    cuit: '30444444444',
    activo: false,
  },
];

export const mockCliente1 = mockClientes[0];
export const mockCliente2 = mockClientes[1];

// =============================================================================
// FIXTURES DE EMPRESAS TRANSPORTISTAS
// =============================================================================

export const mockTransportistas: EmpresaTransportistaFixture[] = [
  {
    id: 1,
    razonSocial: 'Transportista Uno S.R.L.',
    cuit: '40111111111',
    dadorCargaId: 1,
    activo: true,
  },
  {
    id: 2,
    razonSocial: 'Transportista Dos S.A.',
    cuit: '40222222222',
    dadorCargaId: 1,
    activo: true,
  },
  {
    id: 3,
    razonSocial: 'Transportista Tres S.A.',
    cuit: '40333333333',
    dadorCargaId: 2,
    activo: true,
  },
  {
    id: 4,
    razonSocial: 'Transportista Cuatro S.R.L.',
    cuit: '40444444444',
    dadorCargaId: 2,
    activo: true,
  },
  {
    id: 5,
    razonSocial: 'Transportista Inactivo',
    cuit: '40555555555',
    dadorCargaId: 1,
    activo: false,
  },
];

export const mockTransportista1 = mockTransportistas[0];
export const mockTransportista2 = mockTransportistas[1];

// =============================================================================
// FIXTURES DE CHOFERES
// =============================================================================

export const mockChoferes: ChoferFixture[] = [
  {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    empresaTransportistaId: 1,
    activo: true,
    phones: [],
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'López',
    dni: '87654321',
    empresaTransportistaId: 1,
    activo: true,
    phones: [],
  },
  {
    id: 3,
    nombre: 'María',
    apellido: 'García',
    dni: '11223344',
    empresaTransportistaId: 2,
    activo: true,
    phones: [],
  },
  {
    id: 4,
    nombre: 'Roberto',
    apellido: 'Fernández',
    dni: '44556677',
    empresaTransportistaId: 2,
    activo: false,
    phones: [],
  },
  {
    id: 5,
    nombre: 'Ana',
    apellido: 'Martínez',
    dni: '55667788',
    empresaTransportistaId: 1,
    activo: true,
    phones: [],
  },
];

export const mockChofer1 = mockChoferes[0];
export const mockChofer2 = mockChoferes[1];

// =============================================================================
// FIXTURES DE EMPRESAS (TENANTS)
// =============================================================================

export const mockEmpresas: EmpresaFixture[] = [
  { id: 1, nombre: 'Empresa Uno S.A.' },
  { id: 2, nombre: 'Empresa Dos S.A.' },
  { id: 3, nombre: 'Empresa Tres S.R.L.' },
];

export const mockEmpresa1 = mockEmpresas[0];
export const mockEmpresa2 = mockEmpresas[1];

// =============================================================================
// FIXTURES DE USUARIOS DE PLATAFORMA
// =============================================================================

export const mockPlatformUsers: PlatformUserFixture[] = [
  {
    id: 1,
    email: 'superadmin@test.com',
    role: 'SUPERADMIN',
    nombre: 'Super',
    apellido: 'Admin',
    empresaId: 1,
    empresa: { id: 1, nombre: 'Empresa Uno S.A.' },
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'admin@test.com',
    role: 'ADMIN',
    nombre: 'Admin',
    apellido: 'Usuario',
    empresaId: 1,
    empresa: { id: 1, nombre: 'Empresa Uno S.A.' },
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    email: 'dador@test.com',
    role: 'DADOR_DE_CARGA',
    nombre: 'Dador',
    apellido: 'Usuario',
    empresaId: 1,
    dadorCargaId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    email: 'transportista@test.com',
    role: 'TRANSPORTISTA',
    nombre: 'Transportista',
    apellido: 'Usuario',
    empresaId: 1,
    empresaTransportistaId: 1,
    dadorCargaId: 1,
    activo: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    email: 'chofer@test.com',
    role: 'CHOFER',
    nombre: 'Chofer',
    apellido: 'Usuario',
    empresaId: 1,
    choferId: 1,
    empresaTransportistaId: 1,
    dadorCargaId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 6,
    email: 'cliente@test.com',
    role: 'CLIENTE',
    nombre: 'Cliente',
    apellido: 'Usuario',
    empresaId: 1,
    clienteId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 7,
    email: 'admin-interno@test.com',
    role: 'ADMIN_INTERNO',
    nombre: 'Admin',
    apellido: 'Interno',
    empresaId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const mockUserSuperadmin = mockPlatformUsers[0];
export const mockUserAdmin = mockPlatformUsers[1];
export const mockUserDador = mockPlatformUsers[2];
export const mockUserTransportista = mockPlatformUsers[3];
export const mockUserChofer = mockPlatformUsers[4];
export const mockUserCliente = mockPlatformUsers[5];

// =============================================================================
// FIXTURES PARA PAGINACIÓN
// =============================================================================

export const mockPaginatedUsersResponse = {
  data: mockPlatformUsers.slice(0, 3),
  total: mockPlatformUsers.length,
  page: 1,
  limit: 3,
  totalPages: 3,
};

export const mockEmptyPaginatedResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

// =============================================================================
// FIXTURES PARA RESPUESTAS DE MUTATIONS
// =============================================================================

export const mockCreateUserResponse = {
  success: true,
  user: mockUserAdmin,
  tempPassword: 'TempPass123!',
};

export const mockUpdateUserResponse = {
  success: true,
  user: { ...mockUserAdmin, nombre: 'Updated' },
};

export const mockDeleteUserResponse = {
  success: true,
};

export const mockToggleUserResponse = {
  success: true,
  data: { id: 1, activo: false },
};

// =============================================================================
// FIXTURES PARA WIZARDS
// =============================================================================

export const mockClientWizardResponse = {
  success: true,
  user: { ...mockUserCliente, id: 10 },
  tempPassword: 'ClientPass123!',
};

export const mockDadorWizardResponse = {
  success: true,
  user: { ...mockUserDador, id: 11 },
  tempPassword: 'DadorPass123!',
};

export const mockTransportistaWizardResponse = {
  success: true,
  user: { ...mockUserTransportista, id: 12 },
  tempPassword: 'TranspPass123!',
};

export const mockChoferWizardResponse = {
  success: true,
  user: { ...mockUserChofer, id: 13 },
  tempPassword: 'ChoferPass123!',
};

// =============================================================================
// FIXTURES PARA ERRORES
// =============================================================================

export const mockErrorResponse = {
  data: {
    message: 'Error en la operación',
    errors: ['Email ya existe', 'Rol inválido'],
  },
};

export const mockUnauthorizedResponse = {
  data: {
    message: 'No autorizado',
    statusCode: 401,
  },
};

export const mockValidationErrorResponse = {
  data: {
    message: 'Error de validación',
    errors: {
      email: 'Email inválido',
      password: 'La contraseña debe tener al menos 8 caracteres',
    },
  },
};

// =============================================================================
// HELPERS PARA FIXTURES
// =============================================================================

/**
 * Obtiene un fixture de usuario por rol
 */
export const getUserByRole = (role: string): PlatformUserFixture | undefined => {
  return mockPlatformUsers.find(u => u.role === role);
};

/**
 * Obtiene fixtures de transportistas filtrados por dador
 */
export const getTransportistasByDador = (dadorId: number): EmpresaTransportistaFixture[] => {
  return mockTransportistas.filter(t => t.dadorCargaId === dadorId);
};

/**
 * Obtiene fixtures de choferes filtrados por transportista
 */
export const getChoferesByTransportista = (transportistaId: number): ChoferFixture[] => {
  return mockChoferes.filter(c => c.empresaTransportistaId === transportistaId);
};

/**
 * Crea una respuesta paginada con datos específicos
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number = 1,
  limit: number = 20
) => ({
  data,
  total: data.length,
  page,
  limit,
  totalPages: Math.ceil(data.length / limit),
});

/**
 * Crea un usuario mock con overrides
 */
export const createMockUser = (overrides: Partial<PlatformUserFixture> = {}): PlatformUserFixture => ({
  id: 1,
  email: 'test@test.com',
  role: 'ADMIN',
  nombre: 'Test',
  apellido: 'User',
  empresaId: 1,
  activo: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});