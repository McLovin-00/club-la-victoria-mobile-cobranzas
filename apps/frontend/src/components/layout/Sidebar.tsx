// import { NavLink, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowLeftOnRectangleIcon, BuildingOffice2Icon, Cog6ToothIcon, HomeIcon } from '@heroicons/react/24/outline';
// import { logOut, selectCurrentUser } from '../../features/auth/authSlice';
// import { apiSlice } from '../../store/apiSlice';

import { NavLink } from 'react-router-dom';
import { useServiceFlags } from '../../hooks/useServiceConfig';
import { useAppSelector } from '../../store/hooks';

export const Sidebar = () => {
  const _flags = useServiceFlags(); void _flags;
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const isSuperAdmin = userRole === 'SUPERADMIN';
  
  return (
    <div className='h-full w-60 bg-background border-r p-4 space-y-2'>
      <NavLink to='/' className='block px-3 py-2 rounded hover:bg-muted'>Dashboard</NavLink>
      <div className='text-xs text-muted-foreground px-3 pt-3'>Administración</div>
      {/* Solo SUPERADMIN puede ver Empresas del sistema principal */}
      {isSuperAdmin && (
        <NavLink to='/empresas' className='block px-3 py-2 rounded hover:bg-muted'>Empresa</NavLink>
      )}
      {/* Eliminados: Instancias, Gateway, Calidad */}
      <NavLink to='/platform-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios</NavLink>
      <NavLink to='/end-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios finales</NavLink>
    </div>
  );
};
