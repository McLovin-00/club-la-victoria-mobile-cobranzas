// import { NavLink, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import { ArrowLeftOnRectangleIcon, BuildingOffice2Icon, Cog6ToothIcon, HomeIcon } from '@heroicons/react/24/outline';
// import { logOut, selectCurrentUser } from '../../features/auth/authSlice';
// import { apiSlice } from '../../store/apiSlice';

import { NavLink } from 'react-router-dom';
import { useServiceFlags } from '../../hooks/useServiceConfig';

export const Sidebar = () => {
  const flags = useServiceFlags();
  return (
    <div className='h-full w-60 bg-background border-r p-4 space-y-2'>
      <NavLink to='/' className='block px-3 py-2 rounded hover:bg-muted'>Dashboard</NavLink>
      <div className='text-xs text-muted-foreground px-3 pt-3'>Administración</div>
      <NavLink to='/empresas' className='block px-3 py-2 rounded hover:bg-muted'>Empresas</NavLink>
      {/* Eliminados: Instancias, Gateway, Calidad */}
      <NavLink to='/platform-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios (plataforma)</NavLink>
      <NavLink to='/end-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios finales</NavLink>
    </div>
  );
};
