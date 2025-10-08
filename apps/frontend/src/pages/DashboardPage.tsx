
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { SuperAdminDashboard } from '../features/dashboard/components/SuperAdminDashboard';
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { UserDashboard } from '../features/dashboard/components/UserDashboard';

// Exportación predeterminada que actúa como un router según el rol del usuario
export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);

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
