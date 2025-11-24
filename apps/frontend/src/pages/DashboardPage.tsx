import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice';
import { SuperAdminDashboard } from '../features/dashboard/components/SuperAdminDashboard';
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { UserDashboard } from '../features/dashboard/components/UserDashboard';

// Exportación predeterminada que actúa como un router según el rol del usuario
export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);

  // Redirigir usuarios con portales específicos (NO renderizar nada, solo redirigir)
  if (user?.role) {
    switch (user.role) {
      case 'ADMIN_INTERNO':
        return <Navigate to='/portal/admin-interno' replace />;
      case 'DADOR_DE_CARGA':
        return <Navigate to='/portal/dadores' replace />;
      case 'TRANSPORTISTA':
      case 'CHOFER':
        return <Navigate to='/portal/transportistas' replace />;
      case 'CLIENTE':
        return <Navigate to='/portal/cliente' replace />;
    }
  }

  // Determinar el tipo de dashboard según el rol del usuario
  if (user?.role === 'SUPERADMIN') {
    return <SuperAdminDashboard />;
  }

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // Por defecto, mostrar el dashboard para usuario normal
  return <UserDashboard />;
}
