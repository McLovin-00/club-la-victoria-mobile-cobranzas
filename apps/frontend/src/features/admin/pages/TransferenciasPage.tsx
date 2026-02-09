import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetTransferenciasPendientesQuery,
  useGetTransferenciasQuery,
  useAprobarTransferenciaMutation,
  useRechazarTransferenciaMutation,
} from '../../documentos/api/documentosApiSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../hooks/useToast';

/**
 * Panel de Transferencias para ADMIN / ADMIN_INTERNO
 * Permite ver y gestionar solicitudes de transferencia de entidades
 */
const TransferenciasPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [solicitudRechazar, setSolicitudRechazar] = useState<number | null>(null);

  // Queries
  const { data: pendientesData, isLoading: loadingPendientes, refetch: refetchPendientes } = 
    useGetTransferenciasPendientesQuery(undefined, { skip: selectedTab !== 'pendientes' });
  
  const { data: historialData, isLoading: loadingHistorial } = 
    useGetTransferenciasQuery({ limit: 50 }, { skip: selectedTab !== 'historial' });

  // Mutations
  const [aprobar, { isLoading: aprobando }] = useAprobarTransferenciaMutation();
  const [rechazar, { isLoading: rechazando }] = useRechazarTransferenciaMutation();

  const solicitudesPendientes = pendientesData?.solicitudes ?? [];
  const solicitudesHistorial = historialData?.solicitudes ?? [];

  const handleAprobar = async (id: number) => {
    try {
      const result = await aprobar({ id }).unwrap();
      toast({
        title: 'Transferencia aprobada',
        description: result.message || `${result.entidadesTransferidas} entidad(es) transferida(s)`,
      });
      refetchPendientes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.data?.message || 'No se pudo aprobar la transferencia',
        variant: 'destructive',
      });
    }
  };

  const handleRechazar = async () => {
    if (!solicitudRechazar || !motivoRechazo.trim() || motivoRechazo.length < 10) {
      toast({
        title: 'Error',
        description: 'El motivo de rechazo debe tener al menos 10 caracteres',
        variant: 'destructive',
      });
      return;
    }

    try {
      await rechazar({ id: solicitudRechazar, motivoRechazo }).unwrap();
      toast({
        title: 'Transferencia rechazada',
        description: 'La solicitud ha sido rechazada',
      });
      setSolicitudRechazar(null);
      setMotivoRechazo('');
      refetchPendientes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.data?.message || 'No se pudo rechazar la transferencia',
        variant: 'destructive',
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      APROBADA: 'bg-green-100 text-green-800',
      RECHAZADA: 'bg-red-100 text-red-800',
      CANCELADA: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100'}`}>
        {estado}
      </span>
    );
  };

  const getTipoEntidadIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      CHOFER: '👤',
      CAMION: '🚛',
      ACOPLADO: '📦',
      EMPRESA_TRANSPORTISTA: '🏢',
    };
    return icons[tipo] || '📄';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Transferencia</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona las solicitudes de transferencia de entidades entre dadores de carga
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedTab('pendientes')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === 'pendientes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 Pendientes ({solicitudesPendientes.length})
        </button>
        <button
          onClick={() => setSelectedTab('historial')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === 'historial'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📜 Historial
        </button>
      </div>

      {/* Contenido */}
      {selectedTab === 'pendientes' && (
        <div className="space-y-4">
          {loadingPendientes ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : solicitudesPendientes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                ✅ No hay solicitudes pendientes
              </CardContent>
            </Card>
          ) : (
            solicitudesPendientes.map((sol: any) => (
              <Card key={sol.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Solicitud #{sol.id}
                    </CardTitle>
                    {getEstadoBadge(sol.estado)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Solicitante</p>
                      <p className="font-medium">{sol.solicitanteDadorNombre || 'Dador #' + sol.solicitanteDadorId}</p>
                      <p className="text-xs text-gray-400">{sol.solicitanteUserEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dador Actual</p>
                      <p className="font-medium">{sol.dadorActualNombre || 'Dador #' + sol.dadorActualId}</p>
                    </div>
                  </div>

                  {/* Entidades */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Entidades a transferir:</p>
                    <div className="flex flex-wrap gap-2">
                      {(sol.entidades ?? []).map((ent: any) => (
                        <span 
                          key={`${ent.tipo}-${ent.identificador || ent.nombre || ent.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {getTipoEntidadIcon(ent.tipo)} {ent.nombre || ent.identificador}
                        </span>
                      ))}
                    </div>
                  </div>

                  {sol.motivo && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Motivo:</p>
                      <p className="text-sm italic">"{sol.motivo}"</p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleAprobar(sol.id)}
                      disabled={aprobando}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {aprobando ? '...' : '✅ Aprobar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSolicitudRechazar(sol.id)}
                      disabled={rechazando}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      ❌ Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedTab === 'historial' && (
        <div className="space-y-4">
          {loadingHistorial ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : solicitudesHistorial.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No hay solicitudes en el historial
              </CardContent>
            </Card>
          ) : (
            solicitudesHistorial.map((sol: any) => (
              <Card key={sol.id} className="opacity-80">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-medium">#{sol.id}</span>
                      {getEstadoBadge(sol.estado)}
                      <span className="text-sm text-gray-500">
                        {sol.solicitanteDadorNombre} → solicita de {sol.dadorActualNombre}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(sol.createdAt).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                  {sol.motivoRechazo && (
                    <p className="mt-2 text-sm text-red-600">
                      Motivo rechazo: {sol.motivoRechazo}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal de rechazo */}
      {solicitudRechazar !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Rechazar Solicitud #{solicitudRechazar}</h3>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
              className="w-full border rounded-lg p-3 h-32 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSolicitudRechazar(null);
                  setMotivoRechazo('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRechazar}
                disabled={rechazando || motivoRechazo.length < 10}
                className="bg-red-600 hover:bg-red-700"
              >
                {rechazando ? '...' : 'Confirmar Rechazo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferenciasPage;
