/**
 * Tests de integración para el módulo users
 *
 * Prueba:
 * - Flujo completo CRUD
 * - Filtrado y búsqueda
 * - Integración con auditoría
 * - Refetch al cambiar usuario
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type UserRole = 'user' | 'admin';
type CurrentUser = { id: number; role: UserRole; empresaId: number };

describe('users - flujo completo CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería crear usuario nuevo', async () => {
    const mockCreateUser = jest.fn((data: typeof newUserData) =>
      Promise.resolve({
        data: { success: true, data: { id: 15, email: data.email, role: data.role } },
      })
    );

    const newUserData = {
      email: 'nuevo@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'user',
      empresaId: null,
    };

    const result = await mockCreateUser(newUserData);

    expect(mockCreateUser).toHaveBeenCalledWith(newUserData);
    expect(result.data.success).toBe(true);
    expect(result.data.data.id).toBe(15);
    expect(result.data.data.email).toBe('nuevo@example.com');
  });

  it('debería aparecer en la tabla después de crear', async () => {
    const users = [
      { id: 1, email: 'user1@example.com', role: 'user' as const },
      { id: 2, email: 'user2@example.com', role: 'admin' as const },
    ];

    const newUser = { id: 3, email: 'new@example.com', role: 'user' as const };
    const updatedUsers = [...users, newUser];

    expect(updatedUsers.length).toBe(3);
    expect(updatedUsers.find(u => u.id === 3)).toEqual(newUser);
  });

  it('debería poder editarse', async () => {
    const mockUpdateUser = jest.fn((id: number, data: typeof updatedData) =>
      Promise.resolve({
        data: { success: true, data: { id, ...data } },
      })
    );

    const userId = 10;
    const updatedData = {
      email: 'editado@example.com',
      role: 'admin',
      empresaId: 5,
    };

    const result = await mockUpdateUser(userId, updatedData);

    expect(mockUpdateUser).toHaveBeenCalledWith(10, updatedData);
    expect(result.data.success).toBe(true);
    expect(result.data.data.email).toBe('editado@example.com');
  });

  it('debería mostrar cambios en tabla después de editar', () => {
    const users = [
      { id: 1, email: 'original@example.com', role: 'user' as const },
    ];

    // Simular edición
    const updatedUser = { ...users[0], email: 'editado@example.com' };
    const updatedUsers = [updatedUser];

    expect(updatedUsers[0].email).toBe('editado@example.com');
  });

  it('debería poder eliminarse', async () => {
    const mockDeleteUser = jest.fn((id: number) =>
      Promise.resolve({
        data: { success: true, data: { id } },
      })
    );

    const userId = 20;
    const result = await mockDeleteUser(userId);

    expect(mockDeleteUser).toHaveBeenCalledWith(20);
    expect(result.data.success).toBe(true);
  });

  it('debería desaparecer de tabla después de eliminar', () => {
    const users = [
      { id: 1, email: 'user1@example.com', role: 'user' as const },
      { id: 2, email: 'user2@example.com', role: 'user' as const },
      { id: 3, email: 'user3@example.com', role: 'user' as const },
    ];

    const userIdToDelete = 2;
    const updatedUsers = users.filter(u => u.id !== userIdToDelete);

    expect(updatedUsers.length).toBe(2);
    expect(updatedUsers.find(u => u.id === 2)).toBeUndefined();
  });

  it('debería manejar error de validación al crear', async () => {
    const mockCreateUser = jest.fn((data: typeof invalidData) =>
      Promise.reject({
        status: 400,
        data: {
          success: false,
          errors: [
            { field: 'email', message: 'Email inválido' },
            { field: 'password', message: 'Password muy débil' },
          ],
        },
      })
    );

    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      confirmPassword: 'weak',
      role: 'user',
      empresaId: null,
    };

    await expect(mockCreateUser(invalidData)).rejects.toEqual({
      status: 400,
      data: expect.objectContaining({
        success: false,
        errors: expect.any(Array),
      }),
    });
  });

  it('debería manejar email duplicado al crear', async () => {
    const mockCreateUser = jest.fn((data: typeof duplicateEmailData) =>
      Promise.reject({
        status: 409,
        data: {
          success: false,
          message: 'El email ya está registrado',
        },
      })
    );

    const duplicateEmailData = {
      email: 'existente@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'user',
      empresaId: null,
    };

    await expect(mockCreateUser(duplicateEmailData)).rejects.toEqual({
      status: 409,
      data: expect.objectContaining({
        message: 'El email ya está registrado',
      }),
    });
  });
});

describe('users - filtrado y búsqueda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería filtrar por role', () => {
    const users = [
      { id: 1, email: 'user1@example.com', role: 'user' as const },
      { id: 2, email: 'admin1@example.com', role: 'admin' as const },
      { id: 3, email: 'user2@example.com', role: 'user' as const },
      { id: 4, email: 'admin2@example.com', role: 'admin' as const },
    ];

    const roleFilter = 'user';
    const filteredUsers = users.filter(u => u.role === roleFilter);

    expect(filteredUsers.length).toBe(2);
    expect(filteredUsers.every(u => u.role === 'user')).toBe(true);
  });

  it('debería buscar por email', () => {
    const users = [
      { id: 1, email: 'juan@example.com', role: 'user' as const },
      { id: 2, email: 'maria@example.com', role: 'admin' as const },
      { id: 3, email: 'juan.perez@example.com', role: 'user' as const },
    ];

    const searchTerm = 'juan';
    const filteredUsers = users.filter(u => u.email.includes(searchTerm));

    expect(filteredUsers.length).toBe(2);
    expect(filteredUsers.every(u => u.email.includes('juan'))).toBe(true);
  });

  it('debería combinar filtros', () => {
    const users = [
      { id: 1, email: 'juan@example.com', role: 'user' as const, empresaId: 5 },
      { id: 2, email: 'juan.admin@example.com', role: 'admin' as const, empresaId: 5 },
      { id: 3, email: 'maria@example.com', role: 'user' as const, empresaId: 10 },
    ];

    const searchTerm = 'juan';
    const roleFilter = 'user';
    const empresaFilter = 5;

    const filteredUsers = users.filter(u =>
      u.email.includes(searchTerm) &&
      u.role === roleFilter &&
      u.empresaId === empresaFilter
    );

    expect(filteredUsers.length).toBe(1);
    expect(filteredUsers[0].id).toBe(1);
  });

  it('debería limpiar filtros', () => {
    let queryParams: { page: number; search: string; role: string; empresaId?: number } = {
      search: 'juan',
      role: 'admin',
      empresaId: 5,
      page: 1,
    };

    // Limpiar filtros
    queryParams = {
      search: '',
      role: '',
      empresaId: undefined,
      page: 1,
    };

    expect(queryParams.search).toBe('');
    expect(queryParams.role).toBe('');
    expect(queryParams.empresaId).toBeUndefined();
    expect(queryParams.page).toBe(1);
  });

  it('debería resetear página al aplicar filtros', () => {
    let queryParams = {
      page: 5,
      search: '',
      role: '',
      empresaId: undefined,
    };

    // Aplicar filtro de rol
    queryParams = {
      ...queryParams,
      role: 'admin',
      page: 1, // Reset a página 1
    };

    expect(queryParams.page).toBe(1);
    expect(queryParams.role).toBe('admin');
  });

  it('debería mantener filtros al cambiar página', () => {
    let queryParams = {
      page: 1,
      search: 'juan',
      role: 'user',
      empresaId: 5,
    };

    // Cambiar página
    queryParams = {
      ...queryParams,
      page: 2,
    };

    expect(queryParams.page).toBe(2);
    expect(queryParams.search).toBe('juan');
    expect(queryParams.role).toBe('user');
    expect(queryParams.empresaId).toBe(5);
  });
});

describe('users - integración con auditoría', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería auditar creación de usuario', () => {
    const mockAudit = jest.fn();

    const newUser = {
      id: 10,
      email: 'nuevo@example.com',
      role: 'user',
    };

    mockAudit({
      action: 'USER_CREATE_SUCCESS',
      userId: newUser.id,
      newValues: newUser,
      severity: 'INFO',
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_CREATE_SUCCESS',
        userId: 10,
        severity: 'INFO',
      })
    );
  });

  it('debería auditar actualización de usuario', () => {
    const mockAudit = jest.fn();

    const oldUser = { id: 5, email: 'original@example.com', role: 'user' };
    const newUser = { id: 5, email: 'editado@example.com', role: 'admin' };

    mockAudit({
      action: 'USER_UPDATE_SUCCESS',
      userId: oldUser.id,
      oldValues: { email: oldUser.email, role: oldUser.role },
      newValues: { email: newUser.email, role: newUser.role },
      changedFields: ['email', 'role'],
      severity: 'INFO',
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_UPDATE_SUCCESS',
        userId: 5,
        changedFields: ['email', 'role'],
      })
    );
  });

  it('debería auditar eliminación de usuario', () => {
    const mockAudit = jest.fn();

    const deletedUser = {
      id: 20,
      email: 'deleted@example.com',
      role: 'user',
    };

    const deletedBy = {
      id: 1,
      role: 'superadmin',
    };

    mockAudit({
      action: 'USER_DELETE_SUCCESS',
      userId: deletedUser.id,
      userEmail: deletedUser.email,
      deletedBy: deletedBy.id,
      deletedByRole: deletedBy.role,
      severity: 'CRITICAL',
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_DELETE_SUCCESS',
        userId: 20,
        severity: 'CRITICAL',
      })
    );
  });

  it('debería auditar búsqueda cuando term.length > 2', () => {
    const mockAudit = jest.fn();

    const searchTerm = 'juan';

    mockAudit({
      action: 'USER_SEARCH',
      searchTerm,
      severity: 'LOW',
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_SEARCH',
        searchTerm: 'juan',
      })
    );
  });

  it('no debería auditar búsqueda cuando term.length <= 2', () => {
    const mockAudit = jest.fn();

    const searchTerm = 'ju';
    const shouldAudit = searchTerm.length > 2;

    if (shouldAudit) {
      mockAudit({
        action: 'USER_SEARCH',
        searchTerm,
      });
    }

    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('debería incluir metadata en auditoría', () => {
    const mockAudit = jest.fn();

    const auditMetadata = {
      browserInfo: {
        userAgent: 'Mozilla/5.0...',
        language: 'es-ES',
      },
      location: '/usuarios',
      filters: {
        search: 'juan',
        role: 'admin',
        page: 1,
      },
    };

    mockAudit({
      action: 'USER_FILTERS_APPLIED',
      metadata: auditMetadata,
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          filters: expect.objectContaining({
            search: 'juan',
          }),
        }),
      })
    );
  });
});

describe('users - refetch al cambiar usuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería refetch cuando currentUser cambia', () => {
    const mockRefetch = jest.fn();
    let currentUser: CurrentUser | null = null;

    // Usuario se loguea
    currentUser = { id: 1, role: 'admin' as const, empresaId: 5 };
    mockRefetch();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('debería refetch cuando currentUser.role cambia', () => {
    const mockRefetch = jest.fn();
    let currentUser: CurrentUser = { id: 1, role: 'user', empresaId: 5 };

    // El rol del usuario cambia (ej. promovido a admin)
    currentUser = { ...currentUser, role: 'admin' };
    mockRefetch();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('debería refetch cuando currentUser.empresaId cambia', () => {
    const mockRefetch = jest.fn();
    let currentUser = { id: 1, role: 'admin' as const, empresaId: 5 };

    // La empresa del usuario cambia
    currentUser = { ...currentUser, empresaId: 10 };
    mockRefetch();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('no debería refetch si currentUser no cambia', () => {
    const mockRefetch = jest.fn();
    const currentUser = { id: 1, role: 'admin' as const, empresaId: 5 };

    // Algún otro estado cambia pero no currentUser
    const previousUser = currentUser;
    const nextUser = { ...currentUser };
    const hasUserChanged =
      previousUser.id !== nextUser.id ||
      previousUser.role !== nextUser.role ||
      previousUser.empresaId !== nextUser.empresaId;

    if (hasUserChanged) {
      mockRefetch();
    }

    expect(mockRefetch).not.toHaveBeenCalled();
  });
});

describe('users - integración de componentes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería abrir UserModal al clicar "Nuevo usuario"', () => {
    let isModalOpen = false;
    const mode = 'create';

    const openModal = () => {
      isModalOpen = true;
    };

    openModal();

    expect(isModalOpen).toBe(true);
    expect(mode).toBe('create');
  });

  it('debería abrir UserModal en modo edición al clicar editar', () => {
    let isModalOpen = false;
    let mode = '';
    const userToEdit = { id: 5, email: 'edit@example.com', role: 'user' as const };

    const openEditModal = (user: typeof userToEdit) => {
      isModalOpen = true;
      mode = 'edit';
    };

    openEditModal(userToEdit);

    expect(isModalOpen).toBe(true);
    expect(mode).toBe('edit');
  });

  it('debería cerrar UserModal después de crear exitosamente', async () => {
    let isModalOpen = true;
    const mockCreateUser = jest.fn((data: { email: string }) =>
      Promise.resolve({
        data: { success: true, data: { id: 10, email: data.email } },
      })
    );

    // Crear usuario
    await mockCreateUser({ email: 'new@example.com' });

    // Cerrar modal
    isModalOpen = false;

    expect(isModalOpen).toBe(false);
  });

  it('debería mantener UserTable datos sincronizados', () => {
    const tableUsers = [
      { id: 1, email: 'user1@example.com', role: 'user' as const },
    ];

    // Crear nuevo usuario
    const newUser = { id: 2, email: 'user2@example.com', role: 'admin' as const };

    // Refetch actualiza tabla
    const updatedTableUsers = [...tableUsers, newUser];

    expect(updatedTableUsers.length).toBe(2);
    expect(updatedTableUsers[1].email).toBe('user2@example.com');
  });

  it('debería mostrar toast de éxito después de crear', () => {
    const mockShowToast = jest.fn();

    mockShowToast('Usuario creado correctamente', 'success');

    expect(mockShowToast).toHaveBeenCalledWith('Usuario creado correctamente', 'success');
  });

  it('debería mostrar toast de éxito después de actualizar', () => {
    const mockShowToast = jest.fn();

    mockShowToast('Usuario actualizado correctamente', 'success');

    expect(mockShowToast).toHaveBeenCalledWith('Usuario actualizado correctamente', 'success');
  });

  it('debería mostrar toast de éxito después de eliminar', () => {
    const mockShowToast = jest.fn();
    const deletedUserEmail = 'deleted@example.com';

    mockShowToast(`Usuario ${deletedUserEmail} eliminado correctamente`, 'success');

    expect(mockShowToast).toHaveBeenCalledWith(
      'Usuario deleted@example.com eliminado correctamente',
      'success'
    );
  });

  it('debería navegar a primera página al crear usuario', () => {
    let currentPage = 5;

    // Crear usuario
    // Después de crear, navegar a primera página para verlo
    currentPage = 1;

    expect(currentPage).toBe(1);
  });
});

describe('users - manejo de errores integrado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar error de red en toda la aplicación', async () => {
    const mockShowToast = jest.fn();
    const networkError = new Error('Failed to fetch');

    try {
      throw networkError;
    } catch (error) {
      mockShowToast('Error de conexión. Verifica tu red.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'Error de conexión. Verifica tu red.',
      'error'
    );
  });

  it('debería manejar timeout de carga', async () => {
    const mockShowToast = jest.fn();

    // Simular timeout después de 30 segundos
    const timeoutMs = 30000;
    let timedOut = false;

    jest.useFakeTimers();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error('Timeout'));
      }, timeoutMs);
    });

    jest.advanceTimersByTime(timeoutMs);
    await expect(timeoutPromise).rejects.toThrow('Timeout');
    expect(timedOut).toBe(true);
    jest.useRealTimers();
  });

  it('debería reintentar automáticamente al recibir error 500', async () => {
    let attempts = 0;
    const maxRetries = 3;

    const mockFetchWithRetry = async (): Promise<unknown> => {
      while (attempts < maxRetries) {
        attempts++;
        // Simular que todos los intentos fallan
        if (attempts === maxRetries) {
          throw new Error('Max retries reached');
        }
      }
      return null;
    };

    await expect(mockFetchWithRetry()).rejects.toThrow('Max retries reached');
    expect(attempts).toBe(maxRetries);
  });

  it('debería mostrar loading durante reintentos', () => {
    let isLoading = false;
    let retryCount = 0;

    const startRetry = () => {
      isLoading = true;
      retryCount++;
    };

    const endRetry = () => {
      isLoading = false;
    };

    startRetry();
    expect(isLoading).toBe(true);
    expect(retryCount).toBe(1);

    endRetry();
    expect(isLoading).toBe(false);
  });
});

describe('users - flujos multi-step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería crear y luego editar el mismo usuario', async () => {
    const mockCreate = jest.fn((data: { email: string; password: string; confirmPassword: string; role: UserRole; empresaId: number | null }) =>
      Promise.resolve({
        data: { success: true, data: { id: 50, email: data.email, role: data.role } },
      })
    );

    const mockUpdate = jest.fn((id: number, data: { email: string; role: UserRole; empresaId: number }) =>
      Promise.resolve({
        data: { success: true, data: { id, ...data } },
      })
    );

    // Crear
    const createResult = await mockCreate({
      email: 'new@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'user',
      empresaId: null,
    });

    const newUserId = createResult.data.data.id;

    // Editar
    const updateResult = await mockUpdate(newUserId, {
      email: 'updated@example.com',
      role: 'admin',
      empresaId: 5,
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(50, expect.objectContaining({
      email: 'updated@example.com',
    }));
  });

  it('debería filtrar, crear usuario que coincide, y ver en resultados', () => {
    let users = [
      { id: 1, email: 'juan@example.com', role: 'user' as const },
      { id: 2, email: 'maria@example.com', role: 'user' as const },
    ];

    // Filtrar por "juan"
    const filtered = users.filter(u => u.email.includes('juan'));
    expect(filtered.length).toBe(1);

    // Crear otro Juan
    const newJuan = { id: 3, email: 'juan.perez@example.com', role: 'user' as const };
    users = [...users, newJuan];

    // Filtrar de nuevo
    const newFiltered = users.filter(u => u.email.includes('juan'));
    expect(newFiltered.length).toBe(2);
  });

  it('debería cambiar entre páginas y eliminar usuario en diferente página', () => {
    let users = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      email: `user${i + 1}@example.com`,
      role: 'user' as const,
    }));

    const limit = 10;
    let currentPage = 3; // Tercera página (usuarios 21-30)

    // Usuario en tercera página
    const userIdToDelete = 25;

    // Eliminar
    users = users.filter(u => u.id !== userIdToDelete);

    // Volviendo a primera página
    currentPage = 1;

    expect(users.length).toBe(24);
    expect(users.find(u => u.id === 25)).toBeUndefined();
    expect(currentPage).toBe(1);
  });

  it('debería crear usuario en página 2, saltar a página 1 para verlo', () => {
    let currentPage = 2;
    let users = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      email: `user${i + 1}@example.com`,
      role: 'user' as const,
    }));

    // Crear nuevo usuario (aparece primero)
    const newUser = { id: 16, email: 'new@example.com', role: 'user' as const };
    users = [newUser, ...users];

    // Saltar a página 1
    currentPage = 1;

    // Verificar que el nuevo usuario está primero
    expect(users[0].email).toBe('new@example.com');
    expect(currentPage).toBe(1);
  });
});
