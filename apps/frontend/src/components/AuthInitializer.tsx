import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { initializeAuth } from '../features/auth/authSlice';
import { selectIsInitialized, selectIsAuthenticated, selectCurrentToken } from '../features/auth/authSlice';
import { webSocketService } from '../services/websocket.service';
import { useServiceFlags } from '../hooks/useServiceConfig';
import type { RootState } from '../store/store';
import { Logger } from '../lib/utils';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isInitialized = useSelector((state: RootState) => selectIsInitialized(state));
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));
  const token = useSelector((state: RootState) => selectCurrentToken(state));
  const flags = useServiceFlags();

  useEffect(() => {
    if (!isInitialized) {
      Logger.debug('AuthInitializer: Inicializando autenticación');
      dispatch(initializeAuth());
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated && location.pathname !== '/login') {
      Logger.debug('AuthInitializer: Redirigiendo a login por falta de autenticación');
      // Desconectar WebSocket al cerrar sesión
      webSocketService.disconnect();
      navigate('/login', {
        replace: true,
        state: { from: location },
      });
    }
  }, [isInitialized, isAuthenticated, location, navigate]);

  // Conectar/desconectar WebSocket según autenticación
  useEffect(() => {
    if (isAuthenticated && token && flags.documentos) {
      Logger.debug('AuthInitializer: Conectando WebSocket', { token: token?.slice(0, 10) + '...' });
      webSocketService.connect(token);
    } else {
      Logger.debug('AuthInitializer: Desconectando WebSocket');
      webSocketService.disconnect();
    }

    return () => {
      Logger.debug('AuthInitializer: Cleanup - desconectando WebSocket');
      webSocketService.disconnect();
    };
  }, [isAuthenticated, token, flags.documentos]);

  // Mostrar un loader mientras se inicializa la autenticación
  if (!isInitialized) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
      </div>
    );
  }

  return <>{children}</>;
};
