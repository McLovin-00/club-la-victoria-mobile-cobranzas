import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
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
  useGetEquipoRequisitosQuery,
  useRemoveEquipoClienteWithArchiveMutation,
  useUploadDocumentMutation,
} from '../../documentos/api/documentosApiSlice';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { ArrowLeftIcon, DocumentIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ConfirmContext } from '../../../contexts/confirmContext';

/**
 * Página de Edición de Equipo
 * Permite modificar las entidades (chofer, camión, acoplado, empresa) y clientes.
 */
const EditarEquipoPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const { id } = useParams<{ id: string }>();
  const equipoId = Number(id);
  const { confirm } = useContext(ConfirmContext);
  
  const role = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  
  // Permisos basados en rol
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN_INTERNO';
  const isDador = role === 'DADOR_DE_CARGA';
  const isTransportista = role === 'TRANSPORTISTA';
  const isChofer = role === 'CHOFER';
  const _isCliente = role === 'CLIENTE'; // Para uso futuro
  
  // Determinar qué puede hacer el usuario
  const canEdit = isAdmin || isDador || isTransportista;
  const canManageClients = isAdmin || isDador;
  const canUploadDocs = isAdmin || isDador || isTransportista || isChofer;
  
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
  
  // Cargar requisitos del equipo
  const { data: requisitos, refetch: refetchRequisitos } = useGetEquipoRequisitosQuery(
    { equipoId },
    { skip: !equipoId, refetchOnMountOrArgChange: true, refetchOnFocus: true }
  );
  
  // Mutations
  const [attachComponents, { isLoading: attaching }] = useAttachEquipoComponentsMutation();
  const [updateEquipo] = useUpdateEquipoMutation();
  const [associateCliente] = useAssociateEquipoClienteMutation();
  const [removeClienteWithArchive] = useRemoveEquipoClienteWithArchiveMutation();
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();
  
  // Estado para archivos seleccionados (key: templateId-entityType-entityId)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, { file: File; expiresAt?: string }>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
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
        await updateEquipo({ id: equipoId, trailerId: 0 }).unwrap();
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
  
  // Quitar cliente (usando nuevo endpoint con archivado)
  const handleRemoveCliente = async (clienteId: number, clienteNombre: string) => {
    if (clientesActuales.length <= 1) {
      setMessage({ type: 'error', text: 'El equipo debe tener al menos un cliente' });
      return;
    }
    
    const ok = await confirm({
      title: 'Quitar cliente',
      message: `¿Quitar "${clienteNombre}" de este equipo? Los documentos exclusivos de este cliente serán archivados.`,
      confirmText: 'Quitar',
      variant: 'danger',
    });
    
    if (!ok) return;
    
    try {
      const result = await removeClienteWithArchive({ equipoId, clienteId }).unwrap();
      const archivedMsg = result?.archivedDocuments 
        ? ` (${result.archivedDocuments} documentos archivados)`
        : '';
      setMessage({ type: 'success', text: `Cliente removido${archivedMsg}` });
      refetch();
      refetchRequisitos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al quitar cliente' });
    }
  };
  
  // Helper para obtener color de estado
  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'VIGENTE':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon };
      case 'PROXIMO_VENCER':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon };
      case 'VENCIDO':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: ExclamationTriangleIcon };
      case 'PENDIENTE':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: ClockIcon };
      case 'FALTANTE':
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircleIcon };
    }
  };
  
  // Agrupar requisitos por tipo de entidad
  const requisitosPorEntidad = useMemo(() => {
    if (!requisitos) return {};
    
    const grouped: Record<string, typeof requisitos> = {};
    for (const req of requisitos) {
      if (!grouped[req.entityType]) {
        grouped[req.entityType] = [];
      }
      grouped[req.entityType].push(req);
    }
    return grouped;
  }, [requisitos]);
  
  // Resumen de estados
  const resumenEstados = useMemo(() => {
    if (!requisitos) return { vigentes: 0, proximosVencer: 0, vencidos: 0, faltantes: 0, pendientes: 0 };
    
    return requisitos.reduce(
      (acc, req) => {
        switch (req.estado) {
          case 'VIGENTE': acc.vigentes++; break;
          case 'PROXIMO_VENCER': acc.proximosVencer++; break;
          case 'VENCIDO': acc.vencidos++; break;
          case 'PENDIENTE': acc.pendientes++; break;
          case 'FALTANTE': 
          default: acc.faltantes++; break;
        }
        return acc;
      },
      { vigentes: 0, proximosVencer: 0, vencidos: 0, faltantes: 0, pendientes: 0 }
    );
  }, [requisitos]);
  
  const entityTypeLabels: Record<string, string> = {
    CHOFER: 'Chofer',
    CAMION: 'Camión',
    ACOPLADO: 'Acoplado',
    EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
    DADOR: 'Dador de Carga',
  };
  
  // Función para seleccionar archivo
  const handleFileSelect = (templateId: number, entityType: string, entityId: number, file: File) => {
    const key = `${templateId}-${entityType}-${entityId}`;
    setSelectedFiles(prev => ({
      ...prev,
      [key]: { file, expiresAt: undefined },
    }));
  };
  
  // Función para establecer fecha de vencimiento
  const handleExpiresAtChange = (templateId: number, entityType: string, entityId: number, date: string) => {
    const key = `${templateId}-${entityType}-${entityId}`;
    setSelectedFiles(prev => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], expiresAt: date },
      };
    });
  };
  
  // Función para subir documento
  const handleUploadDocument = async (templateId: number, entityType: string, entityId: number) => {
    const key = `${templateId}-${entityType}-${entityId}`;
    const selected = selectedFiles[key];
    if (!selected?.file) return;
    
    // Validar fecha de vencimiento obligatoria
    if (!selected.expiresAt) {
      setMessage({ type: 'error', text: 'Debe ingresar la fecha de vencimiento antes de subir el documento.' });
      return;
    }
    
    // Pedir confirmación antes de subir
    const confirmed = await confirm({
      title: 'Confirmar subida de documento',
      message: `¿Está seguro que desea subir el documento "${selected.file.name}" con fecha de vencimiento ${new Date(selected.expiresAt).toLocaleDateString('es-AR')}?`,
      confirmText: 'Subir',
      cancelText: 'Cancelar',
    });
    
    if (!confirmed) return;
    
    setUploadingDoc(key);
    try {
      const formData = new FormData();
      formData.append('document', selected.file);
      formData.append('templateId', String(templateId));
      formData.append('entityType', entityType);
      formData.append('entityId', String(entityId));
      formData.append('dadorCargaId', String(dadorId));
      formData.append('confirmNewVersion', 'true');
      formData.append('expiresAt', selected.expiresAt);
      
      await uploadDocument(formData).unwrap();
      setMessage({ type: 'success', text: 'Documento subido correctamente. Pendiente de aprobación.' });
      
      // Limpiar archivo seleccionado
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      
      // Refrescar requisitos
      refetchRequisitos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Error al subir documento' });
    } finally {
      setUploadingDoc(null);
    }
  };
  
  // Quitar archivo seleccionado
  const handleRemoveFile = (templateId: number, entityType: string, entityId: number) => {
    const key = `${templateId}-${entityType}-${entityId}`;
    setSelectedFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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
            onClick={goBack}
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
      
      {/* Editar Entidades - Solo para usuarios con permiso de edición */}
      {canEdit && (
      <Card className='p-4 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Modificar Entidades</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Chofer */}
          <div className='space-y-2'>
            <Label>Chofer</Label>
            <div className='flex gap-2 items-center'>
              <select
                className='flex-1 min-w-0 border rounded px-3 py-2 bg-background truncate'
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
                className='flex-shrink-0'
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
            <div className='flex gap-2 items-center'>
              <select
                className='flex-1 min-w-0 border rounded px-3 py-2 bg-background truncate'
                value={selectedCamionId}
                onChange={(e) => setSelectedCamionId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Seleccionar camión</option>
                {camiones.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.patente}</option>
                ))}
              </select>
              <Button
                className='flex-shrink-0'
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
            <div className='flex gap-2 items-center'>
              <select
                className='flex-1 min-w-0 border rounded px-3 py-2 bg-background truncate'
                value={selectedAcopladoId}
                onChange={(e) => setSelectedAcopladoId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>Sin acoplado</option>
                {acoplados.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.patente}</option>
                ))}
              </select>
              <Button
                className='flex-shrink-0'
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
            <div className='flex gap-2 items-center'>
              <select
                className='flex-1 min-w-0 border rounded px-3 py-2 bg-background truncate'
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
                className='flex-shrink-0'
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
      )}
      
      {/* Gestionar Clientes - Solo para usuarios que pueden gestionar clientes */}
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
              {canManageClients && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleRemoveCliente(cliente.id, cliente.nombre)}
                disabled={clientesActuales.length <= 1}
                className={clientesActuales.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Quitar
              </Button>
              )}
            </div>
          ))}
          {clientesActuales.length === 0 && (
            <div className='text-gray-500 text-sm'>No hay clientes asociados</div>
          )}
        </div>
        
        {/* Agregar cliente - Solo para usuarios que pueden gestionar clientes */}
        {canManageClients && (
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
        )}
        
        {canManageClients && (
        <p className='text-xs text-gray-500 mt-2'>
          El equipo debe tener al menos un cliente asociado.
        </p>
        )}
      </Card>
      
      {/* Documentación Requerida */}
      <Card className='p-4 mb-6'>
        <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          <DocumentIcon className='h-5 w-5' />
          Documentación Requerida
        </h2>
        
        {/* Resumen */}
        <div className='flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg'>
          <div className='flex items-center gap-2'>
            <span className='w-3 h-3 rounded-full bg-green-500'></span>
            <span className='text-sm'>Vigentes: {resumenEstados.vigentes}</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-3 h-3 rounded-full bg-yellow-500'></span>
            <span className='text-sm'>Próximos a vencer: {resumenEstados.proximosVencer}</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-3 h-3 rounded-full bg-red-500'></span>
            <span className='text-sm'>Vencidos: {resumenEstados.vencidos}</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-3 h-3 rounded-full bg-blue-500'></span>
            <span className='text-sm'>Pendientes: {resumenEstados.pendientes}</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='w-3 h-3 rounded-full bg-gray-400'></span>
            <span className='text-sm'>Faltantes: {resumenEstados.faltantes}</span>
          </div>
        </div>
        
        {/* Lista por entidad */}
        {Object.entries(requisitosPorEntidad).map(([entityType, reqs]) => (
          <div key={entityType} className='mb-4'>
            <h3 className='font-medium text-gray-700 mb-2'>{entityTypeLabels[entityType] || entityType}</h3>
            <div className='space-y-2'>
              {reqs.map((req) => {
                const style = getEstadoStyle(req.estado);
                const IconComponent = style.icon;
                const fileKey = `${req.templateId}-${req.entityType}-${req.entityId}`;
                const selectedFile = selectedFiles[fileKey];
                const isUploading = uploadingDoc === fileKey;
                // Permitir subir documentos para CUALQUIER requisito (renovar antes de vencer, cambio de proveedor, etc.)
                const canUpload = canUploadDocs;
                
                return (
                  <div
                    key={fileKey}
                    className={`p-3 rounded border ${style.bg}`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <IconComponent className={`h-5 w-5 ${style.text}`} />
                        <div>
                          <div className='font-medium'>{req.templateName}</div>
                          <div className='text-xs text-gray-500'>
                            Requerido por: {req.requeridoPor.map(c => c.clienteName).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className={`text-sm font-medium ${style.text}`}>
                          {req.estado === 'VIGENTE' && 'Vigente'}
                          {req.estado === 'PROXIMO_VENCER' && 'Próximo a vencer'}
                          {req.estado === 'VENCIDO' && 'Vencido'}
                          {req.estado === 'PENDIENTE' && 'Pendiente'}
                          {req.estado === 'FALTANTE' && 'Faltante'}
                        </span>
                        {req.documentoActual?.expiresAt && (
                          <span className='text-xs text-gray-500'>
                            {new Date(req.documentoActual.expiresAt).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Sección de subida para docs faltantes o vencidos */}
                    {canUpload && (
                      <div className='mt-3 pt-3 border-t border-gray-200'>
                        {!selectedFile ? (
                          <label className='flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors'>
                            <input
                              type='file'
                              accept='.pdf,.jpg,.jpeg,.png'
                              className='hidden'
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && req.entityId) {
                                  handleFileSelect(req.templateId, req.entityType, req.entityId, file);
                                }
                              }}
                            />
                            <span className='text-sm text-gray-500'>
                              📎 Seleccionar archivo (PDF o imagen)
                            </span>
                          </label>
                        ) : (
                          <div className='flex flex-col gap-2'>
                            <div className='flex items-center justify-between bg-white p-2 rounded border'>
                              <div className='flex items-center gap-2'>
                                <span className='text-sm font-medium truncate max-w-xs'>
                                  {selectedFile.file.name}
                                </span>
                                <span className='text-xs text-gray-500'>
                                  ({(selectedFile.file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <button
                                type='button'
                                className='text-red-500 hover:text-red-700'
                                onClick={() => req.entityId && handleRemoveFile(req.templateId, req.entityType, req.entityId)}
                              >
                                ✕
                              </button>
                            </div>
                            <div className='flex items-center gap-2'>
                              <label className='text-xs text-gray-600'>
                                Vencimiento: <span className='text-red-500'>*</span>
                              </label>
                              <input
                                type='date'
                                className={`border rounded px-2 py-1 text-sm ${!selectedFile.expiresAt ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                value={selectedFile.expiresAt || ''}
                                onChange={(e) => req.entityId && handleExpiresAtChange(req.templateId, req.entityType, req.entityId, e.target.value)}
                                required
                              />
                              <Button
                                size='sm'
                                onClick={() => req.entityId && handleUploadDocument(req.templateId, req.entityType, req.entityId)}
                                disabled={isUploading || uploading || !selectedFile.expiresAt}
                                title={!selectedFile.expiresAt ? 'Debe ingresar fecha de vencimiento' : ''}
                              >
                                {isUploading ? 'Subiendo...' : 'Subir'}
                              </Button>
                            </div>
                            {!selectedFile.expiresAt && (
                              <p className='text-xs text-red-500 mt-1'>⚠️ La fecha de vencimiento es obligatoria</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {(!requisitos || requisitos.length === 0) && (
          <div className='text-gray-500 text-sm text-center py-4'>
            No hay requisitos documentales configurados para los clientes de este equipo.
          </div>
        )}
      </Card>
      
      {/* Nota informativa */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800'>
        <strong>💡 Nota:</strong> Los documentos subidos quedan pendientes de aprobación.
        Al cambiar una entidad, si la nueva entidad ya tiene documentos vigentes,
        se reutilizarán automáticamente.
      </div>
    </div>
  );
};

export default EditarEquipoPage;

