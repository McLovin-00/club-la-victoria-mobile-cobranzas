import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { useListEndUsersQuery, useCreateEndUserMutation, useUpdateEndUserMutation, useDeleteEndUserMutation } from '../api/endUsersApiSlice';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import EndUserModal from '../components/EndUserModal';

const EndUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [identifierType, setIdentifierType] = useState('');
  const [isActive, setIsActive] = useState('');
  const { data, isLoading, refetch } = useListEndUsersQuery({ search, empresaId: empresaId === '' ? undefined : empresaId, identifierType: identifierType || undefined, isActive: isActive === '' ? undefined : isActive === 'true', page: 1, limit: 50 });
  const [createEndUser] = useCreateEndUserMutation();
  const [updateEndUser] = useUpdateEndUserMutation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteEndUser] = useDeleteEndUserMutation();

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (user: any) => { setEditing(user); setModalOpen(true); };
  const { data: empresas = [] } = useGetEmpresasQuery();

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios Finales</h1>
          <p className="text-muted-foreground text-sm">Listado de end_users con filtros</p>
        </div>
        <div className="flex gap-2 items-center">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar" className="px-3 py-2 border rounded-md" />
          <select value={empresaId} onChange={(e)=>setEmpresaId(e.target.value ? Number(e.target.value) : '')} className="px-2 py-2 border rounded-md">
            <option value=''>Todas</option>
            {empresas.map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
          </select>
          <select value={identifierType} onChange={(e)=>setIdentifierType(e.target.value)} className="px-2 py-2 border rounded-md">
            <option value=''>Todos</option>
            <option value='email'>email</option>
            <option value='whatsapp'>whatsapp</option>
            <option value='telegram'>telegram</option>
            <option value='facebook'>facebook</option>
          </select>
          <select value={isActive} onChange={(e)=>setIsActive(e.target.value)} className="px-2 py-2 border rounded-md">
            <option value=''>Todos</option>
            <option value='true'>Activos</option>
            <option value='false'>Inactivos</option>
          </select>
          <Button onClick={()=>refetch()}>Filtrar</Button>
          <Button onClick={openCreate}>Nuevo</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Spinner className="w-6 h-6" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Identificador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3">{u.empresa?.nombre ?? '-'}</td>
                    <td className="px-6 py-3">{u.identifierType}:{u.identifier_value}</td>
                    <td className="px-6 py-3">{u.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-6 py-3">{[u.nombre,u.apellido].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={()=>openEdit(u)}>Editar</Button>
                        <Button variant="destructive" onClick={async()=>{ await deleteEndUser({ id: u.id }).unwrap(); refetch(); }}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <EndUserModal
          isOpen={isModalOpen}
          onClose={()=>setModalOpen(false)}
          initial={editing}
          onSubmit={async (values)=>{
            if (editing) {
              await updateEndUser({ id: editing.id, data: values }).unwrap();
            } else {
              await createEndUser(values).unwrap();
            }
            setModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default EndUsersPage;


