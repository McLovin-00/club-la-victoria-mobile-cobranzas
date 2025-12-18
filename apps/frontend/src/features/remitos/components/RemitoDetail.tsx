import { useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { Remito, ESTADO_LABELS, ESTADO_COLORS } from '../types';
import { useApproveRemitoMutation, useRejectRemitoMutation, useGetRemitoQuery } from '../api/remitosApiSlice';

interface RemitoDetailProps {
  remito: Remito;
  onBack: () => void;
  canApprove?: boolean;
}

export function RemitoDetail({ remito: initialRemito, onBack, canApprove = false }: RemitoDetailProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  
  // Obtener el remito completo con URLs de imágenes
  const { data: remitoData, isLoading: loadingRemito } = useGetRemitoQuery(initialRemito.id);
  const remito = remitoData?.data || initialRemito;
  
  const [approve, { isLoading: approving }] = useApproveRemitoMutation();
  const [reject, { isLoading: rejecting }] = useRejectRemitoMutation();
  
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
  
  const isPendingApproval = remito.estado === 'PENDIENTE_APROBACION';
  
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
        
        <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${estadoColor}`}>
          {estadoLabel}
        </span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imagen del remito */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            📄 Imagen del Remito
          </h3>
          {remito.imagenes.length > 0 && remito.imagenes[0].url ? (
            <img
              src={remito.imagenes[0].url}
              alt="Remito"
              className="w-full rounded-lg max-h-[500px] object-contain bg-slate-100 dark:bg-slate-700"
            />
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
              📋 Datos del Remito
            </h3>
            
            <dl className="space-y-3">
              <InfoRow icon={DocumentTextIcon} label="Número" value={remito.numeroRemito} />
              <InfoRow icon={CalendarIcon} label="Fecha" value={formatDate(remito.fechaOperacion)} />
              <InfoRow icon={MapPinIcon} label="Emisor" value={remito.emisorNombre} subvalue={remito.emisorDetalle} />
              <InfoRow icon={MapPinIcon} label="Cliente" value={remito.clienteNombre} />
              <InfoRow icon={DocumentTextIcon} label="Producto" value={remito.producto} />
            </dl>
          </div>
          
          {/* Transporte */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              🚛 Transporte
            </h3>
            
            <dl className="space-y-3">
              <InfoRow icon={TruckIcon} label="Transportista" value={remito.transportistaNombre} />
              <InfoRow icon={UserIcon} label="Chofer" value={remito.choferNombre} subvalue={remito.choferDni ? `DNI: ${remito.choferDni}` : undefined} />
              <div className="flex gap-4">
                <InfoRow label="Chasis" value={remito.patenteChasis} />
                <InfoRow label="Acoplado" value={remito.patenteAcoplado} />
              </div>
            </dl>
          </div>
          
          {/* Pesos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              ⚖️ Pesos
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Origen</h4>
                <dl className="space-y-2">
                  <InfoRow label="Bruto" value={formatWeight(remito.pesoOrigenBruto)} small />
                  <InfoRow label="Tara" value={formatWeight(remito.pesoOrigenTara)} small />
                  <InfoRow label="Neto" value={formatWeight(remito.pesoOrigenNeto)} small highlight />
                </dl>
              </div>
              
              {remito.tieneTicketDestino && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Destino</h4>
                  <dl className="space-y-2">
                    <InfoRow label="Bruto" value={formatWeight(remito.pesoDestinoBruto)} small />
                    <InfoRow label="Tara" value={formatWeight(remito.pesoDestinoTara)} small />
                    <InfoRow label="Neto" value={formatWeight(remito.pesoDestinoNeto)} small highlight />
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Botones de acción */}
      {canApprove && isPendingApproval && (
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

// Componente auxiliar para filas de información
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

