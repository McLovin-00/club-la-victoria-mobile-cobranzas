import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { useListPlatformUsersQuery, useDeletePlatformUserMutation, useToggleUserActivoMutation } from '../api/platformUsersApiSlice';
import { showToast } from '../../../components/ui/Toast.utils';
import { RegisterUserModal } from '../components/RegisterUserModal';
import EditPlatformUserModal from '../components/EditPlatformUserModal';

const PlatformUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, refetch } = useListPlatformUsersQuery({ page, limit, search }, { refetchOnMountOrArgChange: true });
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteUser, { isLoading: isDeleting }] = useDeletePlatformUserMutation();
  const [toggleActivo] = useToggleUserActivoMutation();
  const [confirmingDelete, setConfirmingDelete] = useState<{ id: number; email: string } | null>(null);
  const [confirmingToggle, setConfirmingToggle] = useState<{ id: number; email: string; activo: boolean } | null>(null);

  const handleConfirmToggle = async () => {
    if (!confirmingToggle) return;
    try {
      await toggleActivo({ id: confirmingToggle.id, activo: !confirmingToggle.activo }).unwrap();
      showToast(`Usuario ${!confirmingToggle.activo ? 'activado' : 'desactivado'} exitosamente`, 'success');
    } catch (e: any) {
      showToast(e?.data?.message || 'Error al cambiar estado', 'error');
    } finally {
      setConfirmingToggle(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmingDelete) return;
    try {
      await deleteUser({ id: confirmingDelete.id }).unwrap();
      showToast('Usuario eliminado exitosamente', 'success');
      refetch();
    } catch (e: any) {
      showToast(e?.data?.message || 'Error al eliminar usuario', 'error');
    } finally {
      setConfirmingDelete(null);
    }
  };

  const handleRegister = () => setRegisterOpen(true);
  const handleSearch = () => { setPage(1); refetch(); };

  const users = data?.data ?? [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios de Plataforma</h1>
          <p className="text-muted-foreground text-sm">Gestión de administradores y operadores</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre"
            className="px-3 py-2 border border-border rounded-md"
          />
          <Button onClick={handleSearch}>Buscar</Button>
          <Button onClick={handleRegister}>
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                 <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Empresa</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
              <tr key={u.id} className={u.activo === false ? 'opacity-50 bg-muted/30' : ''}>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3">{u.role}</td>
                    <td className="px-6 py-3">{u.empresa?.nombre ?? '-'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.activo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                  <div className="flex gap-3 justify-end">
                    <button className="text-sm" onClick={()=>setEditing(u)}>Editar</button>
                    <button 
                      className={`text-sm ${u.activo !== false ? 'text-orange-600' : 'text-green-600'}`} 
                      onClick={() => setConfirmingToggle({ id: u.id, email: u.email, activo: u.activo !== false })}
                    >
                      {u.activo !== false ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="text-red-600 text-sm"
                      onClick={() => setConfirmingDelete({ id: u.id, email: u.email })}
                    >
                      Eliminar
                    </button>
                  </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} usuarios
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="px-3 py-1 text-sm">
              Página {page} de {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmingDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmingDelete(null)}
          onKeyDown={(e) => e.key === 'Escape' && setConfirmingDelete(null)}
          role="button"
          tabIndex={0}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-lg">🗑️</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Eliminar Usuario</h3>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className="font-medium">{confirmingDelete.email}</span>?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmingDelete(null)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de activar/desactivar */}
      {confirmingToggle && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmingToggle(null)}
          onKeyDown={(e) => e.key === 'Escape' && setConfirmingToggle(null)}
          role="button"
          tabIndex={0}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${confirmingToggle.activo ? 'bg-orange-100' : 'bg-green-100'}`}>
                <span className="text-lg">{confirmingToggle.activo ? '⏸️' : '▶️'}</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  {confirmingToggle.activo ? 'Desactivar' : 'Activar'} Usuario
                </h3>
                <p className="text-sm text-muted-foreground">
                  {confirmingToggle.activo
                    ? 'El usuario no podrá ingresar al sistema'
                    : 'El usuario podrá volver a ingresar al sistema'}
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">
              {confirmingToggle.activo ? '¿Estás seguro de que deseas desactivar' : '¿Estás seguro de que deseas activar'} al usuario{' '}
              <span className="font-medium">{confirmingToggle.email}</span>?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmingToggle(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmToggle}
                className={`flex-1 text-white ${confirmingToggle.activo ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {confirmingToggle.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <RegisterUserModal isOpen={isRegisterOpen} onClose={() => { setRegisterOpen(false); refetch(); }} />
      {editing && (
        <EditPlatformUserModal isOpen={!!editing} onClose={()=>{ setEditing(null); refetch(); }} user={editing} />
      )}
    </div>
  );
};

export default PlatformUsersPage;
