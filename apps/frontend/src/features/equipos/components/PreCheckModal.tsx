import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import { Button } from '../../../components/ui/button';
import { 
  usePreCheckDocumentosMutation,
  useCrearSolicitudTransferenciaMutation,
} from '../../documentos/api/documentosApiSlice';

interface PreCheckEntity {
  entityType: string;
  entityId: number | null;
  identificador: string;
  nombre?: string;
  existe: boolean;
  dadorCargaActualId: number | null;
  dadorCargaActualNombre?: string;
  perteneceSolicitante: boolean;
  requiereTransferencia: boolean;
  documentos: Array<{
    id: number;
    templateId: number;
    templateName: string;
    estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'PENDIENTE' | 'RECHAZADO' | 'FALTANTE';
    expiresAt: string | null;
    diasParaVencer: number | null;
    reutilizable: boolean;
    requiereTransferencia: boolean;
  }>;
  resumen: {
    total: number;
    vigentes: number;
    porVencer: number;
    vencidos: number;
    pendientes: number;
    rechazados: number;
    faltantes: number;
    completo: boolean;
  };
}

interface PreCheckResult {
  entidades: PreCheckEntity[];
  hayEntidadesDeOtroDador: boolean;
  requiereTransferencia: boolean;
  dadorActualIds: number[];
}

interface PreCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidades: Array<{ entityType: string; identificador: string; nombre?: string }>;
  clienteId?: number;
  onContinue: (preCheckResult: PreCheckResult) => void;
  onTransferenciaCreada: () => void;
}

const ENTITY_ICONS: Record<string, string> = {
  CHOFER: '👤',
  CAMION: '🚛',
  ACOPLADO: '📦',
  EMPRESA_TRANSPORTISTA: '🏢',
};

const ENTITY_LABELS: Record<string, string> = {
  CHOFER: 'Chofer',
  CAMION: 'Camión',
  ACOPLADO: 'Acoplado',
  EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
};

const STATUS_COLORS: Record<string, string> = {
  VIGENTE: 'bg-green-100 text-green-800',
  POR_VENCER: 'bg-yellow-100 text-yellow-800',
  VENCIDO: 'bg-red-100 text-red-800',
  PENDIENTE: 'bg-blue-100 text-blue-800',
  RECHAZADO: 'bg-red-100 text-red-800',
  FALTANTE: 'bg-gray-100 text-gray-800',
};

export const PreCheckModal: React.FC<PreCheckModalProps> = ({
  isOpen,
  onClose,
  entidades,
  clienteId,
  onContinue,
  onTransferenciaCreada,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const hasDadorCargaId = Boolean(user?.dadorCargaId);

  const [preCheck, { isLoading: checking }] = usePreCheckDocumentosMutation();
  const [crearTransferencia, { isLoading: creatingTransferencia }] = useCrearSolicitudTransferenciaMutation();
  
  const [result, setResult] = useState<PreCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motivoTransferencia, setMotivoTransferencia] = useState('');
  const [showTransferenciaForm, setShowTransferenciaForm] = useState(false);
  const [transferenciaCreada, setTransferenciaCreada] = useState(false);

  // Ejecutar pre-check cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && entidades.length > 0) {
      runPreCheck();
    }
  }, [isOpen]);

  const runPreCheck = async () => {
    setError(null);
    setResult(null);
    setShowTransferenciaForm(false);
    setTransferenciaCreada(false);
    
    try {
      const res = await preCheck({ entidades, clienteId }).unwrap();
      setResult(res);
    } catch (err: any) {
      setError(err?.data?.message || 'Error al verificar entidades');
    }
  };

  const handleContinue = () => {
    if (result) {
      onContinue(result);
      onClose();
    }
  };

  const handleSolicitarTransferencia = async () => {
    if (!result || motivoTransferencia.trim().length < 3) return;

    const entidadesParaTransferir = result.entidades
      .filter(e => e.requiereTransferencia && e.entityId && e.dadorCargaActualId)
      .map(e => ({
        tipo: e.entityType,
        id: e.entityId!,
        identificador: e.identificador,
        nombre: e.nombre,
      }));

    if (entidadesParaTransferir.length === 0) return;

    // Agrupar por dador actual
    const dadorActualId = result.dadorActualIds[0]; // Por simplicidad, usar el primero

    try {
      await crearTransferencia({
        dadorActualId,
        entidades: entidadesParaTransferir,
        motivo: motivoTransferencia,
      }).unwrap();
      
      setTransferenciaCreada(true);
      onTransferenciaCreada();
    } catch (err: any) {
      setError(err?.data?.message || 'Error al crear solicitud de transferencia');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">🔍 Verificación de Entidades</h2>
          <p className="text-sm text-gray-500 mt-1">
            Verificando si las entidades ya existen y el estado de sus documentos
          </p>
        </div>

        <div className="p-6">
          {checking && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Verificando entidades...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={runPreCheck} className="mt-2">
                Reintentar
              </Button>
            </div>
          )}

          {result && !transferenciaCreada && (
            <>
              {/* Resumen general */}
              <div className={`p-4 rounded-lg mb-4 ${
                result.requiereTransferencia 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {result.requiereTransferencia ? (
                  <div>
                    <p className="font-medium text-yellow-800">
                      ⚠️ Algunas entidades pertenecen a otro Dador de Carga
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Para reutilizar sus documentos, deberás solicitar una transferencia que será aprobada por un administrador.
                    </p>
                  </div>
                ) : (
                  <p className="font-medium text-green-800">
                    ✅ Todas las entidades están disponibles para usar
                  </p>
                )}
              </div>

              {/* Lista de entidades */}
              <div className="space-y-4">
                {result.entidades.map((entidad) => (
                  <div key={`${entidad.entityType}-${entidad.identificador}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{ENTITY_ICONS[entidad.entityType] || '📄'}</span>
                        <div>
                          <p className="font-medium">
                            {ENTITY_LABELS[entidad.entityType] || entidad.entityType}: {entidad.identificador}
                          </p>
                          {entidad.nombre && (
                            <p className="text-sm text-gray-500">{entidad.nombre}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entidad.existe ? (
                          entidad.perteneceSolicitante ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              ✓ Tuya
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              ⚠️ De: {entidad.dadorCargaActualNombre || 'Otro dador'}
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            🆕 Nueva
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Documentos */}
                    {entidad.existe && entidad.documentos.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-500 mb-2">Documentos:</p>
                        <div className="flex flex-wrap gap-2">
                          {entidad.documentos.map((doc, docIdx) => (
                            <span 
                              key={docIdx}
                              className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[doc.estado]}`}
                              title={doc.templateName}
                            >
                              {doc.estado === 'VIGENTE' && '✓'}
                              {doc.estado === 'POR_VENCER' && `⏰ ${doc.diasParaVencer}d`}
                              {doc.estado === 'VENCIDO' && '⛔'}
                              {doc.estado === 'PENDIENTE' && '⏳'}
                              {doc.estado === 'RECHAZADO' && '❌'}
                              {doc.estado === 'FALTANTE' && '📄'}
                              {' '}{doc.templateName.substring(0, 20)}...
                            </span>
                          ))}
                        </div>
                        
                        {/* Resumen */}
                        <div className="mt-2 text-xs text-gray-500">
                          {entidad.resumen.vigentes > 0 && <span className="mr-2">✓ {entidad.resumen.vigentes} vigentes</span>}
                          {entidad.resumen.porVencer > 0 && <span className="mr-2 text-yellow-600">⏰ {entidad.resumen.porVencer} por vencer</span>}
                          {entidad.resumen.vencidos > 0 && <span className="mr-2 text-red-600">⛔ {entidad.resumen.vencidos} vencidos</span>}
                          {entidad.resumen.faltantes > 0 && <span className="mr-2 text-gray-600">📄 {entidad.resumen.faltantes} faltantes</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Formulario de transferencia */}
              {result.requiereTransferencia && !showTransferenciaForm && (
                <div className="mt-6 pt-6 border-t">
                  {hasDadorCargaId ? (
                    <Button 
                      onClick={() => setShowTransferenciaForm(true)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      🔀 Solicitar Transferencia de Entidades
                    </Button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-red-700 font-medium">
                        No podés solicitar transferencias
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Tu usuario no tiene un Dador de Carga asociado. Contactá a un administrador para que lo configure.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showTransferenciaForm && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-3">Solicitud de Transferencia</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Las siguientes entidades serán solicitadas para transferencia:
                  </p>
                  <ul className="list-disc list-inside text-sm mb-4">
                    {result.entidades
                      .filter(e => e.requiereTransferencia)
                      .map((e) => (
                        <li key={`transfer-${e.entityType}-${e.identificador}`}>
                          {ENTITY_LABELS[e.entityType]}: {e.identificador} 
                          {e.nombre && ` (${e.nombre})`}
                        </li>
                      ))}
                  </ul>
                  
                  <textarea
                    value={motivoTransferencia}
                    onChange={(e) => setMotivoTransferencia(e.target.value)}
                    placeholder="Motivo de la solicitud (obligatorio, mínimo 3 caracteres)..."
                    className="w-full border rounded-lg p-3 h-24 resize-none mb-4"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowTransferenciaForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSolicitarTransferencia}
                      disabled={creatingTransferencia || motivoTransferencia.trim().length < 3}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {creatingTransferencia ? 'Enviando...' : 'Enviar Solicitud'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {transferenciaCreada && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-medium mb-2">¡Solicitud Enviada!</h3>
              <p className="text-gray-500 mb-4">
                Tu solicitud de transferencia ha sido enviada y será revisada por un administrador.
                Recibirás una notificación cuando sea procesada.
              </p>
              <Button onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {result && !transferenciaCreada && !showTransferenciaForm && (
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {!result.requiereTransferencia && (
              <Button onClick={handleContinue} className="bg-green-600 hover:bg-green-700">
                ✓ Continuar con Alta
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreCheckModal;
