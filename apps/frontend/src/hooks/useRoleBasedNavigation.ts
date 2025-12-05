import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../features/auth/authSlice';

/**
 * Hook que proporciona navegación basada en el rol del usuario.
 * Centraliza la lógica de redirección para mantener consistencia en toda la app.
 */
export function useRoleBasedNavigation() {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);

  /**
   * Obtiene la ruta "home" según el rol del usuario
   */
  const getHomeRoute = useCallback((): string => {
    if (!user) return '/login';

    switch (user.role) {
      case 'ADMIN_INTERNO':
        return '/portal/admin-interno';
      case 'DADOR_DE_CARGA':
        return '/dador';
      case 'TRANSPORTISTA':
      case 'EMPRESA_TRANSPORTISTA':
        return '/transportista';
      case 'CHOFER':
        return '/chofer';
      case 'CLIENTE':
      case 'CLIENTE_TRANSPORTE':
        return '/cliente';
      case 'SUPERADMIN':
      case 'ADMIN':
        return '/';
      default:
        return '/';
    }
  }, [user]);

  /**
   * Navega a la página principal del usuario según su rol
   */
  const goToHome = useCallback(() => {
    navigate(getHomeRoute());
  }, [navigate, getHomeRoute]);

  /**
   * Navega hacia atrás de forma inteligente:
   * - Si hay historial, usa navigate(-1)
   * - Si no hay historial (entrada directa), va al home del rol
   */
  const goBack = useCallback(() => {
    // window.history.length > 2 porque siempre hay al menos 2 entradas (la inicial + la actual)
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(getHomeRoute());
    }
  }, [navigate, getHomeRoute]);

  /**
   * Obtiene la ruta base de documentos según el rol
   */
  const getDocumentosBaseRoute = useCallback((): string => {
    if (!user) return '/documentos';

    switch (user.role) {
      case 'CLIENTE':
      case 'CLIENTE_TRANSPORTE':
        return '/cliente';
      case 'TRANSPORTISTA':
      case 'EMPRESA_TRANSPORTISTA':
        return '/transportista';
      case 'CHOFER':
        return '/chofer';
      case 'DADOR_DE_CARGA':
        return '/dador';
      case 'ADMIN_INTERNO':
        return '/portal/admin-interno';
      default:
        return '/documentos';
    }
  }, [user]);

  return {
    user,
    getHomeRoute,
    goToHome,
    goBack,
    getDocumentosBaseRoute,
  };
}

