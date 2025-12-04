import React, { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useUpdatePlatformUserMutation } from '../api/platformUsersApiSlice';
import { useGetDadoresQuery, useGetEmpresasTransportistasQuery, useGetChoferesQuery, useGetClientsQuery } from '../../documentos/api/documentosApiSlice';
import { useAppSelector } from '../../../store/hooks';
import { selectCurrentUser } from '../../auth/authSlice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    email: string;
    role: string;
    empresaId?: number | null;
    nombre?: string | null;
    apellido?: string | null;
    dadorCargaId?: number | null;
    empresaTransportistaId?: number | null;
    choferId?: number | null;
    clienteId?: number | null;
  };
}

// Todos los roles del sistema
const ALL_ROLES = [
  'SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO',
  'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'
] as const;

// Matriz de permisos: qué roles puede editar cada rol
const PERMISOS_EDICION: Record<string, string[]> = {
  SUPERADMIN: ALL_ROLES as unknown as string[],
  ADMIN: ['ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'],
  ADMIN_INTERNO: ['OPERATOR', 'OPERADOR_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'],
  DADOR_DE_CARGA: ['TRANSPORTISTA', 'CHOFER'],
  TRANSPORTISTA: ['CHOFER'],
};

type FormData = {
  email: string;
  role: string;
  empresaId?: number | '';
  nombre?: string;
  apellido?: string;
  password?: string;
  dadorCargaId?: number | '';
  empresaTransportistaId?: number | '';
  choferId?: number | '';
  clienteId?: number | '';
};

const EditPlatformUserModal: React.FC<Props> = ({ isOpen, onClose, user }) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: empresas = [] } = useGetEmpresasQuery();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const { data: choferesResp } = useGetChoferesQuery({});
  const { data: clientesResp } = useGetClientsQuery({});
  
  // Estado para filtrar transportistas por dador
  const [selectedDadorForTransportista, setSelectedDadorForTransportista] = useState<number | ''>(
    user.dadorCargaId ?? ''
  );
  
  // Query de transportistas filtrado por dador seleccionado
  const { data: transportistasResp } = useGetEmpresasTransportistasQuery(
    { dadorCargaId: selectedDadorForTransportista ? Number(selectedDadorForTransportista) : undefined },
    { skip: !selectedDadorForTransportista }
  );
  
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? dadoresResp ?? [], [dadoresResp]);
  const transportistas = useMemo(() => (transportistasResp as any)?.list ?? transportistasResp ?? [], [transportistasResp]);
  const choferes = useMemo(() => (choferesResp as any)?.list ?? choferesResp ?? [], [choferesResp]);
  const clientes = useMemo(() => (clientesResp as any)?.list ?? clientesResp ?? [], [clientesResp]);
  
  const [updateUser, { isLoading }] = useUpdatePlatformUserMutation();

  const { control, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      email: user.email,
      role: user.role,
      empresaId: user.empresaId ?? '',
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      password: '',
      dadorCargaId: user.dadorCargaId ?? '',
      empresaTransportistaId: user.empresaTransportistaId ?? '',
      choferId: user.choferId ?? '',
      clienteId: user.clienteId ?? '',
    },
  });

  const selectedRole = watch('role');
  
  // Roles disponibles según el rol del usuario actual
  const rolesDisponibles = useMemo(() => {
    if (!currentUser?.role) return [];
    return PERMISOS_EDICION[currentUser.role] || [];
  }, [currentUser?.role]);

  // Reset form cuando cambia el usuario
  useEffect(() => {
    if (isOpen && user) {
      reset({
        email: user.email,
        role: user.role,
        empresaId: user.empresaId ?? '',
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        password: '',
        dadorCargaId: user.dadorCargaId ?? '',
        empresaTransportistaId: user.empresaTransportistaId ?? '',
        choferId: user.choferId ?? '',
        clienteId: user.clienteId ?? '',
      });
      // Si es transportista, setear el dador para cargar transportistas
      if (user.role === 'TRANSPORTISTA' && user.dadorCargaId) {
        setSelectedDadorForTransportista(user.dadorCargaId);
      }
    }
  }, [isOpen, user, reset]);

  // Reset estado de dador cuando cambia el rol
  useEffect(() => {
    if (selectedRole !== 'TRANSPORTISTA') {
      setSelectedDadorForTransportista('');
    }
  }, [selectedRole]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        email: data.email,
        role: data.role,
        empresaId: data.empresaId ? Number(data.empresaId) : null,
        nombre: data.nombre || null,
        apellido: data.apellido || null,
        ...(data.password ? { password: data.password } : {}),
      };
      
      // Agregar asociación según rol
      if (data.role === 'DADOR_DE_CARGA') {
        payload.dadorCargaId = data.dadorCargaId ? Number(data.dadorCargaId) : null;
      }
      if (data.role === 'TRANSPORTISTA') {
        payload.empresaTransportistaId = data.empresaTransportistaId ? Number(data.empresaTransportistaId) : null;
      }
      if (data.role === 'CHOFER') {
        payload.choferId = data.choferId ? Number(data.choferId) : null;
      }
      if (data.role === 'CLIENTE') {
        payload.clienteId = data.clienteId ? Number(data.clienteId) : null;
      }
      
      // Limpiar asociaciones no relevantes al rol actual
      if (data.role !== 'DADOR_DE_CARGA') payload.dadorCargaId = null;
      if (data.role !== 'TRANSPORTISTA') payload.empresaTransportistaId = null;
      if (data.role !== 'CHOFER') payload.choferId = null;
      if (data.role !== 'CLIENTE') payload.clienteId = null;
      
      await updateUser({ id: user.id, data: payload }).unwrap();
      showToast('Usuario actualizado exitosamente', 'success');
      onClose();
    } catch (e: any) {
      showToast(e?.data?.message || 'No se pudo actualizar el usuario', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-background rounded-lg shadow-xl w-full max-w-xl p-6">
          <h3 className="text-lg font-medium mb-6">Editar Usuario de Plataforma</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <Controller name="email" control={control} render={({ field }) => (
                  <input type="email" className="w-full px-3 py-2 border rounded-md" {...field} />
                )} />
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
                <label className="block text-sm font-medium mb-1">Rol</label>
                <Controller name="role" control={control} render={({ field }) => (
                  <select className="w-full px-3 py-2 border rounded-md" {...field}>
                    {rolesDisponibles.map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                )} />
              </div>

              {/* Empresa (Tenant) */}
              <div>
                <label className="block text-sm font-medium mb-1">Empresa (Tenant)</label>
                <Controller name="empresaId" control={control} render={({ field }) => (
                  <select className="w-full px-3 py-2 border rounded-md" {...field}>
                    <option value="">(sin empresa)</option>
                    {empresas.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                )} />
              </div>

              {/* Asociación: Dador de Carga */}
              {selectedRole === 'DADOR_DE_CARGA' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Dador de Carga asociado</label>
                  <Controller
                    name="dadorCargaId"
                    control={control}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {dadores.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              )}

              {/* Asociación: Empresa Transportista (primero seleccionar Dador) */}
              {selectedRole === 'TRANSPORTISTA' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md"
                      value={selectedDadorForTransportista}
                      onChange={(e) => {
                        setSelectedDadorForTransportista(e.target.value ? Number(e.target.value) : '');
                        setValue('empresaTransportistaId', '');
                      }}
                    >
                      <option value="">Seleccionar dador...</option>
                      {dadores.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Empresa Transportista asociada</label>
                    <Controller
                      name="empresaTransportistaId"
                      control={control}
                      render={({ field }) => (
                        <select 
                          className="w-full px-3 py-2 border rounded-md" 
                          {...field}
                          disabled={!selectedDadorForTransportista}
                        >
                          <option value="">{selectedDadorForTransportista ? 'Seleccionar...' : 'Primero seleccione un dador'}</option>
                          {transportistas.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.razonSocial || t.nombre} ({t.cuit})</option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Asociación: Chofer */}
              {selectedRole === 'CHOFER' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Chofer asociado</label>
                  <Controller
                    name="choferId"
                    control={control}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {choferes.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              )}

              {/* Asociación: Cliente */}
              {selectedRole === 'CLIENTE' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Cliente asociado</label>
                  <Controller
                    name="clienteId"
                    control={control}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar...</option>
                        {clientes.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.razonSocial || c.nombre}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              )}

              {/* Password */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Cambiar contraseña</label>
                <Controller name="password" control={control} render={({ field }) => (
                  <input type="password" autoComplete="new-password" className="w-full px-3 py-2 border rounded-md" placeholder="(dejar vacío para no cambiar)" {...field} />
                )} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Guardar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPlatformUserModal;
