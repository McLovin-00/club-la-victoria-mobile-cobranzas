import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetEquipoByIdQuery,
  useGetClientsQuery,
  useGetChoferesQuery,
  useGetCamionesQuery,
  useGetAcopladosQuery,
  useGetEmpresasTransportistasQuery,
  useAttachEquipoComponentsMutation,
  useUpdateEquipoMutation,
  useAssociateEquipoClienteMutation,
  useRemoveEquipoClienteMutation,
} from '../../documentos/api/documentosApiSlice';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ConfirmContext } from '../../../contexts/confirmContext';

/**
 * Página de Edición de Equipo
 * Permite modificar las entidades (chofer, camión, acoplado, empresa) y clientes.
 */
const EditarEquipoPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const equipoId = Number(id);
  const { confirm } = useContext(ConfirmContext);
  
  const role = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  
  // Cargar datos del equipo
  const { data: equipo, isLoading, refetch } = useGetEquipoByIdQuery(
    { id: equipoId },
    { skip: !equipoId }
  );
  
  const dadorId = equipo?.dadorCargaId || 1;
  
  // Cargar catálogos
  const { data: clientsResp } = useGetClientsQuery({ activo: true });
  const { data: choferesResp } = useGetChoferesQuery({ empresaId: dadorId, page: 1, limit: 100 });
  const { data: camionesResp } = useGetCamionesQuery({ empresaId: dadorId, page: 1, limit: 100 });
  const { data: acopladosResp } = useGetAcopladosQuery({ empresaId: dadorId, page: 1, limit: 100 });
  const { data: empresasResp } = useGetEmpresasTransportistasQuery({ dadorCargaId: dadorId });
  
  // Mutations
  const [attachComponents, { isLoading: attaching }] = useAttachEquipoComponentsMutation();
  const [updateEquipo] = useUpdateEquipoMutation();
  const [associateCliente] = useAssociateEquipoClienteMutation();
  const [removeCliente] = useRemoveEquipoClienteMutation();
  
  // Estados locales para edición
  const [selectedChoferId, setSelectedChoferId] = useState<number | ''>('');
  const [selectedCamionId, setSelectedCamionId] = useState<number | ''>('');
  const [selectedAcopladoId, setSelectedAcopladoId] = useState<number | ''>('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | ''>('');
  const [clienteToAdd, setClienteToAdd] = useState<number | ''>('');
  
  // Mensaje de estado
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Listas de datos
  const clientes = useMemo(() => (clientsResp as any)?.list || [], [clientsResp]);
  const choferes = useMemo(() => (choferesResp as any)?.data || [], [choferesResp]);
  const camiones = useMemo(() => (camionesResp as any)?.data || [], [camionesResp]);
  const acoplados = useMemo(() => (acopladosResp as any)?.data || [], [acopladosResp]);
  const empresas = useMemo(() => empresasResp || [], [empresasResp]);
  
  // Clientes actuales del equipo
  const clientesActuales = useMemo(() => {
    return (equipo?.clientes || []).map((ec: any) => ({
      id: ec.clienteId,
      nombre: ec.cliente?.razonSocial || `Cliente ${ec.clienteId}`,
    }));
  }, [equipo]);
  
  // Clientes disponibles para agregar (no están ya asociados)
  const clientesDisponibles = useMemo(() => {
    const idsActuales = new Set(clientesActuales.map((c: any) => c.id));
    return clientes.filter((c: any) => !idsActuales.has(c.id));
  }, [clientes, clientesActuales]);
  
  // Inicializar selecciones con datos actuales
  useEffect(() => {
    if (equipo) {
      setSelectedChoferId(equipo.driverId || '');
      setSelectedCamionId(equipo.truckId || '');
      setSelectedAcopladoId(equipo.trailerId || '');
      setSelectedEmpresaId(equipo.empresaTransportistaId || '');
    }
  }, [equipo]);
  
  // Cambiar Chofer
  const handleChangeChofer = async () => {
    if (!selectedChoferId || selectedChoferId === equipo?.driverId) return;
    const chofer = choferes.find((c: any) => c.id === selectedChoferId);
    if (!chofer) return;
    
    try {
      await attachComponents({ id: equipoId, driverDni: chofer.dni }).unwrap();
      setMessage({ type: 'success', text: 'Chofer actualizado correctamente' });
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al cambiar chofer' });
    }
  };
  
  // Cambiar Camión
  const handleChangeCamion = async () => {
    if (!selectedCamionId || selectedCamionId === equipo?.truckId) return;
    const camion = camiones.find((c: any) => c.id === selectedCamionId);
    if (!camion) return;
    
    try {
      await attachComponents({ id: equipoId, truckPlate: camion.patente }).unwrap();
      setMessage({ type: 'success', text: 'Camión actualizado correctamente' });
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al cambiar camión' });
    }
  };
  
  // Cambiar Acoplado
  const handleChangeAcoplado = async () => {
    if (selectedAcopladoId === equipo?.trailerId) return;
    
    if (!selectedAcopladoId) {
      // Quitar acoplado
      try {
        await updateEquipo({ id: equipoId, trailerId: null }).unwrap();
        setMessage({ type: 'success', text: 'Acoplado removido' });
        refetch();
      } catch (err: any) {
        setMessage({ type: 'error', text: err?.data?.message || 'Error al quitar acoplado' });
      }
      return;
    }
    
    const acoplado = acoplados.find((a: any) => a.id === selectedAcopladoId);
    if (!acoplado) return;
    
    try {
      await attachComponents({ id: equipoId, trailerPlate: acoplado.patente }).unwrap();
      setMessage({ type: 'success', text: 'Acoplado actualizado correctamente' });
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al cambiar acoplado' });
    }
  };
  
  // Cambiar Empresa Transportista
  const handleChangeEmpresa = async () => {
    if (selectedEmpresaId === equipo?.empresaTransportistaId) return;
    
    try {
      await updateEquipo({ 
        id: equipoId, 
        empresaTransportistaId: selectedEmpresaId || 0 
      }).unwrap();
      setMessage({ type: 'success', text: 'Empresa transportista actualizada' });
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al cambiar empresa' });
    }
  };
  
  // Agregar cliente
  const handleAddCliente = async () => {
    if (!clienteToAdd) return;
    
    try {
      await associateCliente({
        equipoId,
        clienteId: Number(clienteToAdd),
        asignadoDesde: new Date().toISOString(),
      }).unwrap();
      setMessage({ type: 'success', text: 'Cliente agregado correctamente' });
      setClienteToAdd('');
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al agregar cliente' });
    }
  };
  
  // Quitar cliente
  const handleRemoveCliente = async (clienteId: number, clienteNombre: string) => {
    if (clientesActuales.length <= 1) {
      setMessage({ type: 'error', text: 'El equipo debe tener al menos un cliente' });
      return;
    }
    
    const ok = await confirm({
      title: 'Quitar cliente',
      message: `¿Quitar "${clienteNombre}" de este equipo?`,
      confirmText: 'Quitar',
      variant: 'danger',
    });
    
    if (!ok) return;
    
    try {
      await removeCliente({ equipoId, clienteId }).unwrap();
      setMessage({ type: 'success', text: 'Cliente removido' });
      refetch();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al quitar cliente' });
    }
  };
  
  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>Cargando equipo...</div>
      </div>
    );
  }
  
  if (!equipo) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center text-red-600'>Equipo no encontrado</div>
      </div>
    );
  }
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => navigate('/documentos/equipos')}
            className='flex items-center'
          >
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Editar Equipo #{equipoId}</h1>
        </div>
      </div>
      
      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      
      {/* Información actual */}
      <Card className='p-4 mb-6 bg-gray-50'>
        <h2 className='text-lg font-semibold mb-3'>Información Actual</h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
          <div>
            <span className='text-gray-500'>Chofer:</span>
            <div className='font-medium'>
              {equipo.chofer?.nombre || ''} {equipo.chofer?.apellido || ''}
              <span className='text-gray-500 ml-1'>DNI: {equipo.chofer?.dni || equipo.driverDniNorm}</span>
            </div>
          </div>
          <div>
            <span className='text-gray-500'>Camión:</span>
            <div className='font-medium'>{equipo.camion?.patente || equipo.truckPlateNorm}</div>
          </div>
          <div>
            <span className='text-gray-500'>Acoplado:</span>
            <div className='font-medium'>{equipo.acoplado?.patente || equipo.trailerPlateNorm || '-'}</div>
          </div>
          <div>
            <span className='text-gray-500'>Empresa:</span>
            <div className='font-medium'>{equipo.empresaTransportista?.razonSocial || '-'}</div>
          </div>
        </div>
      </Card>
      
      {/* Editar Entidades */}
      <Card className='p-4 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Modificar Entidades</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Chofer */}
          <div className='space-y-2'>
            <Label>Chofer</Label>
            <div className='flex gap-2'>
              <select
                className='flex-1 border rounded px-3 py-2 bg-background'
                value={selectedChoferId}
                onChange={(e) => setSelectedChoferId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Seleccionar chofer</option>
                {choferes.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.apellido}, {ch.nombre} · DNI {ch.dni}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleChangeChofer}
                disabled={!selectedChoferId || selectedChoferId === equipo.driverId || attaching}
                size='sm'
              >
                Cambiar
              </Button>
            </div>
          </div>
          
          {/* Camión */}
          <div className='space-y-2'>
            <Label>Camión</Label>
            <div className='flex gap-2'>
              <select
                className='flex-1 border rounded px-3 py-2 bg-background'
                value={selectedCamionId}
                onChange={(e) => setSelectedCamionId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Seleccionar camión</option>
                {camiones.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.patente}</option>
                ))}
              </select>
              <Button
                onClick={handleChangeCamion}
                disabled={!selectedCamionId || selectedCamionId === equipo.truckId || attaching}
                size='sm'
              >
                Cambiar
              </Button>
            </div>
          </div>
          
          {/* Acoplado */}
          <div className='space-y-2'>
            <Label>Acoplado (opcional)</Label>
            <div className='flex gap-2'>
              <select
                className='flex-1 border rounded px-3 py-2 bg-background'
                value={selectedAcopladoId}
                onChange={(e) => setSelectedAcopladoId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Sin acoplado</option>
                {acoplados.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.patente}</option>
                ))}
              </select>
              <Button
                onClick={handleChangeAcoplado}
                disabled={selectedAcopladoId === equipo.trailerId || attaching}
                size='sm'
              >
                Cambiar
              </Button>
            </div>
          </div>
          
          {/* Empresa Transportista */}
          <div className='space-y-2'>
            <Label>Empresa Transportista</Label>
            <div className='flex gap-2'>
              <select
                className='flex-1 border rounded px-3 py-2 bg-background'
                value={selectedEmpresaId}
                onChange={(e) => setSelectedEmpresaId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Sin empresa</option>
                {(empresas as any[]).map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razonSocial} · CUIT {emp.cuit}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleChangeEmpresa}
                disabled={selectedEmpresaId === equipo.empresaTransportistaId}
                size='sm'
              >
                Cambiar
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Gestionar Clientes */}
      <Card className='p-4 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Clientes Asociados</h2>
        
        {/* Lista de clientes actuales */}
        <div className='mb-4 space-y-2'>
          {clientesActuales.map((cliente: any) => (
            <div
              key={cliente.id}
              className='flex items-center justify-between p-3 bg-gray-50 rounded border'
            >
              <span>{cliente.nombre}</span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleRemoveCliente(cliente.id, cliente.nombre)}
                disabled={clientesActuales.length <= 1}
                className={clientesActuales.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Quitar
              </Button>
            </div>
          ))}
          {clientesActuales.length === 0 && (
            <div className='text-gray-500 text-sm'>No hay clientes asociados</div>
          )}
        </div>
        
        {/* Agregar cliente */}
        <div className='flex gap-2'>
          <select
            className='flex-1 border rounded px-3 py-2 bg-background'
            value={clienteToAdd}
            onChange={(e) => setClienteToAdd(e.target.value ? Number(e.target.value) : '')}
          >
            <option value=''>Seleccionar cliente para agregar</option>
            {clientesDisponibles.map((c: any) => (
              <option key={c.id} value={c.id}>{c.razonSocial}</option>
            ))}
          </select>
          <Button onClick={handleAddCliente} disabled={!clienteToAdd}>
            Agregar Cliente
          </Button>
        </div>
        
        <p className='text-xs text-gray-500 mt-2'>
          El equipo debe tener al menos un cliente asociado.
        </p>
      </Card>
      
      {/* Nota informativa */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800'>
        <strong>💡 Nota:</strong> Al cambiar una entidad (chofer, camión, acoplado), el sistema
        verificará que los documentos correspondientes estén disponibles. Si la nueva entidad
        ya tiene documentos vigentes, se reutilizarán automáticamente.
      </div>
    </div>
  );
};

export default EditarEquipoPage;

