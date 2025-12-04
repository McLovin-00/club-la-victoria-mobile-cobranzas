import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice';
import { SuperAdminDashboard } from '../features/dashboard/components/SuperAdminDashboard';
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { UserDashboard } from '../features/dashboard/components/UserDashboard';

// Exportación predeterminada que actúa como un router según el rol del usuario
export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  // Si no hay usuario, no hacer nada (RequireAuth se encargará)
  if (!user) {
    return null;
  }

  // Si estamos en '/' (raíz), redirigir según el rol
  // Si estamos en '/dashboard' explícito, mostrar el dashboard correspondiente
  const isRootPath = location.pathname === '/';

  if (isRootPath) {
    // Redirecciones desde raíz según rol
    switch (user.role) {
      case 'ADMIN_INTERNO':
        return <Navigate to='/documentos' replace />;
      case 'DADOR_DE_CARGA':
        return <Navigate to='/dador' replace />;
      case 'TRANSPORTISTA':
      case 'EMPRESA_TRANSPORTISTA':
      case 'CHOFER':
        return <Navigate to='/transportista' replace />;
      case 'CLIENTE':
      case 'CLIENTE_TRANSPORTE':
        return <Navigate to='/cliente' replace />;
      case 'SUPERADMIN':
      case 'ADMIN':
        // SUPERADMIN y ADMIN pueden estar en raíz, mostrar su dashboard
        break;
      default:
        // Cualquier otro rol por defecto
        break;
    }
  }

  // Determinar el tipo de dashboard según el rol del usuario
  if (user.role === 'SUPERADMIN') {
    return <SuperAdminDashboard />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // Por defecto, mostrar el dashboard para usuario normal
  return <UserDashboard />;
}
