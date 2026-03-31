import { useEffect } from 'react';
import helpdeskWebSocketService from '../services/helpdeskWebsocket.service';

export function useHelpdeskRealtime(token?: string | null): void {
  useEffect(() => {
    if (!token) {
      helpdeskWebSocketService.disconnect();
      return;
    }

    helpdeskWebSocketService.connect(token);

    return () => {
      helpdeskWebSocketService.disconnect();
    };
  }, [token]);
}
