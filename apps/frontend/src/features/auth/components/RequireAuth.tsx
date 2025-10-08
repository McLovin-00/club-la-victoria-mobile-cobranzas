
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectIsAuthenticated } from '../authSlice';
import { UserRole } from '../types';

interface RequireAuthProps {
  allowedRoles?: UserRole[];
}

export const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Redirigir a login manteniendo la ubicación actual
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Si se especifican roles permitidos, verificar que el usuario tenga uno de ellos
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.includes(user.role as UserRole);

    if (!hasAllowedRole) {
      // El usuario no tiene el rol requerido, redirigir al dashboard
      return <Navigate to='/' replace />;
    }
  }

  // El usuario está autenticado y tiene los permisos necesarios
  return <Outlet />;
};
