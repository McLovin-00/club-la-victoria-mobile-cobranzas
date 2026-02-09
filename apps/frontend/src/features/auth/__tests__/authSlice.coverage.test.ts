import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../../lib/utils', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const loadAuthSlice = async () => import('../authSlice');

const baseUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: 'user@test.com',
  role: 'ADMIN',
  ...overrides,
});

describe('authSlice bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('hydrates state when token and user exist', async () => {
    const user = baseUser();
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('user', JSON.stringify(user));

    const { default: reducer } = await loadAuthSlice();
    const state = reducer(undefined, { type: 'unknown' });

    expect(state.token).toBe('token-123');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.initialized).toBe(true);
  });

  it('clears storage when user JSON is invalid', async () => {
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('user', '{invalid-json');
    const removeSpy = jest.spyOn(localStorage, 'removeItem');

    const { default: reducer } = await loadAuthSlice();
    const state = reducer(undefined, { type: 'unknown' });

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith('user');
    expect(removeSpy).toHaveBeenCalledWith('token');
    removeSpy.mockRestore();
  });

  it('returns default state when localStorage throws', async () => {
    const getItemSpy = jest.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { default: reducer } = await loadAuthSlice();
    const state = reducer(undefined, { type: 'unknown' });

    expect(state.isAuthenticated).toBe(false);
    expect(state.initialized).toBe(true);

    getItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('authSlice reducers', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('setCredentials stores token and user', async () => {
    const { default: reducer, setCredentials } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');
    const user = baseUser({ role: 'SUPERADMIN' });

    const state = reducer(
      {
        token: null,
        user: null,
        isAuthenticated: false,
        initialized: false,
      },
      setCredentials({ token: 'token-123', data: user } as any)
    );

    expect(state.token).toBe('token-123');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.initialized).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith('token', 'token-123');
    expect(setItemSpy).toHaveBeenCalledWith('user', JSON.stringify(user));
    setItemSpy.mockRestore();
  });

  it('setCredentials ignores missing payload', async () => {
    const { default: reducer, setCredentials } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');

    const state = reducer(
      {
        token: null,
        user: null,
        isAuthenticated: false,
        initialized: false,
      },
      setCredentials({ token: '', data: null } as any)
    );

    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('logout clears auth data', async () => {
    const { default: reducer, logout } = await loadAuthSlice();
    const removeSpy = jest.spyOn(localStorage, 'removeItem');
    const user = baseUser();

    const state = reducer(
      {
        token: 'token-123',
        user,
        isAuthenticated: true,
        initialized: true,
      },
      logout()
    );

    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('token');
    expect(removeSpy).toHaveBeenCalledWith('user');
    removeSpy.mockRestore();
  });

  it('initializeAuth reads current localStorage', async () => {
    const user = baseUser({ role: 'SUPERADMIN' });

    const getItemSpy = jest.spyOn(localStorage, 'getItem').mockImplementation(key => {
      if (key === 'token') return 'token-999';
      if (key === 'user') return JSON.stringify(user);
      return null;
    });

    const { default: reducer, initializeAuth } = await loadAuthSlice();

    const state = reducer(
      {
        token: null,
        user: null,
        isAuthenticated: false,
        initialized: false,
      },
      initializeAuth()
    );

    expect(state.token).toBe('token-999');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.initialized).toBe(true);
    getItemSpy.mockRestore();
  });

  it('updateUserEmpresa updates user when present', async () => {
    const { default: reducer, updateUserEmpresa } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');
    const user = baseUser({ empresaId: null });

    const state = reducer(
      {
        token: 'token-123',
        user,
        isAuthenticated: true,
        initialized: true,
      },
      updateUserEmpresa({ empresaId: 42 })
    );

    expect(state.user?.empresaId).toBe(42);
    expect(setItemSpy).toHaveBeenCalledWith(
      'user',
      JSON.stringify({ ...user, empresaId: 42 })
    );
    setItemSpy.mockRestore();
  });

  it('updateUserEmpresa is a no-op without user', async () => {
    const { default: reducer, updateUserEmpresa } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');

    const state = reducer(
      {
        token: 'token-123',
        user: null,
        isAuthenticated: true,
        initialized: true,
      },
      updateUserEmpresa({ empresaId: 10 })
    );

    expect(state.user).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('empresaChanged updates user empresaId', async () => {
    const { default: reducer, empresaChanged } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');
    const user = baseUser({ empresaId: 3 });

    const state = reducer(
      {
        token: 'token-123',
        user,
        isAuthenticated: true,
        initialized: true,
      },
      empresaChanged({ empresaId: 8 })
    );

    expect(state.user?.empresaId).toBe(8);
    expect(setItemSpy).toHaveBeenCalledWith(
      'user',
      JSON.stringify({ ...user, empresaId: 8 })
    );
    setItemSpy.mockRestore();
  });

  it('setCurrentUser replaces user', async () => {
    const { default: reducer, setCurrentUser } = await loadAuthSlice();
    const setItemSpy = jest.spyOn(localStorage, 'setItem');
    const user = baseUser({ role: 'SUPERADMIN', empresaId: 9 });

    const state = reducer(
      {
        token: 'token-123',
        user: null,
        isAuthenticated: true,
        initialized: true,
      },
      setCurrentUser(user as any)
    );

    expect(state.user).toEqual(user);
    expect(setItemSpy).toHaveBeenCalledWith('user', JSON.stringify(user));
    setItemSpy.mockRestore();
  });
});

describe('authSlice selectors', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('selectIsAdmin is true for ADMIN and SUPERADMIN', async () => {
    const { selectIsAdmin } = await loadAuthSlice();
    const adminState = { auth: { user: baseUser({ role: 'ADMIN' }) } } as any;
    const superState = { auth: { user: baseUser({ role: 'SUPERADMIN' }) } } as any;

    expect(selectIsAdmin(adminState)).toBe(true);
    expect(selectIsAdmin(superState)).toBe(true);
  });

  it('selectIsSuperAdmin only matches SUPERADMIN', async () => {
    const { selectIsSuperAdmin } = await loadAuthSlice();
    const adminState = { auth: { user: baseUser({ role: 'ADMIN' }) } } as any;
    const superState = { auth: { user: baseUser({ role: 'SUPERADMIN' }) } } as any;

    expect(selectIsSuperAdmin(adminState)).toBe(false);
    expect(selectIsSuperAdmin(superState)).toBe(true);
  });
});
