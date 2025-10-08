import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useUpdatePlatformUserMutation } from '../api/platformUsersApiSlice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';
    empresaId?: number | null;
    nombre?: string | null;
    apellido?: string | null;
  };
}

type FormData = {
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';
  empresaId?: number | '';
  nombre?: string;
  apellido?: string;
  password?: string;
};

const EditPlatformUserModal: React.FC<Props> = ({ isOpen, onClose, user }) => {
  const { data: empresas = [] } = useGetEmpresasQuery();
  const [updateUser, { isLoading }] = useUpdatePlatformUserMutation();

  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      email: user.email,
      role: user.role,
      empresaId: user.empresaId ?? '',
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      password: '',
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    await updateUser({
      id: user.id,
      data: {
        email: data.email,
        role: data.role,
        empresaId: data.empresaId ? Number(data.empresaId) : null,
        nombre: data.nombre,
        apellido: data.apellido,
        ...(data.password ? { password: data.password } : {}),
      },
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-background rounded-lg shadow-xl w-full max-w-xl p-6">
          <h3 className="text-lg font-medium mb-6">Editar Usuario de Plataforma</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <Controller name="email" control={control} render={({ field }) => (
                  <input type="email" className="w-full px-3 py-2 border rounded-md" {...field} />
                )} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Controller name="nombre" control={control} render={({ field }) => (
                  <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                )} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <Controller name="apellido" control={control} render={({ field }) => (
                  <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                )} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <Controller name="role" control={control} render={({ field }) => (
                  <select className="w-full px-3 py-2 border rounded-md" {...field}>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                )} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <Controller name="empresaId" control={control} render={({ field }) => (
                  <select className="w-full px-3 py-2 border rounded-md" {...field}>
                    <option value="">(sin empresa)</option>
                    {empresas.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                )} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Cambiar contraseña</label>
                <Controller name="password" control={control} render={({ field }) => (
                  <input type="password" autoComplete="new-password" className="w-full px-3 py-2 border rounded-md" placeholder="(opcional)" {...field} />
                )} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}Guardar</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPlatformUserModal;


