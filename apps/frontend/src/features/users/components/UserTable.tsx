import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { selectCurrentUser } from '../../auth/authSlice';
import { useGetUsuariosQuery, useDeleteUserMutation } from '../api/usersApiSlice';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { User, UserRole, UsersQueryParams } from '../types';
import { UserModal } from './UserModal';
import { Logger } from '../../../lib/utils';
import { useUserAudit } from '../hooks/useUserAudit';
import { UserIcon, BuildingOfficeIcon } from '../../../components/icons';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// Componente de confirmación de eliminación
interface DeleteConfirmationProps {
  isOpen: boolean;
  user: User | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  user,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='fixed inset-0 bg-black bg-opacity-50 transition-opacity' onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()} role="button" tabIndex={0} aria-label="Cerrar confirmación" />
      <div className='flex min-h-full items-center justify-center p-4'>
        <div className='relative bg-background rounded-lg shadow-xl max-w-md w-full p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
              <TrashIcon className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <h3 className='text-lg font-medium text-foreground'>Eliminar Usuario</h3>
              <p className='text-sm text-muted-foreground'>Esta acción no se puede deshacer</p>
            </div>
          </div>

          <div className='mb-6'>
            <p className='text-sm text-foreground'>
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className='font-medium'>{user.email}</span>?
            </p>
            <p className='text-xs text-muted-foreground mt-2'>
              Se perderán todos los datos asociados a este usuario.
            </p>
          </div>

          <div className='flex gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isLoading}
              className='flex-1'
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={onConfirm}
              disabled={isLoading}
              className='flex-1 bg-red-600 hover:bg-red-700 text-white'
            >
              {isLoading ? (
                <>
                  <Spinner className='w-4 h-4 mr-2' />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal de la tabla
export const UserTable: React.FC = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { auditUserDeletion, auditSearch, startPerformanceTracking } = useUserAudit();

  // Estados para la tabla
  const [queryParams, setQueryParams] = useState<UsersQueryParams>({
    page: 1,
    limit: 10,
    search: '',
    role: undefined,
    empresaId: undefined,
  });

  // Estados para modals y acciones
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    user: User | null;
  }>({
    isOpen: false,
    mode: 'create',
    user: null,
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Queries y mutations
  const {
    data: usersResponse,
    isLoading: loadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useGetUsuariosQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });

  const { data: empresasResponse, isLoading: loadingEmpresas } = useGetEmpresasQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersResponse?.data ?? [];
  const totalUsers = usersResponse?.total || 0;
  const empresas = empresasResponse ?? [];

  // Forzar refetch cuando cambia el usuario logueado (especialmente para admins)
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      refetchUsers();
    }
  }, [currentUser?.id, currentUser?.role, refetchUsers]);

  // Memos para optimización
  const totalPages = useMemo(
    () => Math.ceil(totalUsers / (queryParams.limit || 10)),
    [totalUsers, queryParams.limit]
  );

  const canCreateUsers = useMemo(() => {
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';
  }, [currentUser?.role]);

  const canEditUser = useCallback(
    (user: User) => {
      if (!currentUser) {
        return false;
      }

      if (currentUser.role === 'SUPERADMIN') {
        return true;
      }

      if (currentUser.role === 'ADMIN') {
        return (
          currentUser.empresaId === user.empresaId &&
          user.role !== 'ADMIN' &&
          user.role !== 'SUPERADMIN'
        );
      }

      return false;
    },
    [currentUser]
  );

  const canDeleteUser = useCallback(
    (user: User) => {
      if (!currentUser) return false;

      if (currentUser.role === 'SUPERADMIN') {
        return user.role !== 'SUPERADMIN';
      }

      if (currentUser.role === 'ADMIN') {
        return currentUser.empresaId === user.empresaId && user.role === 'OPERATOR';
      }

      return false;
    },
    [currentUser]
  );

  // Handlers
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setQueryParams(prev => ({
        ...prev,
        search: term,
        page: 1,
      }));

      // Auditar búsqueda
      if (term.length > 2) {
        // Solo auditar búsquedas significativas
        auditSearch(term, users.length, {
          role: queryParams.role,
          empresaId: queryParams.empresaId,
        });
      }
    },
    [auditSearch, users.length, queryParams.role, queryParams.empresaId]
  );

  const handleRoleFilter = useCallback((role: UserRole | '') => {
    setQueryParams(prev => ({
      ...prev,
      role: role || undefined,
      page: 1,
    }));
  }, []);

  const handleEmpresaFilter = useCallback((empresaId: number | '') => {
    setQueryParams(prev => ({
      ...prev,
      empresaId: empresaId || undefined,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handleCreateUser = useCallback(() => {
    setUserModal({
      isOpen: true,
      mode: 'create',
      user: null,
    });
  }, []);

  const handleEditUser = useCallback((user: User) => {
    setUserModal({
      isOpen: true,
      mode: 'edit',
      user,
    });
  }, []);

  const handleDeleteUser = useCallback((user: User) => {
    setDeleteConfirmation({
      isOpen: true,
      user,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation.user) return;

    const targetUser = deleteConfirmation.user;
    const actionId = `delete-${targetUser.id}`;
    startPerformanceTracking(actionId);

    try {
      await deleteUser(targetUser.id).unwrap();

      // Auditar eliminación exitosa
      auditUserDeletion(targetUser.id, targetUser.email, true);

      showToast('Usuario eliminado exitosamente', 'success');
      Logger.debug('Usuario eliminado:', targetUser.id);
      setDeleteConfirmation({ isOpen: false, user: null });
      refetchUsers();
    } catch (error) {
      // Auditar eliminación fallida
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      auditUserDeletion(targetUser.id, targetUser.email, false, errorMessage);

      Logger.error('Error al eliminar usuario:', error);
      showToast('Error al eliminar usuario', 'error');
    }
  }, [
    deleteConfirmation.user,
    deleteUser,
    refetchUsers,
    auditUserDeletion,
    startPerformanceTracking,
  ]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setQueryParams({
      page: 1,
      limit: 10,
      search: '',
      role: undefined,
      empresaId: undefined,
    });
  }, []);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'Superadministrador';
      case 'ADMIN':
        return 'Administrador';
      case 'OPERATOR':
        return 'Usuario';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'OPERATOR':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Render error state
  if (usersError) {
    return (
      <Card className='p-6'>
        <div className='text-center'>
          <div className='text-red-500 mb-2'>Error al cargar usuarios</div>
          <Button onClick={() => refetchUsers()} variant='outline'>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header con acciones */}
      <div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Gestión de Usuarios</h1>
          <p className='text-sm text-muted-foreground mb-4'>
            Gestiona los usuarios del sistema. Los usuarios pueden ser asignados a empresas
            específicas para controlar el acceso a las tareas.
          </p>
        </div>

        {canCreateUsers && (
          <Button onClick={handleCreateUser} className='w-full sm:w-auto'>
            <UserIcon className='w-4 h-4 mr-2' />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <Card className='p-4'>
        <div className='flex flex-col lg:flex-row gap-4'>
          {/* Búsqueda */}
          <div className='flex-1'>
            <div className='relative'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <input
                type='text'
                placeholder='Buscar por email...'
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
          </div>

          {/* Botón de filtros */}
          <Button
            variant='outline'
            onClick={() => setShowFilters(!showFilters)}
            className='lg:w-auto w-full'
          >
            <FunnelIcon className='w-4 h-4 mr-2' />
            Filtros
            {showFilters && ' (Activos)'}
          </Button>
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div className='mt-4 pt-4 border-t border-border'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {/* Filtro por rol */}
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Filtrar por rol
                </label>
                <select
                  value={queryParams.role ?? ''}
                  onChange={e => handleRoleFilter(e.target.value as UserRole | '')}
                  className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value=''>Todos los roles</option>
                  <option value='OPERATOR'>Usuario</option>
                  <option value='ADMIN'>Administrador</option>
                  {currentUser?.role === 'SUPERADMIN' && (
                    <option value='SUPERADMIN'>Superadministrador</option>
                  )}
                </select>
              </div>

              {/* Filtro por empresa */}
              {currentUser?.role === 'SUPERADMIN' && (
                <div>
                  <label className='block text-sm font-medium text-foreground mb-2'>
                    Filtrar por empresa
                  </label>
                  <select
                    value={queryParams.empresaId ?? ''}
                    onChange={e =>
                      handleEmpresaFilter(e.target.value ? parseInt(e.target.value) : '')
                    }
                    className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                    disabled={loadingEmpresas}
                  >
                    <option value=''>Todas las empresas</option>
                    {empresas.map((empresa: any) => (
                      <option key={empresa.id} value={empresa.id.toString()}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Limpiar filtros */}
              <div className='flex items-end'>
                <Button variant='outline' onClick={resetFilters} className='w-full'>
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Usuario
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Rol
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Empresa
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Fecha de creación
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className='bg-background divide-y divide-border'>
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} className='px-6 py-12 text-center'>
                    <div className='flex items-center justify-center'>
                      <Spinner className='w-6 h-6 mr-2' />
                      <span className='text-muted-foreground'>Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-6 py-12 text-center'>
                    <div className='text-muted-foreground'>
                      {queryParams.search || queryParams.role || queryParams.empresaId
                        ? 'No se encontraron usuarios con los filtros aplicados'
                        : 'No hay usuarios registrados'}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className='hover:bg-muted/25 transition-colors'>
                    {/* Usuario */}
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-8 w-8'>
                          <div className='h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium'>
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className='ml-3'>
                          <div className='text-sm font-medium text-foreground'>{user.email}</div>
                          <div className='text-xs text-muted-foreground'>ID: {user.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    {/* Empresa */}
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {user.empresa ? (
                        <div className='flex items-center text-sm text-foreground'>
                          <BuildingOfficeIcon className='h-4 w-4 mr-2 text-muted-foreground' />
                          {user.empresa.nombre}
                        </div>
                      ) : (
                        <span className='text-sm text-muted-foreground'>Sin empresa</span>
                      )}
                    </td>

                    {/* Fecha de creación */}
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </td>

                    {/* Acciones */}
                    <td className='px-6 py-4 whitespace-nowrap text-center'>
                      <div className='flex items-center justify-center space-x-2'>
                        {canEditUser(user) && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleEditUser(user)}
                            className='h-8 w-8 p-0'
                            title='Editar usuario'
                          >
                            <PencilIcon className='h-4 w-4' />
                          </Button>
                        )}

                        {canDeleteUser(user) && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDeleteUser(user)}
                            className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300'
                            title='Eliminar usuario'
                          >
                            <TrashIcon className='h-4 w-4' />
                          </Button>
                        )}

                        {!canEditUser(user) && !canDeleteUser(user) && (
                          <span className='text-xs text-muted-foreground'>Sin acciones</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className='bg-muted/25 px-6 py-3 border-t border-border'>
            <div className='flex items-center justify-between'>
              <div className='text-sm text-muted-foreground'>
                Mostrando {users.length} de {totalUsers} usuarios
              </div>

              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange((queryParams.page || 1) - 1)}
                  disabled={(queryParams.page || 1) <= 1}
                  className='h-8 w-8 p-0'
                >
                  <ChevronLeftIcon className='h-4 w-4' />
                </Button>

                <span className='text-sm text-foreground px-3'>
                  Página {queryParams.page || 1} de {totalPages}
                </span>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange((queryParams.page || 1) + 1)}
                  disabled={(queryParams.page || 1) >= totalPages}
                  className='h-8 w-8 p-0'
                >
                  <ChevronRightIcon className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de usuario */}
      <UserModal
        isOpen={userModal.isOpen}
        mode={userModal.mode}
        user={userModal.user}
        onClose={() => setUserModal({ isOpen: false, mode: 'create', user: null })}
      />

      {/* Confirmación de eliminación */}
      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        user={deleteConfirmation.user}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, user: null })}
        isLoading={isDeleting}
      />
    </div>
  );
};
