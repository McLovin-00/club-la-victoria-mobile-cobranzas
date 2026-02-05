import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../../features/auth/authSlice';
import {
  BuildingOfficeIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '../ui/theme-toggle';
import { Logger } from '../../lib/utils';
import { useServiceFlags } from '../../hooks/useServiceConfig';
import bcaLogo from '../../assets/logo-bca.jpg';
import { NotificationBell } from '../notifications/NotificationBell';
// Tenant selector removido de la UI: el tenant se toma del empresaId del usuario

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const _dispatch = useDispatch();

  return (
    <div className='h-screen bg-background overflow-hidden flex flex-col'>
      {/* Barra superior */}
      <header className='bg-card border-b border-border h-16 z-30 shadow-md px-4 md:px-6 flex-shrink-0'>
        <div className='flex items-center justify-between h-full'>
          {/* Logo y toggle */}
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className='p-2 rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none'
              aria-label='Toggle menu'
            >
              {sidebarOpen ? <XMarkIcon className='h-5 w-5' /> : <Bars3Icon className='h-5 w-5' />}
            </button>
            <Link to='/' className='flex items-center gap-2'>
              <img
                src={bcaLogo}
                alt='Grupo BCA'
                className='h-12 w-auto object-contain'
                loading='eager'
              />
            </Link>
          </div>

          {/* Menú Usuario (tenant oculto; se deriva de empresaId) */}
          <div className='flex items-center gap-3'>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar - fijo en móviles, integrado en escritorio */}
        <aside
          className={`fixed inset-y-0 pt-16 left-0 z-20 w-64 transform transition-transform duration-300 ease-in-out 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:pt-0 lg:static lg:translate-x-0 ${sidebarOpen ? 'lg:block' : 'lg:hidden'}`}
        >
          <div className='h-full bg-card border-r border-border shadow-sm overflow-y-auto'>
            <SidebarContent closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </aside>

        {/* Overlay para cerrar sidebar en móviles */}
        {sidebarOpen && (
          <div
            className='fixed inset-0 bg-foreground/20 backdrop-blur-sm z-10 lg:hidden'
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Cerrar menú"
          />
        )}

        {/* Contenido principal - Expandible*/}
        <main
          className={`flex-1 overflow-auto p-4 sm:p-6 md:p-8 transition-all duration-300 ease-in-out w-full bg-background`}
        >
          <div className='max-w-7xl mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Menú de usuario en la cabecera
const UserMenu = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Función para obtener la etiqueta de rol según el tipo de usuario
  const getRoleLabel = (role?: string): string => {
    if (!role) return 'Usuario';

    switch (role) {
      case 'SUPERADMIN':
        return 'Superadministrador';
      case 'ADMIN':
        return 'Administrador';
      case 'OPERATOR':
        return 'Usuario de empresa';
      default:
        return 'Usuario';
    }
  };

  return (
    <div className='relative flex items-center gap-2'>
      <ThemeToggle />

      <button
        className='flex items-center gap-2 p-2 rounded-full hover:bg-accent transition-colors'
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium shadow-sm'>
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className='text-sm font-medium text-foreground hidden md:block'>
          {user?.email?.split('@')[0] || 'Usuario'}
        </span>
      </button>

      {menuOpen && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setMenuOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)} role="button" tabIndex={0} aria-label="Cerrar menú de usuario"></div>
          <div className='absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-sm border border-border z-50 top-full'>
            <div className='p-4 border-b border-border bg-muted'>
              <p className='text-sm font-medium text-foreground'>{user?.email}</p>
              <p className='text-xs text-muted-foreground mt-1'>{getRoleLabel(user?.role)}</p>
            </div>
            <div className='p-2'>
              <Link
                to='/perfil'
                className='flex items-center gap-2 p-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors'
                onClick={() => setMenuOpen(false)}
              >
                <UserCircleIcon className='h-5 w-5 text-muted-foreground' />
                Mi Perfil
              </Link>
              <button
                onClick={handleLogout}
                className='w-full flex items-center gap-2 p-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors mt-1'
              >
                <ArrowLeftOnRectangleIcon className='h-5 w-5' />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Contenido de la barra lateral
interface SidebarContentProps {
  closeSidebar: () => void;
}

const SidebarContent = ({ closeSidebar }: SidebarContentProps) => {
  const user = useSelector(selectCurrentUser);
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isAdminInterno = user?.role === 'ADMIN_INTERNO';
  const isDadorDeCarga = user?.role === 'DADOR_DE_CARGA';
  const isTransportista = user?.role === 'TRANSPORTISTA';
  const isChofer = user?.role === 'CHOFER';
  
  // SUPERADMIN tiene acceso a las mismas funcionalidades que ADMIN_INTERNO
  const hasAdminInternoAccess = isAdminInterno || isSuperAdmin || isAdmin;
  
  // Roles que pueden gestionar usuarios (crear/editar)
  const _canManageUsers = isAdmin || isAdminInterno || isDadorDeCarga || isTransportista;
  
  // Obtener configuración de servicios
  const serviceFlags = useServiceFlags();

  // Usar Logger en lugar de console.log
  Logger.debug('Estado del usuario en Sidebar:', {
    role: user?.role,
    empresaId: user?.empresaId,
    isSuperAdmin,
    isAdmin,
    services: serviceFlags,
  });

  return (
    <div className='py-6 px-3'>
      <nav className='space-y-6'>
        {/* Navegación principal */}
        <nav className='px-4 py-4 space-y-2'>
          {/* Dashboard - Para todos los usuarios autenticados */}
          <NavItem to='/' icon={HomeIcon} text='Dashboard' closeSidebar={closeSidebar} />
          {/* Documentos Rechazados - Para todos, filtrado por rol en backend */}
          {serviceFlags.documentos && (
            <NavItem
              to='/documentos/rechazados'
              icon={ExclamationTriangleIcon}
              text='Docs Rechazados'
              closeSidebar={closeSidebar}
            />
          )}
        </nav>

        {/* Sección de gestión - Para ADMIN_INTERNO, SUPERADMIN, ADMIN */}
        {hasAdminInternoAccess && (
          <div>
            <h3 className='px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Gestión
            </h3>
            <div className='mt-3 space-y-1'>
              {/* Portal Admin Interno - Acceso rápido a alta y consulta de equipos */}
              <NavItem
                to='/portal/admin-interno'
                icon={TruckIcon}
                text='Portal Equipos'
                closeSidebar={closeSidebar}
              />
              <NavItem
                to='/platform-users'
                icon={UsersIcon}
                text='Usuarios'
                closeSidebar={closeSidebar}
              />
              {/* Remitos - visible para roles administrativos */}
              <NavItem
                to='/remitos'
                icon={ClipboardDocumentCheckIcon}
                text='Remitos'
                closeSidebar={closeSidebar}
              />
              {/* Transferencias - gestión de solicitudes de transferencia */}
              <NavItem
                to='/admin/transferencias'
                icon={ArrowsRightLeftIcon}
                text='Transferencias'
                closeSidebar={closeSidebar}
              />
            </div>
          </div>
        )}

        {/* Sección de gestión - Para DADOR_DE_CARGA y TRANSPORTISTA */}
        {(isDadorDeCarga || isTransportista) && (
          <div>
            <h3 className='px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Gestión
            </h3>
            <div className='mt-3 space-y-1'>
              <NavItem
                to='/platform-users'
                icon={UsersIcon}
                text='Usuarios'
                closeSidebar={closeSidebar}
              />
              {/* Remitos - visible para todos los roles que suben remitos */}
              <NavItem
                to='/remitos'
                icon={ClipboardDocumentCheckIcon}
                text='Remitos'
                closeSidebar={closeSidebar}
              />
            </div>
          </div>
        )}

        {/* Sección para CHOFER - Solo Remitos (acceso a equipos desde Dashboard) */}
        {isChofer && (
          <div>
            <h3 className='px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Gestión
            </h3>
            <div className='mt-3 space-y-1'>
              {/* Remitos - visible para CHOFER */}
              <NavItem
                to='/remitos'
                icon={ClipboardDocumentCheckIcon}
                text='Remitos'
                closeSidebar={closeSidebar}
              />
            </div>
          </div>
        )}

        {/* Sección de administración - Solo visible para admin/superadmin (funciones exclusivas) */}
        {isAdmin && (
          <div>
            <h3 className='px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Administración
            </h3>
            <div className='mt-3 space-y-1'>
              {/* Gestión de empresas - Solo para superadmin */}
              {isSuperAdmin && (
                <NavItem
                  to='/empresas'
                  icon={BuildingOfficeIcon}
                  text='Empresa'
                  closeSidebar={closeSidebar}
                />
              )}

              {/* Usuarios finales (admin/superadmin) */}
              {isSuperAdmin && (
                <NavItem
                  to='/end-users'
                  icon={UsersIcon}
                  text='Usuarios finales'
                  closeSidebar={closeSidebar}
                />
              )}

              {/* Gestión de Documentos - Solo si está habilitado */}
              {serviceFlags.documentos && (
                <>
                  <NavItem
                    to='/documentos'
                    icon={DocumentTextIcon}
                    text='Documentos'
                    closeSidebar={closeSidebar}
                  />
                  <NavItem
                    to='/documentos/rechazados'
                    icon={ExclamationTriangleIcon}
                    text='Rechazados'
                    closeSidebar={closeSidebar}
                  />
                </>
              )}

              {/* Eliminado: Calidad (QMS) */}


            </div>
          </div>
        )}

        {/* Sección de configuración */}
        <div>
          <h3 className='px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            Configuración
          </h3>
          <div className='mt-3 space-y-1'>
            <NavItem
              to='/perfil'
              icon={UserCircleIcon}
              text='Mi Perfil'
              closeSidebar={closeSidebar}
            />
          </div>
        </div>
      </nav>

      {/* Footer con versión */}
      <div className='mt-auto'>
        <div className='border-t border-border pt-4'>
          <p className='text-xs text-muted-foreground text-center'>MKT v1.0</p>
        </div>
      </div>
    </div>
  );
};

// Item de navegación en la sidebar
interface NavItemProps {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  text: string;
  badge?: string;
  closeSidebar: () => void;
}

const NavItem = ({ to, icon: Icon, text, badge, closeSidebar }: NavItemProps) => {
  // Función para precargar componentes en hover
  const handleMouseEnter = () => {
    // Preload específico basado en la ruta
    if (to === '/empresas') {
      // Preload del componente EmpresasPage y sus datos
      import('../../features/empresas/pages/EmpresasPage.lazy').then(() => {
        import('../../features/empresas/pages/EmpresasPage');
      });
      
      // Prefetch de datos de empresas
      import('../../features/empresas/api/empresasApiSlice').then(({ empresasApiSlice }) => {
        empresasApiSlice.util.prefetch('getEmpresas', undefined, { force: false });
      });
    }
    
    // Ruta '/usuarios' removida

    // Eliminado: preloads de instancias
  };

  // Cerrar el sidebar en dispositivos móviles cuando se hace clic en un enlace
  const handleClick = () => {
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-3 rounded-md transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-foreground hover:bg-muted'
        }`
      }
      onClick={handleClick}
      onMouseEnter={handleMouseEnter} // Agregar preloading en hover
    >
      {({ isActive }) => (
        <>
          <div className='flex items-center'>
            <Icon
              className={`h-5 w-5 mr-3 flex-shrink-0 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span className='text-sm'>{text}</span>
          </div>

          {badge && (
            <span className='ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary'>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};
