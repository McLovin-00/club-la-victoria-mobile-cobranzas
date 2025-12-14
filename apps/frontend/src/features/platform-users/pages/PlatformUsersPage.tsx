import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { useListPlatformUsersQuery, useDeletePlatformUserMutation } from '../api/platformUsersApiSlice';
import { RegisterUserModal } from '../components/RegisterUserModal';
import EditPlatformUserModal from '../components/EditPlatformUserModal';

const PlatformUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, refetch } = useListPlatformUsersQuery({ page, limit, search }, { refetchOnMountOrArgChange: true });
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteUser] = useDeletePlatformUserMutation();

  const handleRegister = () => setRegisterOpen(true);
  const handleSearch = () => { setPage(1); refetch(); };

  const users = data?.data || [];
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
                   <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
              <tr key={u.id}>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3">{u.role}</td>
                    <td className="px-6 py-3">{u.empresa?.nombre ?? '-'}</td>
                    <td className="px-6 py-3 text-right">
                  <div className="flex gap-3 justify-end">
                    <button className="text-sm" onClick={()=>setEditing(u)}>Editar</button>
                    <button className="text-red-600 text-sm" onClick={async()=>{ await deleteUser({ id: u.id }).unwrap(); refetch(); }}>Eliminar</button>
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

      <RegisterUserModal isOpen={isRegisterOpen} onClose={() => { setRegisterOpen(false); refetch(); }} />
      {editing && (
        <EditPlatformUserModal isOpen={!!editing} onClose={()=>{ setEditing(null); refetch(); }} user={editing} />
      )}
    </div>
  );
};

export default PlatformUsersPage;


