import React, { useEffect, useState } from 'react';
import { webSocketService } from '../services/websocket.service';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { RootState } from '../store/store';

/**
 * Componente opcional para mostrar el estado de la conexión WebSocket
 */
export const WebSocketStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string>('');
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));

  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnected(false);
      setConnectionId('');
      return;
    }

    const checkConnection = () => {
      const connected = webSocketService.isConnected();
      const socketId = webSocketService.getSocketId() ?? '';
      
      setIsConnected(connected);
      setConnectionId(socketId);
    };

    // Verificar estado inicial
    checkConnection();

    // Verificar cada 2 segundos
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-all
        ${isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}>
        <div className={`
          w-2 h-2 rounded-full 
          ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
        `} />
        <span>
          {isConnected ? 'Tiempo Real Activo' : 'Sin Conexión TR'}
        </span>
        {isConnected && connectionId && (
          <span className="text-green-600 font-mono text-xs">
            {connectionId.slice(0, 6)}
          </span>
        )}
      </div>
    </div>
  );
};
