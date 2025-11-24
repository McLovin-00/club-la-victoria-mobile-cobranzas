import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice';
import { SuperAdminDashboard } from '../features/dashboard/components/SuperAdminDashboard';
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { UserDashboard } from '../features/dashboard/components/UserDashboard';

// Exportación predeterminada que actúa como un router según el rol del usuario
export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();

  // Redirigir usuarios con portales específicos
  useEffect(() => {
    if (user?.role) {
      switch (user.role) {
        case 'ADMIN_INTERNO':
          navigate('/portal/admin-interno', { replace: true });
          break;
        case 'DADOR_DE_CARGA':
          navigate('/portal/dadores', { replace: true });
          break;
        case 'TRANSPORTISTA':
        case 'CHOFER':
          navigate('/portal/transportistas', { replace: true });
          break;
        case 'CLIENTE':
          navigate('/portal/cliente', { replace: true });
          break;
        // SUPERADMIN y ADMIN se quedan en el dashboard
      }
    }
  }, [user?.role, navigate]);

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
