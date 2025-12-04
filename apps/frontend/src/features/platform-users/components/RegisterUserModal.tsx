import React, { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { useRegisterPlatformUserMutation } from '../api/platformUsersApiSlice';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useGetDadoresQuery, useGetEmpresasTransportistasQuery, useGetChoferesQuery, useGetClientsQuery } from '../../documentos/api/documentosApiSlice';
import { useAppSelector } from '../../../store/hooks';
import { selectCurrentUser } from '../../auth/authSlice';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Todos los roles del sistema
const ALL_ROLES = [
  'SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO',
  'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'
] as const;

// Matriz de permisos: qué roles puede crear cada rol
const PERMISOS_CREACION: Record<string, string[]> = {
  SUPERADMIN: ALL_ROLES as unknown as string[],
  ADMIN: ['ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'],
  ADMIN_INTERNO: ['OPERATOR', 'OPERADOR_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'],
  DADOR_DE_CARGA: ['TRANSPORTISTA', 'CHOFER'],
  TRANSPORTISTA: ['CHOFER'],
};

// Roles que requieren asociaciones específicas
const ASOCIACIONES_POR_ROL: Record<string, string> = {
  DADOR_DE_CARGA: 'dadorCargaId',
  TRANSPORTISTA: 'empresaTransportistaId',
  CHOFER: 'choferId',
  CLIENTE: 'clienteId',
};

type FormData = {
  email: string;
  password: string;
  role: string;
  empresaId?: number | '';
  nombre?: string;
  apellido?: string;
  dadorCargaId?: number | '';
  empresaTransportistaId?: number | '';
  choferId?: number | '';
  clienteId?: number | '';
};

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({ isOpen, onClose }) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: empresas = [] } = useGetEmpresasQuery();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const { data: transportistasResp } = useGetEmpresasTransportistasQuery({});
  const { data: choferesResp } = useGetChoferesQuery({});
  const { data: clientesResp } = useGetClientsQuery({});
  
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? dadoresResp ?? [], [dadoresResp]);
  const transportistas = useMemo(() => (transportistasResp as any)?.list ?? transportistasResp ?? [], [transportistasResp]);
  const choferes = useMemo(() => (choferesResp as any)?.list ?? choferesResp ?? [], [choferesResp]);
  const clientes = useMemo(() => (clientesResp as any)?.list ?? clientesResp ?? [], [clientesResp]);
  
  const [registerUser, { isLoading }] = useRegisterPlatformUserMutation();
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
      role: 'OPERATOR',
      empresaId: '',
      nombre: '',
      apellido: '',
      dadorCargaId: '',
      empresaTransportistaId: '',
      choferId: '',
      clienteId: '',
    }
  });

  const selectedRole = watch('role');
  
  // Roles disponibles según el rol del usuario actual
  const rolesDisponibles = useMemo(() => {
    if (!currentUser?.role) return [];
    return PERMISOS_CREACION[currentUser.role] || [];
  }, [currentUser?.role]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        email: data.email,
        password: data.password,
        role: data.role,
        empresaId: data.empresaId ? Number(data.empresaId) : undefined,
        nombre: data.nombre || undefined,
        apellido: data.apellido || undefined,
      };
      
      // Agregar asociación según rol
      if (data.role === 'DADOR_DE_CARGA' && data.dadorCargaId) {
        payload.dadorCargaId = Number(data.dadorCargaId);
      }
      if (data.role === 'TRANSPORTISTA' && data.empresaTransportistaId) {
        payload.empresaTransportistaId = Number(data.empresaTransportistaId);
      }
      if (data.role === 'CHOFER' && data.choferId) {
        payload.choferId = Number(data.choferId);
      }
      if (data.role === 'CLIENTE' && data.clienteId) {
        payload.clienteId = Number(data.clienteId);
      }
      
      await registerUser(payload).unwrap();
      showToast('Usuario creado exitosamente', 'success');
      reset();
      onClose();
    } catch (e: any) {
      showToast(e?.data?.message || 'No se pudo crear el usuario', 'error');
    }
  };

  const necesitaAsociacion = ASOCIACIONES_POR_ROL[selectedRole];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-background rounded-lg shadow-xl w-full max-w-xl p-6">
          <h3 className="text-lg font-medium mb-6">Nuevo Usuario</h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Email *</label>
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

              {/* Nombre y Apellido */}
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

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium mb-1">Rol *</label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <select className="w-full px-3 py-2 border rounded-md" {...field}>
                      {rolesDisponibles.map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  )}
                />
              </div>

              {/* Empresa (Tenant) */}
              <div>
                <label className="block text-sm font-medium mb-1">Empresa (Tenant)</label>
                <Controller
                  name="empresaId"
                  control={control}
                  render={({ field }) => (
                    <select className="w-full px-3 py-2 border rounded-md" {...field}>
                      <option value="">(sin empresa)</option>
                      {empresas.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  )}
                />
              </div>

              {/* Asociación: Dador de Carga */}
              {selectedRole === 'DADOR_DE_CARGA' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Dador de Carga asociado *</label>
                  <Controller
                    name="dadorCargaId"
                    control={control}
                    rules={{ required: 'Debe seleccionar un dador de carga' }}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {dadores.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.dadorCargaId && <p className="text-red-500 text-xs mt-1">{errors.dadorCargaId.message}</p>}
                </div>
              )}

              {/* Asociación: Empresa Transportista */}
              {selectedRole === 'TRANSPORTISTA' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Empresa Transportista asociada *</label>
                  <Controller
                    name="empresaTransportistaId"
                    control={control}
                    rules={{ required: 'Debe seleccionar una empresa transportista' }}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {transportistas.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.razonSocial || t.nombre} ({t.cuit})</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.empresaTransportistaId && <p className="text-red-500 text-xs mt-1">{errors.empresaTransportistaId.message}</p>}
                </div>
              )}

              {/* Asociación: Chofer */}
              {selectedRole === 'CHOFER' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Chofer asociado *</label>
                  <Controller
                    name="choferId"
                    control={control}
                    rules={{ required: 'Debe seleccionar un chofer' }}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {choferes.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.choferId && <p className="text-red-500 text-xs mt-1">{errors.choferId.message}</p>}
                </div>
              )}

              {/* Asociación: Cliente */}
              {selectedRole === 'CLIENTE' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Cliente asociado *</label>
                  <Controller
                    name="clienteId"
                    control={control}
                    rules={{ required: 'Debe seleccionar un cliente' }}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {clientes.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.razonSocial || c.nombre}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.clienteId && <p className="text-red-500 text-xs mt-1">{errors.clienteId.message}</p>}
                </div>
              )}

              {/* Password */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Password temporal *</label>
                <Controller
                  name="password"
                  control={control}
                  rules={{ 
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                    pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Debe tener mayúscula, minúscula y número' }
                  }}
                  render={({ field }) => (
                    <input type="password" autoComplete="new-password" className="w-full px-3 py-2 border rounded-md" placeholder="Mín. 8 caracteres" {...field} />
                  )}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
            </div>

            {/* Info de asociación */}
            {necesitaAsociacion && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                ⚠️ Este rol requiere asociación a una entidad del sistema de documentos.
              </div>
            )}

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
