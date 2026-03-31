import { NavLink } from 'react-router-dom';
import { useServiceFlags } from '../../hooks/useServiceConfig';
import { useAppSelector } from '../../store/hooks';

export const Sidebar = () => {
  const _flags = useServiceFlags(); void _flags;
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const isSuperAdmin = userRole === 'SUPERADMIN';
  
  // Roles que pueden acceder al panel admin de helpdesk
  const isHelpdeskStaff = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'RESOLVER';
  
  return (
    <div className='h-full w-60 bg-background border-r p-4 space-y-2'>
      <NavLink to='/' className='block px-3 py-2 rounded hover:bg-muted'>Dashboard</NavLink>
      <div className='text-xs text-muted-foreground px-3 pt-3'>Administración</div>
      {/* Solo SUPERADMIN puede ver Empresas del sistema principal */}
      {isSuperAdmin && (
        <NavLink to='/empresas' className='block px-3 py-2 rounded hover:bg-muted'>Empresa</NavLink>
      )}
      <NavLink to='/platform-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios</NavLink>
      <NavLink to='/end-users' className='block px-3 py-2 rounded hover:bg-muted'>Usuarios finales</NavLink>
      
      {/* Panel Admin Helpdesk - visible para RESOLVER, ADMIN, SUPERADMIN */}
      {isHelpdeskStaff && (
        <>
          <div className='text-xs text-muted-foreground px-3 pt-3'>Mesa de Ayuda</div>
          <NavLink to='/admin/helpdesk' className='block px-3 py-2 rounded hover:bg-muted'>
            Panel Admin
          </NavLink>
        </>
      )}
    </div>
  );
};
