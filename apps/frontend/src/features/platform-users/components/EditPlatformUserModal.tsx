import React, { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useUpdatePlatformUserMutation } from '../api/platformUsersApiSlice';
import { useGetDadoresQuery, useGetEmpresasTransportistasQuery, useGetEmpresaTransportistaByIdQuery, useGetEmpresaTransportistaChoferesQuery, useGetChoferByIdQuery, useGetClientsQuery } from '../../documentos/api/documentosApiSlice';
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
  const { data: clientesResp } = useGetClientsQuery({});
  
  // Estado para TRANSPORTISTA: filtrar transportistas por dador
  // Inicializar con los valores del usuario si existen
  const [selectedDadorForTransportista, setSelectedDadorForTransportista] = useState<number | ''>(
    user.role === 'TRANSPORTISTA' && user.dadorCargaId ? user.dadorCargaId : ''
  );
  const [initialLoadDoneTransportista, setInitialLoadDoneTransportista] = useState(false);
  
  // Estados para CHOFER: cascada Dador → Transportista → Chofer
  // Inicializar con los valores del usuario si existen
  const [selectedDadorForChofer, setSelectedDadorForChofer] = useState<number | ''>(
    user.role === 'CHOFER' && user.dadorCargaId ? user.dadorCargaId : ''
  );
  const [selectedTransportistaForChofer, setSelectedTransportistaForChofer] = useState<number | ''>(
    user.role === 'CHOFER' && user.empresaTransportistaId ? user.empresaTransportistaId : ''
  );
  const [initialLoadDoneChofer, setInitialLoadDoneChofer] = useState(false);
  
  // Estados de búsqueda para filtrar listas grandes
  const [searchTransportista, setSearchTransportista] = useState('');
  const [searchChofer, setSearchChofer] = useState('');
  
  // Query para obtener la transportista actual por ID (para TRANSPORTISTA)
  const { data: transportistaActual } = useGetEmpresaTransportistaByIdQuery(
    { id: user.empresaTransportistaId! },
    { skip: !user.empresaTransportistaId || user.role !== 'TRANSPORTISTA' }
  );
  
  // Query para obtener el chofer actual por ID (para CHOFER)
  const { data: choferActual } = useGetChoferByIdQuery(
    { id: user.choferId! },
    { skip: !user.choferId || user.role !== 'CHOFER' }
  );
  
  // Query de transportistas filtrado por dador seleccionado (para TRANSPORTISTA)
  const { data: transportistasResp } = useGetEmpresasTransportistasQuery(
    { dadorCargaId: selectedDadorForTransportista ? Number(selectedDadorForTransportista) : undefined, limit: 500 },
    { skip: !selectedDadorForTransportista }
  );
  
  // Query de transportistas para CHOFER
  const { data: transportistasForChoferResp } = useGetEmpresasTransportistasQuery(
    { dadorCargaId: selectedDadorForChofer ? Number(selectedDadorForChofer) : undefined, limit: 500 },
    { skip: !selectedDadorForChofer }
  );
  
  // Query de choferes filtrado por empresa transportista (para CHOFER)
  const { data: choferesResp } = useGetEmpresaTransportistaChoferesQuery(
    { id: selectedTransportistaForChofer ? Number(selectedTransportistaForChofer) : 0 },
    { skip: !selectedTransportistaForChofer }
  );
  
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? dadoresResp ?? [], [dadoresResp]);
  const transportistasRaw = useMemo(() => (transportistasResp as any)?.list ?? transportistasResp ?? [], [transportistasResp]);
  const transportistasForChoferRaw = useMemo(() => (transportistasForChoferResp as any)?.list ?? transportistasForChoferResp ?? [], [transportistasForChoferResp]);
  const choferesRaw = useMemo(() => choferesResp ?? [], [choferesResp]);
  const clientes = useMemo(() => (clientesResp as any)?.list ?? clientesResp ?? [], [clientesResp]);
  
  // Filtrar transportistas por búsqueda
  const transportistas = useMemo(() => {
    if (!searchTransportista.trim()) return transportistasRaw.slice(0, 50);
    const q = searchTransportista.toLowerCase();
    return transportistasRaw.filter((t: any) => 
      (t.razonSocial || '').toLowerCase().includes(q) || 
      (t.cuit || '').includes(q)
    ).slice(0, 50);
  }, [transportistasRaw, searchTransportista]);
  
  const transportistasForChofer = useMemo(() => {
    if (!searchTransportista.trim()) return transportistasForChoferRaw.slice(0, 50);
    const q = searchTransportista.toLowerCase();
    return transportistasForChoferRaw.filter((t: any) => 
      (t.razonSocial || '').toLowerCase().includes(q) || 
      (t.cuit || '').includes(q)
    ).slice(0, 50);
  }, [transportistasForChoferRaw, searchTransportista]);
  
  // Filtrar choferes por búsqueda
  const choferes = useMemo(() => {
    if (!searchChofer.trim()) return choferesRaw.slice(0, 50);
    const q = searchChofer.toLowerCase();
    return choferesRaw.filter((c: any) => 
      (c.nombre || '').toLowerCase().includes(q) || 
      (c.apellido || '').toLowerCase().includes(q) || 
      (c.dni || '').includes(q)
    ).slice(0, 50);
  }, [choferesRaw, searchChofer]);
  
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

  // Efecto para cargar el dador para TRANSPORTISTA
  // Usa los datos del usuario de plataforma directamente cuando están disponibles
  useEffect(() => {
    if (isOpen && user.role === 'TRANSPORTISTA' && !initialLoadDoneTransportista) {
      // Primero intentar desde el usuario de plataforma (dadorCargaId asociado)
      if (user.dadorCargaId) {
        setSelectedDadorForTransportista(user.dadorCargaId);
        setInitialLoadDoneTransportista(true);
      }
      // Fallback: obtener desde la transportista actual
      else if (transportistaActual?.dadorCargaId) {
        setSelectedDadorForTransportista(transportistaActual.dadorCargaId);
        setInitialLoadDoneTransportista(true);
      }
    }
  }, [isOpen, user.role, user.dadorCargaId, transportistaActual, initialLoadDoneTransportista]);
  
  // Efecto para cargar dador y transportista para CHOFER
  // Usa los datos del usuario de plataforma directamente (más confiable)
  useEffect(() => {
    if (isOpen && user.role === 'CHOFER' && !initialLoadDoneChofer) {
      // Primero intentar desde el usuario de plataforma
      if (user.dadorCargaId) {
        setSelectedDadorForChofer(user.dadorCargaId);
      }
      if (user.empresaTransportistaId) {
        setSelectedTransportistaForChofer(user.empresaTransportistaId);
      }
      // Fallback: si el chofer tiene la relación empresaTransportista
      if (choferActual?.empresaTransportista) {
        const { dadorCargaId, id: transportistaId } = choferActual.empresaTransportista;
        if (!user.dadorCargaId && dadorCargaId) setSelectedDadorForChofer(dadorCargaId);
        if (!user.empresaTransportistaId && transportistaId) setSelectedTransportistaForChofer(transportistaId);
      }
      if (user.dadorCargaId || user.empresaTransportistaId || choferActual?.empresaTransportista) {
        setInitialLoadDoneChofer(true);
      }
    }
  }, [isOpen, user.role, user.dadorCargaId, user.empresaTransportistaId, choferActual, initialLoadDoneChofer]);

  // Reset form y estados de cascada cuando cambia el usuario
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
      // Sincronizar estados de cascada con los datos del usuario
      if (user.role === 'TRANSPORTISTA') {
        setSelectedDadorForTransportista(user.dadorCargaId ?? '');
      } else {
        setSelectedDadorForTransportista('');
      }
      if (user.role === 'CHOFER') {
        setSelectedDadorForChofer(user.dadorCargaId ?? '');
        setSelectedTransportistaForChofer(user.empresaTransportistaId ?? '');
      } else {
        setSelectedDadorForChofer('');
        setSelectedTransportistaForChofer('');
      }
      setInitialLoadDoneTransportista(false);
      setInitialLoadDoneChofer(false);
      setSearchTransportista('');
      setSearchChofer('');
    }
  }, [isOpen, user, reset]);

  // Reset estado cuando cambia el rol
  useEffect(() => {
    if (selectedRole !== 'TRANSPORTISTA') {
      setSelectedDadorForTransportista('');
      setInitialLoadDoneTransportista(false);
    }
    if (selectedRole !== 'CHOFER') {
      setSelectedDadorForChofer('');
      setSelectedTransportistaForChofer('');
      setInitialLoadDoneChofer(false);
    }
  }, [selectedRole]);

  // Limpiar estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedDadorForTransportista('');
      setSelectedDadorForChofer('');
      setSelectedTransportistaForChofer('');
      setInitialLoadDoneTransportista(false);
      setInitialLoadDoneChofer(false);
    }
  }, [isOpen]);

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
        payload.empresaTransportistaId = data.empresaTransportistaId ? Number(data.empresaTransportistaId) : null;
        payload.choferId = data.choferId ? Number(data.choferId) : null;
      }
      if (data.role === 'CLIENTE') {
        payload.clienteId = data.clienteId ? Number(data.clienteId) : null;
      }
      
      // Limpiar asociaciones no relevantes al rol actual
      if (data.role !== 'DADOR_DE_CARGA') payload.dadorCargaId = null;
      if (data.role !== 'TRANSPORTISTA' && data.role !== 'CHOFER') payload.empresaTransportistaId = null;
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
                    <input
                      type="text"
                      placeholder="Buscar por nombre o CUIT..."
                      className="w-full px-3 py-2 border rounded-md mb-1 text-sm"
                      value={searchTransportista}
                      onChange={(e) => setSearchTransportista(e.target.value)}
                      disabled={!selectedDadorForTransportista}
                    />
                    <Controller
                      name="empresaTransportistaId"
                      control={control}
                      render={({ field }) => {
                        const currentVal = field.value ? Number(field.value) : '';
                        const existsInList = transportistas.some((t: any) => t.id === currentVal);
                        const currentItem = transportistasRaw.find((t: any) => t.id === currentVal);
                        return (
                          <select 
                            className="w-full px-3 py-2 border rounded-md" 
                            {...field}
                            disabled={!selectedDadorForTransportista}
                          >
                            <option value="">{selectedDadorForTransportista ? `Seleccionar... (${transportistasRaw.length} total)` : 'Primero seleccione un dador'}</option>
                            {currentVal && !existsInList && currentItem && (
                              <option value={currentVal}>{currentItem.razonSocial || currentItem.nombre} ({currentItem.cuit})</option>
                            )}
                            {transportistas.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.razonSocial || t.nombre} ({t.cuit})</option>
                            ))}
                          </select>
                        );
                      }}
                    />
                  </div>
                </>
              )}

              {/* Asociación: Chofer - Cascada: Dador → Transportista → Chofer */}
              {selectedRole === 'CHOFER' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={selectedDadorForChofer}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedDadorForChofer(val);
                        setSelectedTransportistaForChofer('');
                        setValue('empresaTransportistaId', '');
                        setValue('choferId', '');
                      }}
                    >
                      <option value="">Seleccionar Dador de Carga...</option>
                      {dadores.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.razonSocial}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Empresa Transportista</label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o CUIT..."
                      className="w-full px-3 py-2 border rounded-md mb-1 text-sm"
                      value={searchTransportista}
                      onChange={(e) => setSearchTransportista(e.target.value)}
                      disabled={!selectedDadorForChofer}
                    />
                    {(() => {
                      const currentVal = selectedTransportistaForChofer ? Number(selectedTransportistaForChofer) : '';
                      const existsInList = transportistasForChofer.some((t: any) => t.id === currentVal);
                      const currentItem = transportistasForChoferRaw.find((t: any) => t.id === currentVal);
                      return (
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={selectedTransportistaForChofer}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : '';
                            setSelectedTransportistaForChofer(val);
                            setValue('empresaTransportistaId', val);
                            setValue('choferId', '');
                            setSearchChofer('');
                          }}
                          disabled={!selectedDadorForChofer}
                        >
                          <option value="">{selectedDadorForChofer ? `Seleccionar... (${transportistasForChoferRaw.length} total)` : 'Primero seleccione un dador'}</option>
                          {currentVal && !existsInList && currentItem && (
                            <option value={currentVal}>{currentItem.razonSocial} ({currentItem.cuit})</option>
                          )}
                          {transportistasForChofer.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.razonSocial}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Chofer asociado</label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, apellido o DNI..."
                      className="w-full px-3 py-2 border rounded-md mb-1 text-sm"
                      value={searchChofer}
                      onChange={(e) => setSearchChofer(e.target.value)}
                      disabled={!selectedTransportistaForChofer}
                    />
                    <Controller
                      name="choferId"
                      control={control}
                      render={({ field }) => {
                        const currentVal = field.value ? Number(field.value) : '';
                        const existsInList = choferes.some((c: any) => c.id === currentVal);
                        const currentItem = choferesRaw.find((c: any) => c.id === currentVal);
                        return (
                          <select className="w-full px-3 py-2 border rounded-md" {...field} disabled={!selectedTransportistaForChofer}>
                            <option value="">{selectedTransportistaForChofer ? `Seleccionar... (${choferesRaw.length} total)` : 'Primero seleccione transportista'}</option>
                            {currentVal && !existsInList && currentItem && (
                              <option value={currentVal}>{currentItem.apellido}, {currentItem.nombre} (DNI: {currentItem.dni})</option>
                            )}
                            {choferes.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                            ))}
                          </select>
                        );
                      }}
                    />
                  </div>
                </>
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
