import React, { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { showToast } from '../../../components/ui/Toast.utils';
import { useRegisterClientWizardMutation, useRegisterDadorWizardMutation, useRegisterTransportistaWizardMutation, useRegisterChoferWizardMutation, useRegisterPlatformUserMutation } from '../api/platformUsersApiSlice';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';
import { useCreateClientMutation, useCreateDadorMutation, useCreateEmpresaTransportistaMutation, useCreateChoferMutation, useGetDadoresQuery, useGetEmpresasTransportistasQuery, useGetEmpresaTransportistaChoferesQuery, useGetClientsQuery } from '../../documentos/api/documentosApiSlice';
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
  // Wizard CLIENTE
  clienteRazonSocial?: string;
  clienteCuit?: string;
  clienteNotas?: string;
  // Wizard DADOR
  dadorRazonSocial?: string;
  dadorCuit?: string;
  dadorNotas?: string;
  // Wizard TRANSPORTISTA
  transportistaRazonSocial?: string;
  transportistaCuit?: string;
  transportistaNotas?: string;
  transportistaDadorId?: number | '';
  // Wizard CHOFER
  choferDni?: string;
  choferNombre?: string;
  choferApellido?: string;
  choferDadorId?: number | '';
  dadorCargaId?: number | '';
  empresaTransportistaId?: number | '';
  choferId?: number | '';
  clienteId?: number | '';
};

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({ isOpen, onClose }) => {
  const currentUser = useAppSelector(selectCurrentUser);
  const { data: empresas = [] } = useGetEmpresasQuery();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const { data: clientesResp } = useGetClientsQuery({});
  
  // Estado para filtrar transportistas por dador (para rol TRANSPORTISTA)
  const [selectedDadorForTransportista, setSelectedDadorForTransportista] = useState<number | ''>('');
  
  // Estados para cascada Dador → Transportista → Chofer (para rol CHOFER)
  const [selectedDadorForChofer, setSelectedDadorForChofer] = useState<number | ''>('');
  const [selectedTransportistaForChofer, setSelectedTransportistaForChofer] = useState<number | ''>('');
  
  // Query de transportistas filtrado por dador seleccionado (para TRANSPORTISTA)
  const { data: transportistasResp } = useGetEmpresasTransportistasQuery(
    { dadorCargaId: selectedDadorForTransportista ? Number(selectedDadorForTransportista) : undefined },
    { skip: !selectedDadorForTransportista }
  );
  
  // Query de transportistas para CHOFER (cuando se selecciona dador)
  const { data: transportistasForChoferResp } = useGetEmpresasTransportistasQuery(
    { dadorCargaId: selectedDadorForChofer ? Number(selectedDadorForChofer) : undefined },
    { skip: !selectedDadorForChofer }
  );
  
  // Query de choferes filtrado por empresa transportista seleccionada
  const { data: choferesResp } = useGetEmpresaTransportistaChoferesQuery(
    { id: selectedTransportistaForChofer ? Number(selectedTransportistaForChofer) : 0 },
    { skip: !selectedTransportistaForChofer }
  );
  
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? dadoresResp ?? [], [dadoresResp]);
  const transportistas = useMemo(() => (transportistasResp as any)?.list ?? transportistasResp ?? [], [transportistasResp]);
  const transportistasForChofer = useMemo(() => (transportistasForChoferResp as any)?.list ?? transportistasForChoferResp ?? [], [transportistasForChoferResp]);
  const choferes = useMemo(() => choferesResp ?? [], [choferesResp]);
  const clientes = useMemo(() => (clientesResp as any)?.list ?? clientesResp ?? [], [clientesResp]);
  
  const [registerUser, { isLoading }] = useRegisterPlatformUserMutation();
  const [registerClientWizard, { isLoading: isLoadingWizardClient }] = useRegisterClientWizardMutation();
  const [registerDadorWizard, { isLoading: isLoadingWizardDador }] = useRegisterDadorWizardMutation();
  const [registerTransportistaWizard, { isLoading: isLoadingWizardTransportista }] = useRegisterTransportistaWizardMutation();
  const [registerChoferWizard, { isLoading: isLoadingWizardChofer }] = useRegisterChoferWizardMutation();
  const [createClient, { isLoading: isCreatingClient }] = useCreateClientMutation();
  const [createDador, { isLoading: isCreatingDador }] = useCreateDadorMutation();
  const [createEmpresaTransportista, { isLoading: isCreatingTransportista }] = useCreateEmpresaTransportistaMutation();
  const [createChofer, { isLoading: isCreatingChofer }] = useCreateChoferMutation();
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
      role: 'OPERATOR',
      empresaId: '',
      nombre: '',
      apellido: '',
      clienteRazonSocial: '',
      clienteCuit: '',
      clienteNotas: '',
      dadorCargaId: '',
      empresaTransportistaId: '',
      choferId: '',
      clienteId: '',
    }
  });

  const selectedRole = watch('role');
  const [clienteMode, setClienteMode] = useState<'existing' | 'new'>('existing');
  const [dadorMode, setDadorMode] = useState<'existing' | 'new'>('existing');
  const [transportistaMode, setTransportistaMode] = useState<'existing' | 'new'>('existing');
  const [choferMode, setChoferMode] = useState<'existing' | 'new'>('existing');
  
  // Solo SUPERADMIN puede elegir empresa; otros usan la del usuario actual
  const canSelectEmpresa = currentUser?.role === 'SUPERADMIN';
  
  // Setear empresa del usuario actual al abrir el modal (si no es SUPERADMIN)
  useEffect(() => {
    if (isOpen && !canSelectEmpresa && currentUser?.empresaId) {
      setValue('empresaId', currentUser.empresaId);
    }
  }, [isOpen, canSelectEmpresa, currentUser?.empresaId, setValue]);
  const [tempPasswordToShow, setTempPasswordToShow] = useState<string | null>(null);
  
  // Roles disponibles según el rol del usuario actual
  const rolesDisponibles = useMemo(() => {
    if (!currentUser?.role) return [];
    return PERMISOS_CREACION[currentUser.role] || [];
  }, [currentUser?.role]);

  // Reset estado cuando cambia el rol o se cierra el modal
  useEffect(() => {
    if (selectedRole !== 'TRANSPORTISTA') {
      setSelectedDadorForTransportista('');
      setTransportistaMode('existing');
    }
    if (selectedRole !== 'CHOFER') {
      setSelectedDadorForChofer('');
      setSelectedTransportistaForChofer('');
      setChoferMode('existing');
    }
    if (selectedRole !== 'CLIENTE') {
      setClienteMode('existing');
      setValue('clienteRazonSocial', '');
      setValue('clienteCuit', '');
      setValue('clienteNotas', '');
    }
    if (selectedRole !== 'DADOR_DE_CARGA') {
      setDadorMode('existing');
      setValue('dadorRazonSocial', '');
      setValue('dadorCuit', '');
      setValue('dadorNotas', '');
    }
  }, [selectedRole]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDadorForTransportista('');
      setSelectedDadorForChofer('');
      setSelectedTransportistaForChofer('');
      setClienteMode('existing');
      setDadorMode('existing');
      setTransportistaMode('existing');
      setChoferMode('existing');
      setTempPasswordToShow(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      // Validar que todos los usuarios tengan empresa asignada
      const finalEmpresaId = canSelectEmpresa ? (data.empresaId ? Number(data.empresaId) : undefined) : currentUser?.empresaId;
      if (!finalEmpresaId) {
        showToast('Debe seleccionar una empresa para el usuario', 'error');
        return;
      }
      
      // CLIENTE (wizard): permite crear el cliente (entidad) y luego el usuario con contraseña temporal.
      if (data.role === 'CLIENTE') {
        const actorRole = currentUser?.role;
        if (!actorRole || !['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(actorRole)) {
          showToast('No tiene permisos para crear usuarios CLIENTE', 'error');
          return;
        }

        let clienteIdFinal: number | undefined;
        if (clienteMode === 'new') {
          if (!data.clienteRazonSocial || !data.clienteCuit) {
            showToast('Razón social y CUIT del cliente son obligatorios', 'error');
            return;
          }
          const created = await createClient({
            razonSocial: data.clienteRazonSocial,
            cuit: data.clienteCuit,
            notas: data.clienteNotas || undefined,
            activo: true,
          }).unwrap();
          clienteIdFinal = created?.id;
        } else {
          if (!data.clienteId) {
            showToast('Debe seleccionar un cliente', 'error');
            return;
          }
          clienteIdFinal = Number(data.clienteId);
        }

        if (!clienteIdFinal) {
          showToast('No se pudo determinar el cliente a asociar', 'error');
          return;
        }

        const resp = await registerClientWizard({
          email: data.email,
          nombre: data.nombre || undefined,
          apellido: data.apellido || undefined,
          empresaId: data.empresaId ? Number(data.empresaId) : undefined,
          clienteId: clienteIdFinal,
        }).unwrap();

        setTempPasswordToShow(resp.tempPassword);
        showToast('Usuario CLIENTE creado. Copie la contraseña temporal.', 'success');
        return;
      }

      // DADOR_DE_CARGA (wizard): permite crear el dador (entidad) y luego el usuario con contraseña temporal.
      if (data.role === 'DADOR_DE_CARGA') {
        const actorRole = currentUser?.role;
        if (!actorRole || !['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(actorRole)) {
          showToast('No tiene permisos para crear usuarios DADOR DE CARGA', 'error');
          return;
        }

        let dadorIdFinal: number | undefined;
        if (dadorMode === 'new') {
          if (!data.dadorRazonSocial || !data.dadorCuit) {
            showToast('Razón social y CUIT del dador son obligatorios', 'error');
            return;
          }
          const created = await createDador({
            razonSocial: data.dadorRazonSocial,
            cuit: data.dadorCuit,
            notas: data.dadorNotas || undefined,
            activo: true,
          }).unwrap();
          dadorIdFinal = created?.id;
        } else {
          if (!data.dadorCargaId) {
            showToast('Debe seleccionar un dador de carga', 'error');
            return;
          }
          dadorIdFinal = Number(data.dadorCargaId);
        }

        if (!dadorIdFinal) {
          showToast('No se pudo determinar el dador a asociar', 'error');
          return;
        }

        const resp = await registerDadorWizard({
          email: data.email,
          nombre: data.nombre || undefined,
          apellido: data.apellido || undefined,
          empresaId: data.empresaId ? Number(data.empresaId) : undefined,
          dadorCargaId: dadorIdFinal,
        }).unwrap();

        setTempPasswordToShow(resp.tempPassword);
        showToast('Usuario DADOR DE CARGA creado. Copie la contraseña temporal.', 'success');
        return;
      }

      // TRANSPORTISTA (wizard): permite crear la empresa transportista (entidad) y luego el usuario con contraseña temporal.
      if (data.role === 'TRANSPORTISTA') {
        const actorRole = currentUser?.role;
        if (!actorRole || !['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'].includes(actorRole)) {
          showToast('No tiene permisos para crear usuarios TRANSPORTISTA', 'error');
          return;
        }

        let transportistaIdFinal: number | undefined;
        if (transportistaMode === 'new') {
          if (!data.transportistaRazonSocial || !data.transportistaCuit || !data.transportistaDadorId) {
            showToast('Razón social, CUIT y Dador de Carga son obligatorios', 'error');
            return;
          }
          const created = await createEmpresaTransportista({
            dadorCargaId: Number(data.transportistaDadorId),
            razonSocial: data.transportistaRazonSocial,
            cuit: data.transportistaCuit,
            notas: data.transportistaNotas || undefined,
            activo: true,
          }).unwrap();
          transportistaIdFinal = created?.id;
        } else {
          if (!data.empresaTransportistaId) {
            showToast('Debe seleccionar una empresa transportista', 'error');
            return;
          }
          transportistaIdFinal = Number(data.empresaTransportistaId);
        }

        if (!transportistaIdFinal) {
          showToast('No se pudo determinar la transportista a asociar', 'error');
          return;
        }

        const resp = await registerTransportistaWizard({
          email: data.email,
          nombre: data.nombre || undefined,
          apellido: data.apellido || undefined,
          empresaId: data.empresaId ? Number(data.empresaId) : undefined,
          empresaTransportistaId: transportistaIdFinal,
        }).unwrap();

        setTempPasswordToShow(resp.tempPassword);
        showToast('Usuario TRANSPORTISTA creado. Copie la contraseña temporal.', 'success');
        return;
      }

      // CHOFER (wizard): permite crear el chofer (entidad) y luego el usuario con contraseña temporal.
      if (data.role === 'CHOFER') {
        const actorRole = currentUser?.role;
        if (!actorRole || !['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(actorRole)) {
          showToast('No tiene permisos para crear usuarios CHOFER', 'error');
          return;
        }

        let choferIdFinal: number | undefined;
        if (choferMode === 'new') {
          if (!data.choferDni || !data.choferDadorId) {
            showToast('DNI y Dador de Carga del chofer son obligatorios', 'error');
            return;
          }
          const created = await createChofer({
            dadorCargaId: Number(data.choferDadorId),
            dni: data.choferDni,
            nombre: data.choferNombre || undefined,
            apellido: data.choferApellido || undefined,
            activo: true,
            phones: [],
          }).unwrap();
          choferIdFinal = created?.id;
        } else {
          if (!data.choferId) {
            showToast('Debe seleccionar un chofer', 'error');
            return;
          }
          choferIdFinal = Number(data.choferId);
        }

        if (!choferIdFinal) {
          showToast('No se pudo determinar el chofer a asociar', 'error');
          return;
        }

        const resp = await registerChoferWizard({
          email: data.email,
          nombre: data.nombre || undefined,
          apellido: data.apellido || undefined,
          empresaId: data.empresaId ? Number(data.empresaId) : undefined,
          choferId: choferIdFinal,
        }).unwrap();

        setTempPasswordToShow(resp.tempPassword);
        showToast('Usuario CHOFER creado. Copie la contraseña temporal.', 'success');
        return;
      }

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

              {/* Empresa (Tenant) - solo visible para SUPERADMIN */}
              {canSelectEmpresa ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Empresa (Tenant) *</label>
                  <Controller
                    name="empresaId"
                    control={control}
                    rules={{ required: 'Debe seleccionar una empresa' }}
                    render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar empresa...</option>
                        {empresas.map((e: any) => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.empresaId && <p className="text-red-500 text-xs mt-1">{errors.empresaId.message}</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Empresa</label>
                  <div className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                    {empresas.find((e: any) => e.id === currentUser?.empresaId)?.nombre || 'BCA'}
                  </div>
                </div>
              )}

              {/* CLIENTE - modo wizard */}
              {selectedRole === 'CLIENTE' && currentUser?.role && ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(currentUser.role) && (
                <div className="col-span-2 rounded-md border p-3 bg-muted/40">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={clienteMode === 'existing'}
                        onChange={() => setClienteMode('existing')}
                      />
                      Asociar cliente existente
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={clienteMode === 'new'}
                        onChange={() => setClienteMode('new')}
                      />
                      Crear cliente nuevo + crear usuario
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Para CLIENTE la contraseña se genera automáticamente y se muestra una sola vez.
                  </p>
                </div>
              )}

              {/* DADOR_DE_CARGA - modo wizard */}
              {selectedRole === 'DADOR_DE_CARGA' && currentUser?.role && ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(currentUser.role) && (
                <div className="col-span-2 rounded-md border p-3 bg-muted/40">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={dadorMode === 'existing'} onChange={() => setDadorMode('existing')} />
                      Asociar dador existente
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={dadorMode === 'new'} onChange={() => setDadorMode('new')} />
                      Crear dador nuevo + crear usuario
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Para DADOR DE CARGA la contraseña se genera automáticamente y se muestra una sola vez.
                  </p>
                </div>
              )}

              {/* Asociación: Dador de Carga existente */}
              {selectedRole === 'DADOR_DE_CARGA' && dadorMode === 'existing' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Dador de Carga asociado *</label>
                  <Controller
                    name="dadorCargaId"
                    control={control}
                    rules={{ required: dadorMode === 'existing' ? 'Debe seleccionar un dador de carga' : false }}
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

              {/* Crear Dador nuevo */}
              {selectedRole === 'DADOR_DE_CARGA' && dadorMode === 'new' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Razón Social del Dador *</label>
                    <Controller name="dadorRazonSocial" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Empresa S.A." {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CUIT del Dador *</label>
                    <Controller name="dadorCuit" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="20123456789" {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <Controller name="dadorNotas" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                    )} />
                  </div>
                </>
              )}

              {/* TRANSPORTISTA - modo wizard */}
              {selectedRole === 'TRANSPORTISTA' && currentUser?.role && ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'].includes(currentUser.role) && (
                <div className="col-span-2 rounded-md border p-3 bg-muted/40">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={transportistaMode === 'existing'} onChange={() => setTransportistaMode('existing')} />
                      Asociar transportista existente
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={transportistaMode === 'new'} onChange={() => setTransportistaMode('new')} />
                      Crear transportista nuevo + crear usuario
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Para TRANSPORTISTA la contraseña se genera automáticamente y se muestra una sola vez.
                  </p>
                </div>
              )}

              {/* Asociación: Empresa Transportista existente (primero seleccionar Dador) */}
              {selectedRole === 'TRANSPORTISTA' && transportistaMode === 'existing' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga *</label>
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
                    <label className="block text-sm font-medium mb-1">Empresa Transportista asociada *</label>
                    <Controller
                      name="empresaTransportistaId"
                      control={control}
                      rules={{ required: transportistaMode === 'existing' ? 'Debe seleccionar una empresa transportista' : false }}
                      render={({ field }) => (
                        <select className="w-full px-3 py-2 border rounded-md" {...field} disabled={!selectedDadorForTransportista}>
                          <option value="">{selectedDadorForTransportista ? 'Seleccionar...' : 'Primero seleccione un dador'}</option>
                          {transportistas.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.razonSocial || t.nombre} ({t.cuit})</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.empresaTransportistaId && <p className="text-red-500 text-xs mt-1">{errors.empresaTransportistaId.message}</p>}
                  </div>
                </>
              )}

              {/* Crear Transportista nuevo */}
              {selectedRole === 'TRANSPORTISTA' && transportistaMode === 'new' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga *</label>
                    <Controller name="transportistaDadorId" control={control} render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar dador...</option>
                        {dadores.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                        ))}
                      </select>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Razón Social de la Transportista *</label>
                    <Controller name="transportistaRazonSocial" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Transporte S.R.L." {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CUIT de la Transportista *</label>
                    <Controller name="transportistaCuit" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="20123456789" {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <Controller name="transportistaNotas" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                    )} />
                  </div>
                </>
              )}

              {/* CHOFER - modo wizard */}
              {selectedRole === 'CHOFER' && currentUser?.role && ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(currentUser.role) && (
                <div className="col-span-2 rounded-md border p-3 bg-muted/40">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={choferMode === 'existing'} onChange={() => setChoferMode('existing')} />
                      Asociar chofer existente
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={choferMode === 'new'} onChange={() => setChoferMode('new')} />
                      Crear chofer nuevo + crear usuario
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Para CHOFER la contraseña se genera automáticamente y se muestra una sola vez.
                  </p>
                </div>
              )}

              {/* Asociación: Chofer existente (Dador → Transportista → Chofer) */}
              {selectedRole === 'CHOFER' && choferMode === 'existing' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga *</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md"
                      value={selectedDadorForChofer}
                      onChange={(e) => {
                        setSelectedDadorForChofer(e.target.value ? Number(e.target.value) : '');
                        setSelectedTransportistaForChofer('');
                        setValue('choferId', '');
                      }}
                    >
                      <option value="">Seleccionar dador...</option>
                      {dadores.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Empresa Transportista *</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-md"
                      value={selectedTransportistaForChofer}
                      onChange={(e) => {
                        setSelectedTransportistaForChofer(e.target.value ? Number(e.target.value) : '');
                        setValue('choferId', '');
                      }}
                      disabled={!selectedDadorForChofer}
                    >
                      <option value="">{selectedDadorForChofer ? 'Seleccionar transportista...' : 'Primero seleccione un dador'}</option>
                      {transportistasForChofer.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.razonSocial || t.nombre} ({t.cuit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Chofer asociado *</label>
                    <Controller
                      name="choferId"
                      control={control}
                      rules={{ required: choferMode === 'existing' ? 'Debe seleccionar un chofer' : false }}
                      render={({ field }) => (
                        <select className="w-full px-3 py-2 border rounded-md" {...field} disabled={!selectedTransportistaForChofer}>
                          <option value="">{selectedTransportistaForChofer ? 'Seleccionar...' : 'Primero seleccione una transportista'}</option>
                          {choferes.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.choferId && <p className="text-red-500 text-xs mt-1">{errors.choferId.message}</p>}
                  </div>
                </>
              )}

              {/* Crear Chofer nuevo */}
              {selectedRole === 'CHOFER' && choferMode === 'new' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Dador de Carga *</label>
                    <Controller name="choferDadorId" control={control} render={({ field }) => (
                      <select className="w-full px-3 py-2 border rounded-md" {...field}>
                        <option value="">Seleccionar dador...</option>
                        {dadores.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.razonSocial || d.nombre} ({d.cuit})</option>
                        ))}
                      </select>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">DNI del Chofer *</label>
                    <Controller name="choferDni" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="12345678" {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Chofer</label>
                    <Controller name="choferNombre" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellido del Chofer</label>
                    <Controller name="choferApellido" control={control} render={({ field }) => (
                      <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                    )} />
                  </div>
                </>
              )}

              {/* CLIENTE: asociar existente */}
              {selectedRole === 'CLIENTE' && clienteMode === 'existing' && (
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

              {/* CLIENTE: crear nuevo */}
              {selectedRole === 'CLIENTE' && clienteMode === 'new' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Razón Social (Cliente) *</label>
                    <Controller
                      name="clienteRazonSocial"
                      control={control}
                      rules={{ required: 'La razón social es requerida' }}
                      render={({ field }) => (
                        <input type="text" className="w-full px-3 py-2 border rounded-md" {...field} />
                      )}
                    />
                    {errors.clienteRazonSocial && <p className="text-red-500 text-xs mt-1">{errors.clienteRazonSocial.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">CUIT (11 dígitos) *</label>
                    <Controller
                      name="clienteCuit"
                      control={control}
                      rules={{ required: 'El CUIT es requerido' }}
                      render={({ field }) => (
                        <input type="text" inputMode="numeric" className="w-full px-3 py-2 border rounded-md" placeholder="###########" {...field} />
                      )}
                    />
                    {errors.clienteCuit && <p className="text-red-500 text-xs mt-1">{errors.clienteCuit.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <Controller
                      name="clienteNotas"
                      control={control}
                      render={({ field }) => (
                        <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...field} />
                      )}
                    />
                  </div>
                </>
              )}

              {/* Password */}
              {selectedRole !== 'CLIENTE' && (
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
              )}
            </div>

            {/* Info de asociación */}
            {necesitaAsociacion && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                ⚠️ Este rol requiere asociación a una entidad del sistema de documentos.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading || isLoadingWizardClient || isCreatingClient}>
                {(isLoading || isLoadingWizardClient || isCreatingClient) ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Crear Usuario
              </Button>
            </div>
          </form>

          {/* Modal simple para mostrar contraseña temporal una sola vez */}
          {tempPasswordToShow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/40" />
              <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md p-6 border">
                <h4 className="text-lg font-medium">Contraseña temporal</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Copiela ahora. Por seguridad, no se volverá a mostrar.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <input
                    readOnly
                    value={tempPasswordToShow}
                    className="flex-1 px-3 py-2 border rounded-md bg-muted"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      try { navigator.clipboard.writeText(tempPasswordToShow); } catch {}
                      showToast('Contraseña copiada', 'success');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setTempPasswordToShow(null);
                      reset();
                      onClose();
                    }}
                  >
                    Listo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
