import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { useListPlatformUsersQuery, useDeletePlatformUserMutation } from '../api/platformUsersApiSlice';
import { RegisterUserModal } from '../components/RegisterUserModal';
import EditPlatformUserModal from '../components/EditPlatformUserModal';

const PlatformUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useListPlatformUsersQuery({ page: 1, limit: 20, search });
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteUser] = useDeletePlatformUserMutation();

  const handleRegister = () => setRegisterOpen(true);

  const users = data?.data || [];

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
          <Button onClick={() => refetch()}>Buscar</Button>
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

      <RegisterUserModal isOpen={isRegisterOpen} onClose={() => { setRegisterOpen(false); refetch(); }} />
      {editing && (
        <EditPlatformUserModal isOpen={!!editing} onClose={()=>{ setEditing(null); refetch(); }} user={editing} />
      )}
    </div>
  );
};

export default PlatformUsersPage;


