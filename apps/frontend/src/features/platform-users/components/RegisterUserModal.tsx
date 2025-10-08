import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { useRegisterPlatformUserMutation } from '../api/platformUsersApiSlice';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormData = {
  email: string;
  password: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'OPERATOR';
  empresaId?: number | '';
  nombre?: string;
  apellido?: string;
};

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({ isOpen, onClose }) => {
  const { data: empresas = [] } = useGetEmpresasQuery();
  const [registerUser, { isLoading }] = useRegisterPlatformUserMutation();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
      role: 'OPERATOR',
      empresaId: '',
      nombre: '',
      apellido: '',
    }
  });

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        role: data.role,
        empresaId: data.empresaId ? Number(data.empresaId) : undefined,
        nombre: data.nombre,
        apellido: data.apellido,
      }).unwrap();
      showToast('Usuario de plataforma creado', 'success');
      reset();
      onClose();
    } catch (_e) {
      showToast('No se pudo crear el usuario', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-background rounded-lg shadow-xl w-full max-w-xl p-6">
          <h3 className="text-lg font-medium mb-6">Nuevo Usuario de Plataforma</h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: 'El email es requerido' }}
                  render={({ field }) => (
                    <input type="email" className="w-full px-3 py-2 border rounded-md" placeholder="usuario@empresa.com" {...field} />
                  )}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <select className="w-full px-3 py-2 border rounded-md" {...field}>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <Controller
                  name="empresaId"
                  control={control}
                  render={({ field }) => (
                    <select className="w-full px-3 py-2 border rounded-md" {...field}>
                      <option value="">(sin empresa)</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Password temporal</label>
                <Controller
                  name="password"
                  control={control}
                  rules={{ required: 'La contraseña es requerida' }}
                  render={({ field }) => (
                    <input type="password" autoComplete="new-password" className="w-full px-3 py-2 border rounded-md" placeholder="Mín. 8 caracteres" {...field} />
                  )}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Crear Usuario
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


