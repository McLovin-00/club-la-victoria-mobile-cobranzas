import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store/store';
import { LoginResponse, UserResponse } from './types';
import { Logger } from '../../lib/utils';

export interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

interface UpdateUserPayload {
  empresaId?: number | null;
}

const loadAuthState = (): AuthState => {
  try {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    let user: UserResponse | null = null;

    if (userString && userString !== 'undefined' && userString !== '{}' ) {
      try {
        user = JSON.parse(userString);
        Logger.debug('AuthSlice: Usuario cargado desde localStorage', { role: user?.role });
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        Logger.error('Error al analizar el usuario desde localStorage:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return { user: null, token: null, isAuthenticated: false, initialized: true };
      }
    }

    if (token && user) {
      Logger.debug('AuthSlice: Sesión válida encontrada en localStorage');
      return { user, token, isAuthenticated: true, initialized: true };
    }

    Logger.debug('AuthSlice: No hay sesión válida en localStorage');
    return { user: null, token: null, isAuthenticated: false, initialized: true };
  } catch (error) {
    console.error('Error loading auth state:', error);
    Logger.error('Error al cargar el estado de autenticación:', error);
    return { user: null, token: null, isAuthenticated: false, initialized: true };
  }
};

const initialState: AuthState = loadAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      const { token, refreshToken, data: user } = action.payload;
      if (!token || !user) {
        Logger.error('AuthSlice: intento de guardar credenciales vacías');
        return;
      }
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      state.initialized = true;

      Logger.debug('AuthSlice: Guardando credenciales en localStorage', { role: user?.role });

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    },
    logout: state => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.initialized = true;

      Logger.debug('AuthSlice: Cerrando sesión, eliminando datos de localStorage');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    },
    initializeAuth: state => {
      const loadedState = loadAuthState();
      state.token = loadedState.token;
      state.user = loadedState.user;
      state.isAuthenticated = loadedState.isAuthenticated;
      state.initialized = true;

      Logger.debug(
        `AuthSlice: Inicialización completada - Autenticado: ${loadedState.isAuthenticated}`
      );
    },
    updateUserEmpresa: (state, { payload }: PayloadAction<UpdateUserPayload>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          empresaId: payload.empresaId ?? null,
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    empresaChanged: (state, action: PayloadAction<{ empresaId: number | null }>) => {
      // Action específico para cambio de empresa que triggerea invalidación
      if (state.user) {
        state.user = {
          ...state.user,
          empresaId: action.payload.empresaId,
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setCurrentUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, logout, initializeAuth, updateUserEmpresa, empresaChanged, setCurrentUser } =
  authSlice.actions;

export default authSlice.reducer;

// Selectores
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsInitialized = (state: RootState) => state.auth.initialized;
export const selectUserRole = (state: RootState) => state.auth.user?.role;

// Selectores derivados
export const selectIsAdmin = createSelector(
  [selectUserRole],
  role => role === 'ADMIN' || role === 'SUPERADMIN'
);

export const selectIsSuperAdmin = createSelector([selectUserRole], role => role === 'SUPERADMIN');
