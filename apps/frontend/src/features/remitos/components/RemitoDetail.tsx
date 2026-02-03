import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  DocumentTextIcon,
  TruckIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import { Remito, ESTADO_LABELS, ESTADO_COLORS } from '../types';
import { 
  useApproveRemitoMutation, 
  useRejectRemitoMutation, 
  useGetRemitoQuery, 
  useReprocessRemitoMutation,
  useUpdateRemitoMutation,
} from '../api/remitosApiSlice';

interface RemitoDetailProps {
  remito: Remito;
  onBack: () => void;
  canApprove?: boolean;
}

interface EditableData {
  numeroRemito: string;
  fechaOperacion: string;
  emisorNombre: string;
  emisorDetalle: string;
  clienteNombre: string;
  producto: string;
  transportistaNombre: string;
  choferNombre: string;
  choferDni: string;
  patenteChasis: string;
  patenteAcoplado: string;
  pesoOrigenBruto: string;
  pesoOrigenTara: string;
  pesoOrigenNeto: string;
  pesoDestinoBruto: string;
  pesoDestinoTara: string;
  pesoDestinoNeto: string;
}

export function RemitoDetail({ remito: initialRemito, onBack, canApprove = false }: RemitoDetailProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditableData>({
    numeroRemito: '',
    fechaOperacion: '',
    emisorNombre: '',
    emisorDetalle: '',
    clienteNombre: '',
    producto: '',
    transportistaNombre: '',
    choferNombre: '',
    choferDni: '',
    patenteChasis: '',
    patenteAcoplado: '',
    pesoOrigenBruto: '',
    pesoOrigenTara: '',
    pesoOrigenNeto: '',
    pesoDestinoBruto: '',
    pesoDestinoTara: '',
    pesoDestinoNeto: '',
  });
  
  // Obtener el remito completo con URLs de imágenes
  const { data: remitoData, isLoading: loadingRemito } = useGetRemitoQuery(initialRemito.id);
  const remito = remitoData?.data || initialRemito;
  
  const [approve, { isLoading: approving }] = useApproveRemitoMutation();
  const [reject, { isLoading: rejecting }] = useRejectRemitoMutation();
  const [reprocess, { isLoading: reprocessing }] = useReprocessRemitoMutation();
  const [updateRemito, { isLoading: updating }] = useUpdateRemitoMutation();
  
  // Inicializar datos editables cuando el remito cambia
  useEffect(() => {
    if (remito) {
      setEditData({
        numeroRemito: remito.numeroRemito ?? '',
        fechaOperacion: remito.fechaOperacion ? new Date(remito.fechaOperacion).toISOString().split('T')[0] : '',
        emisorNombre: remito.emisorNombre ?? '',
        emisorDetalle: remito.emisorDetalle ?? '',
        clienteNombre: remito.clienteNombre ?? '',
        producto: remito.producto ?? '',
        transportistaNombre: remito.transportistaNombre ?? '',
        choferNombre: remito.choferNombre ?? '',
        choferDni: remito.choferDni ?? '',
        patenteChasis: remito.patenteChasis ?? '',
        patenteAcoplado: remito.patenteAcoplado ?? '',
        pesoOrigenBruto: remito.pesoOrigenBruto?.toString() ?? '',
        pesoOrigenTara: remito.pesoOrigenTara?.toString() ?? '',
        pesoOrigenNeto: remito.pesoOrigenNeto?.toString() ?? '',
        pesoDestinoBruto: remito.pesoDestinoBruto?.toString() ?? '',
        pesoDestinoTara: remito.pesoDestinoTara?.toString() ?? '',
        pesoDestinoNeto: remito.pesoDestinoNeto?.toString() ?? '',
      });
    }
  }, [remito]);
  
  const estadoLabel = ESTADO_LABELS[remito.estado];
  const estadoColor = ESTADO_COLORS[remito.estado];
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatWeight = (weight: number | null) => {
    if (weight === null) return '-';
    return `${weight.toLocaleString('es-AR')} kg`;
  };
  
  const handleApprove = async () => {
    try {
      await approve(remito.id).unwrap();
    } catch (err) {
      console.error('Error aprobando:', err);
    }
  };
  
  const handleReject = async () => {
    if (rejectMotivo.length < 5) return;
    try {
      await reject({ id: remito.id, motivo: rejectMotivo }).unwrap();
      setShowRejectModal(false);
      setRejectMotivo('');
    } catch (err) {
      console.error('Error rechazando:', err);
    }
  };
  
  const handleReprocess = async () => {
    try {
      await reprocess(remito.id).unwrap();
      // Volver a la lista después de reprocesar
      onBack();
    } catch (err) {
      console.error('Error reprocesando:', err);
    }
  };
  
  const handleSaveEdit = async () => {
    try {
      await updateRemito({
        id: remito.id,
        data: {
          numeroRemito: editData.numeroRemito || null,
          fechaOperacion: editData.fechaOperacion || null,
          emisorNombre: editData.emisorNombre || null,
          emisorDetalle: editData.emisorDetalle || null,
          clienteNombre: editData.clienteNombre || null,
          producto: editData.producto || null,
          transportistaNombre: editData.transportistaNombre || null,
          choferNombre: editData.choferNombre || null,
          choferDni: editData.choferDni || null,
          patenteChasis: editData.patenteChasis || null,
          patenteAcoplado: editData.patenteAcoplado || null,
          pesoOrigenBruto: editData.pesoOrigenBruto ? Number(editData.pesoOrigenBruto) : null,
          pesoOrigenTara: editData.pesoOrigenTara ? Number(editData.pesoOrigenTara) : null,
          pesoOrigenNeto: editData.pesoOrigenNeto ? Number(editData.pesoOrigenNeto) : null,
          pesoDestinoBruto: editData.pesoDestinoBruto ? Number(editData.pesoDestinoBruto) : null,
          pesoDestinoTara: editData.pesoDestinoTara ? Number(editData.pesoDestinoTara) : null,
          pesoDestinoNeto: editData.pesoDestinoNeto ? Number(editData.pesoDestinoNeto) : null,
        },
      }).unwrap();
      setIsEditing(false);
    } catch (err) {
      console.error('Error guardando edición:', err);
      alert('Error al guardar los cambios');
    }
  };
  
  const handleCancelEdit = () => {
    // Restaurar datos originales
    setEditData({
      numeroRemito: remito.numeroRemito ?? '',
      fechaOperacion: remito.fechaOperacion ? new Date(remito.fechaOperacion).toISOString().split('T')[0] : '',
      emisorNombre: remito.emisorNombre ?? '',
      emisorDetalle: remito.emisorDetalle ?? '',
      clienteNombre: remito.clienteNombre ?? '',
      producto: remito.producto ?? '',
      transportistaNombre: remito.transportistaNombre ?? '',
      choferNombre: remito.choferNombre ?? '',
      choferDni: remito.choferDni ?? '',
      patenteChasis: remito.patenteChasis ?? '',
      patenteAcoplado: remito.patenteAcoplado ?? '',
      pesoOrigenBruto: remito.pesoOrigenBruto?.toString() ?? '',
      pesoOrigenTara: remito.pesoOrigenTara?.toString() ?? '',
      pesoOrigenNeto: remito.pesoOrigenNeto?.toString() ?? '',
      pesoDestinoBruto: remito.pesoDestinoBruto?.toString() ?? '',
      pesoDestinoTara: remito.pesoDestinoTara?.toString() ?? '',
      pesoDestinoNeto: remito.pesoDestinoNeto?.toString() ?? '',
    });
    setIsEditing(false);
  };
  
  const handleFieldChange = (field: keyof EditableData, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Funciones para calcular peso faltante (Bruto - Tara = Neto)
  const calcularPesoOrigen = () => {
    const bruto = parseFloat(editData.pesoOrigenBruto) || 0;
    const tara = parseFloat(editData.pesoOrigenTara) || 0;
    const neto = parseFloat(editData.pesoOrigenNeto) || 0;
    
    const hasBruto = editData.pesoOrigenBruto !== '';
    const hasTara = editData.pesoOrigenTara !== '';
    const hasNeto = editData.pesoOrigenNeto !== '';
    
    if (hasBruto && hasTara && !hasNeto) {
      // Calcular Neto = Bruto - Tara
      setEditData(prev => ({ ...prev, pesoOrigenNeto: (bruto - tara).toString() }));
    } else if (hasBruto && hasNeto && !hasTara) {
      // Calcular Tara = Bruto - Neto
      setEditData(prev => ({ ...prev, pesoOrigenTara: (bruto - neto).toString() }));
    } else if (hasTara && hasNeto && !hasBruto) {
      // Calcular Bruto = Tara + Neto
      setEditData(prev => ({ ...prev, pesoOrigenBruto: (tara + neto).toString() }));
    } else if (hasBruto && hasTara) {
      // Si ya tiene bruto y tara, recalcular neto
      setEditData(prev => ({ ...prev, pesoOrigenNeto: (bruto - tara).toString() }));
    }
  };

  const calcularPesoDestino = () => {
    const bruto = parseFloat(editData.pesoDestinoBruto) || 0;
    const tara = parseFloat(editData.pesoDestinoTara) || 0;
    const neto = parseFloat(editData.pesoDestinoNeto) || 0;
    
    const hasBruto = editData.pesoDestinoBruto !== '';
    const hasTara = editData.pesoDestinoTara !== '';
    const hasNeto = editData.pesoDestinoNeto !== '';
    
    if (hasBruto && hasTara && !hasNeto) {
      // Calcular Neto = Bruto - Tara
      setEditData(prev => ({ ...prev, pesoDestinoNeto: (bruto - tara).toString() }));
    } else if (hasBruto && hasNeto && !hasTara) {
      // Calcular Tara = Bruto - Neto
      setEditData(prev => ({ ...prev, pesoDestinoTara: (bruto - neto).toString() }));
    } else if (hasTara && hasNeto && !hasBruto) {
      // Calcular Bruto = Tara + Neto
      setEditData(prev => ({ ...prev, pesoDestinoBruto: (tara + neto).toString() }));
    } else if (hasBruto && hasTara) {
      // Si ya tiene bruto y tara, recalcular neto
      setEditData(prev => ({ ...prev, pesoDestinoNeto: (bruto - tara).toString() }));
    }
  };
  
  const isPendingApproval = remito.estado === 'PENDIENTE_APROBACION';
  const canEdit = canApprove && remito.estado !== 'APROBADO';
  const canReprocess = canApprove && remito.estado !== 'APROBADO';
  
  // Loading state
  if (loadingRemito) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Volver</span>
        </button>
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${estadoColor}`}>
            {estadoLabel}
          </span>
          
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              title="Editar datos"
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </button>
          )}
          
          {isEditing && (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                {updating ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Cancelar
              </button>
            </>
          )}
          
          {canReprocess && !isEditing && (
            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
              title="Reprocesar con IA"
            >
              <ArrowPathIcon className={`h-4 w-4 ${reprocessing ? 'animate-spin' : ''}`} />
              {reprocessing ? 'Reprocesando...' : 'Reprocesar con IA'}
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imagen del remito */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            📄 Imagen del Remito
          </h3>
          {remito.imagenes.length > 0 && remito.imagenes[0].url ? (
            remito.imagenes[0].mimeType === 'application/pdf' ? (
              // Mostrar PDF embebido o link
              <div className="space-y-3">
                <iframe
                  src={remito.imagenes[0].url}
                  className="w-full h-[500px] rounded-lg border border-slate-200 dark:border-slate-600"
                  title="Remito PDF"
                />
                <a
                  href={remito.imagenes[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Abrir PDF en nueva pestaña
                </a>
              </div>
            ) : (
              // Mostrar imagen
              <img
                src={remito.imagenes[0].url}
                alt="Remito"
                className="w-full rounded-lg max-h-[500px] object-contain bg-slate-100 dark:bg-slate-700"
              />
            )
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
              <DocumentTextIcon className="h-16 w-16 text-slate-400" />
            </div>
          )}
          
          {/* Confianza IA */}
          {remito.confianzaIA !== null && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-300">Confianza del análisis</span>
                <span className={`font-semibold ${
                  remito.confianzaIA >= 80 ? 'text-green-600' :
                  remito.confianzaIA >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {remito.confianzaIA}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    remito.confianzaIA >= 80 ? 'bg-green-500' :
                    remito.confianzaIA >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${remito.confianzaIA}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Datos extraídos */}
        <div className="space-y-6">
          {/* Info principal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              📋 Datos del Remito {isEditing && <span className="text-amber-500 text-sm">(Editando)</span>}
            </h3>
            
            <dl className="space-y-3">
              <EditableRow 
                icon={DocumentTextIcon} 
                label="Número" 
                value={editData.numeroRemito}
                displayValue={remito.numeroRemito}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('numeroRemito', v)}
                placeholder="Número de remito"
              />
              <EditableRow 
                icon={CalendarIcon} 
                label="Fecha" 
                value={editData.fechaOperacion}
                displayValue={formatDate(remito.fechaOperacion)}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('fechaOperacion', v)}
                type="date"
              />
              <EditableRow 
                icon={MapPinIcon} 
                label="Emisor" 
                value={editData.emisorNombre}
                displayValue={remito.emisorNombre}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('emisorNombre', v)}
                placeholder="Nombre del emisor"
              />
              <EditableRow 
                label="Detalle Emisor" 
                value={editData.emisorDetalle}
                displayValue={remito.emisorDetalle}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('emisorDetalle', v)}
                placeholder="Detalle del emisor"
              />
              <EditableRow 
                icon={MapPinIcon} 
                label="Cliente" 
                value={editData.clienteNombre}
                displayValue={remito.clienteNombre}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('clienteNombre', v)}
                placeholder="Nombre del cliente"
              />
              <EditableRow 
                icon={DocumentTextIcon} 
                label="Producto" 
                value={editData.producto}
                displayValue={remito.producto}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('producto', v)}
                placeholder="Descripción del producto"
              />
            </dl>
          </div>
          
          {/* Chofer que cargó el remito (datos de la carga, no extraídos por IA) */}
          {(remito.choferCargadorDni || remito.choferCargadorNombre || remito.choferCargadorApellido) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                👤 Chofer Asignado (Carga)
              </h3>
              
              <dl className="space-y-3">
                <InfoRow 
                  icon={UserIcon} 
                  label="Nombre" 
                  value={`${remito.choferCargadorNombre ?? ''} ${remito.choferCargadorApellido ?? ''}`.trim() || '-'} 
                />
                <InfoRow 
                  label="DNI" 
                  value={remito.choferCargadorDni || '-'} 
                />
              </dl>
              
              <p className="mt-3 text-xs text-blue-600 dark:text-blue-400 italic">
                Datos del chofer seleccionado/registrado al cargar el remito
              </p>
            </div>
          )}
          
          {/* Transporte (datos extraídos por IA) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              🚛 Transporte (extraído del remito)
            </h3>
            
            <dl className="space-y-3">
              <EditableRow 
                icon={TruckIcon} 
                label="Transportista" 
                value={editData.transportistaNombre}
                displayValue={remito.transportistaNombre}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('transportistaNombre', v)}
                placeholder="Nombre del transportista"
              />
              <EditableRow 
                icon={UserIcon} 
                label="Chofer (remito)" 
                value={editData.choferNombre}
                displayValue={remito.choferNombre}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('choferNombre', v)}
                placeholder="Nombre del chofer"
              />
              <EditableRow 
                label="DNI Chofer" 
                value={editData.choferDni}
                displayValue={remito.choferDni}
                isEditing={isEditing}
                onChange={(v) => handleFieldChange('choferDni', v)}
                placeholder="DNI del chofer"
              />
              <div className="grid grid-cols-2 gap-4">
                <EditableRow 
                  label="Patente Chasis" 
                  value={editData.patenteChasis}
                  displayValue={remito.patenteChasis}
                  isEditing={isEditing}
                  onChange={(v) => handleFieldChange('patenteChasis', v.toUpperCase())}
                  placeholder="Ej: AB123CD"
                  className="uppercase"
                />
                <EditableRow 
                  label="Patente Acoplado" 
                  value={editData.patenteAcoplado}
                  displayValue={remito.patenteAcoplado}
                  isEditing={isEditing}
                  onChange={(v) => handleFieldChange('patenteAcoplado', v.toUpperCase())}
                  placeholder="Ej: AB123CD"
                  className="uppercase"
                />
              </div>
            </dl>
          </div>
          
          {/* Pesos - siempre visibles */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              ⚖️ Pesos
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Pesos Origen */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Origen</h4>
                <dl className="space-y-2">
                  <EditableRow 
                    label="Bruto" 
                    value={editData.pesoOrigenBruto}
                    displayValue={formatWeight(remito.pesoOrigenBruto)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoOrigenBruto', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                  />
                  <EditableRow 
                    label="Tara" 
                    value={editData.pesoOrigenTara}
                    displayValue={formatWeight(remito.pesoOrigenTara)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoOrigenTara', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                  />
                  <EditableRow 
                    label="Neto" 
                    value={editData.pesoOrigenNeto}
                    displayValue={formatWeight(remito.pesoOrigenNeto)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoOrigenNeto', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                    highlight
                  />
                </dl>
                {isEditing && (
                  <button
                    type="button"
                    onClick={calcularPesoOrigen}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    title="Calcular peso faltante (Bruto - Tara = Neto)"
                  >
                    <CalculatorIcon className="h-4 w-4" />
                    Recalcular
                  </button>
                )}
              </div>
              
              {/* Pesos Destino - siempre visible */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Destino</h4>
                <dl className="space-y-2">
                  <EditableRow 
                    label="Bruto" 
                    value={editData.pesoDestinoBruto}
                    displayValue={formatWeight(remito.pesoDestinoBruto)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoDestinoBruto', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                  />
                  <EditableRow 
                    label="Tara" 
                    value={editData.pesoDestinoTara}
                    displayValue={formatWeight(remito.pesoDestinoTara)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoDestinoTara', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                  />
                  <EditableRow 
                    label="Neto" 
                    value={editData.pesoDestinoNeto}
                    displayValue={formatWeight(remito.pesoDestinoNeto)}
                    isEditing={isEditing}
                    onChange={(v) => handleFieldChange('pesoDestinoNeto', v)}
                    type="number"
                    placeholder="0"
                    suffix="kg"
                    small
                    highlight
                  />
                </dl>
                {isEditing && (
                  <button
                    type="button"
                    onClick={calcularPesoDestino}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    title="Calcular peso faltante (Bruto - Tara = Neto)"
                  >
                    <CalculatorIcon className="h-4 w-4" />
                    Recalcular
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Botones de acción */}
      {canApprove && isPendingApproval && !isEditing && (
        <div className="flex gap-4 justify-end p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={rejecting || approving}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <XCircleIcon className="h-5 w-5" />
            Rechazar
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircleIcon className="h-5 w-5" />
            {approving ? 'Aprobando...' : 'Aprobar'}
          </button>
        </div>
      )}
      
      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rechazar Remito
            </h3>
            <textarea
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Motivo del rechazo (mínimo 5 caracteres)"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMotivo.length < 5 || rejecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para filas de información (solo lectura)
interface InfoRowProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string | null | undefined;
  subvalue?: string | null;
  small?: boolean;
  highlight?: boolean;
}

function InfoRow({ icon: Icon, label, value, subvalue, small, highlight }: InfoRowProps) {
  return (
    <div className={`flex ${small ? '' : 'items-start'}`}>
      {Icon && <Icon className="h-5 w-5 text-slate-400 mr-2 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <dt className={`text-slate-500 dark:text-slate-400 ${small ? 'text-xs' : 'text-sm'}`}>
          {label}
        </dt>
        <dd className={`
          ${small ? 'text-sm' : 'text-base'}
          ${highlight ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}
          truncate
        `}>
          {value || '-'}
        </dd>
        {subvalue && (
          <dd className="text-xs text-slate-500 dark:text-slate-400">
            {subvalue}
          </dd>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para filas editables
interface EditableRowProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  displayValue: string | null | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
  suffix?: string;
  small?: boolean;
  highlight?: boolean;
  className?: string;
}

function EditableRow({ 
  icon: Icon, 
  label, 
  value, 
  displayValue, 
  isEditing, 
  onChange, 
  type = 'text',
  placeholder,
  suffix,
  small,
  highlight,
  className,
}: EditableRowProps) {
  if (!isEditing) {
    return (
      <div className={`flex ${small ? '' : 'items-start'}`}>
        {Icon && <Icon className="h-5 w-5 text-slate-400 mr-2 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <dt className={`text-slate-500 dark:text-slate-400 ${small ? 'text-xs' : 'text-sm'}`}>
            {label}
          </dt>
          <dd className={`
            ${small ? 'text-sm' : 'text-base'}
            ${highlight ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}
            truncate
          `}>
            {displayValue || '-'}
          </dd>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${small ? '' : 'items-start'}`}>
      {Icon && <Icon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <label className={`block text-amber-600 dark:text-amber-400 ${small ? 'text-xs' : 'text-sm'} font-medium`}>
          {label}
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`
              flex-1 px-2 py-1 border border-amber-300 dark:border-amber-600 rounded
              bg-white dark:bg-slate-700 text-slate-900 dark:text-white
              focus:ring-2 focus:ring-amber-500 focus:border-amber-500
              ${small ? 'text-sm' : 'text-base'}
              ${highlight ? 'font-semibold' : ''}
              ${className ?? ''}
            `}
          />
          {suffix && (
            <span className="text-sm text-slate-500 dark:text-slate-400">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}
