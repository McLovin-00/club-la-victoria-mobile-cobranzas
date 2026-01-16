import { useMemo, useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useApprovePendingDocumentMutation, useGetApprovalPendingByIdQuery, useRejectPendingDocumentMutation, useRecheckDocumentWithAIMutation, useGetTemplatesQuery } from '@/features/documentos/api/documentosApiSlice';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { formatDateTime } from '../../../utils/formatters';
import type { ApprovalPendingDocument, EntityType } from '../types/entities';
import { useAppSelector } from '../../../store/hooks';
import { ArrowPathIcon, ExclamationTriangleIcon, InformationCircleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useRoleBasedNavigation();
  const docId = Number(id);
  const { data, isFetching, error, refetch } = useGetApprovalPendingByIdQuery({ id: docId }, { skip: !docId });
  const [approve, { isLoading: approving }] = useApprovePendingDocumentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPendingDocumentMutation();
  const [recheckWithAI, { isLoading: rechecking }] = useRecheckDocumentWithAIMutation();
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const canRecheck = userRole === 'SUPERADMIN' || userRole === 'ADMIN_INTERNO' || userRole === 'DADOR_DE_CARGA';

  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [entityId, setEntityId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const location = useLocation();

  // Helpers de formato de fecha
  const toYmd = (dmy: string): string => {
    const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  };
  const toDmy = (ymd: string): string => {
    if (!ymd) return '';
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const [_, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  };

  // Campo controlado para edición en formato dd/mm/aaaa
  const [expiresRaw, setExpiresRaw] = useState<string>('');

  // Si venimos desde la lista con ?expiresAt= preseleccionado, usarlo por defecto
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const exp = params.get('expiresAt');
    if (exp) { setExpiresAt(exp); setExpiresRaw(toDmy(exp)); }
  }, [location.search]);

  const info = useMemo<ApprovalPendingDocument | undefined>(() => data as ApprovalPendingDocument | undefined, [data]);
  const { data: templatesAll } = useGetTemplatesQuery();

  const normalizeLabel = (s?: string): string =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  // Si el documento deja de estar pendiente (404) tras aprobar, redirigir silenciosamente a la lista
  useEffect(() => {
    const status = (error as any)?.status;
    if (status === 404) {
      navigate('/documentos/aprobacion');
    }
  }, [error, navigate]);

  const previewUrl: string | undefined = (info as any)?.previewUrl || (info as any)?.data?.previewUrl;
  const effectivePreviewUrl: string | undefined = previewUrl || (docId ? `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/documents/${docId}/download?inline=1` : undefined);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Descargar el archivo con Authorization y mostrar como blob (evita 401/CORS/iframes)
  useEffect(() => {
    let cancelled = false;
    // Limpiar blob anterior
    if (previewBlobUrl && previewBlobUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(previewBlobUrl); } catch (e) { /* noop */ }
    }
    setPreviewBlobUrl(null);
    setPreviewError(null);

    if (!effectivePreviewUrl) return;
    setLoadingPreview(true);

    (async () => {
      let lastError: Error | null = null;
      
      // Reintentar hasta 3 veces con backoff exponencial
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (cancelled) return;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout por intento
          
        const resp = await fetch(effectivePreviewUrl, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            signal: controller.signal,
        });
          
          clearTimeout(timeoutId);
          
        if (!resp.ok) {
            // Si es 429 (rate limit), esperar más tiempo antes de reintentar
            if (resp.status === 429 && attempt < 3) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
          let msg = `Error ${resp.status}: ${resp.statusText}`;
          try { const t = await resp.text(); if (t) msg = t; } catch (e) { /* noop */ }
          throw new Error(msg);
        }
          
        const blob = await resp.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
          return; // Éxito, salir
          
      } catch (e: any) {
          lastError = e;
          
          // Si es abort o timeout, reintentar
          if (e.name === 'AbortError' && attempt < 3) {
            const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Para otros errores de red, reintentar con backoff
          if (attempt < 3 && (e.message?.includes('fetch') || e.message?.includes('network'))) {
            const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Si es el último intento o error no recuperable, lanzar
          if (attempt === 3) {
            throw lastError;
          }
        }
      }
      
      // Si llegamos aquí, falló después de todos los intentos
      if (lastError && !cancelled) {
        throw lastError;
      }
      
    })().catch((e: any) => {
      if (!cancelled) setPreviewError(e?.message || 'Error al cargar preview después de 3 intentos');
    }).finally(() => {
        if (!cancelled) setLoadingPreview(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePreviewUrl]); // previewBlobUrl omitido intencionalmente para evitar loop infinito
  const classification = info?.classification || (info as any)?.data?.classification;
  const meta = (info as any)?.data ?? info;

  // Bandera para indicar si ya se pre-llenaron los campos (solo una vez por documento)
  const [prefilled, setPrefilled] = useState<number | null>(null);

  // Prefill entity, template and expiration from DOCUMENT DATA FIRST, then classification as fallback
  // Se ejecuta UNA SOLA VEZ cuando los datos del documento están disponibles
  useEffect(() => {
    if (!meta || !meta.id) return;
    // Solo pre-llenar una vez por documento
    if (prefilled === meta.id) return;
    
    // Marcar como pre-llenado para este documento
    setPrefilled(meta.id);
    
    // 1. Pre-llenar entityType: primero del documento, luego de clasificación
    const docEntityType = (meta as any)?.entityType || (meta as any)?.entity_type;
    const classEntityType = (classification as any)?.detectedEntityType;
    if (docEntityType) {
      setEntityType(docEntityType);
    } else if (classEntityType) {
      setEntityType(classEntityType);
    }
    
    // 2. Pre-llenar entityId: usar el identificador natural (CUIT/DNI/Patente), NO el ID interno
    // Prioridad: entityNaturalId > detectedEntityId > entityId (fallback)
    const entityNaturalId = (meta as any)?.entityNaturalId; // CUIT, DNI o Patente del backend
    const classEntityId = (classification as any)?.detectedEntityId;
    const docEntityId = (meta as any)?.entityId || (meta as any)?.entity_id; // ID interno (fallback)
    
    if (entityNaturalId) {
      setEntityId(String(entityNaturalId));
    } else if (classEntityId) {
      setEntityId(String(classEntityId));
    } else if (docEntityId) {
      setEntityId(String(docEntityId));
    }
    
    // 3. Pre-llenar templateId: primero del documento/template, luego por nombre detectado
    const existingTemplateId: number | undefined = 
      (meta as any)?.templateId || (meta as any)?.template_id || (meta as any)?.template?.id;
    const existingTemplateName: string | undefined = 
      ((meta as any)?.template?.name || (meta as any)?.template?.nombre) as any;
    
    // Intentar primero con el templateId existente del documento
    if (existingTemplateId && String(existingTemplateName || '').toUpperCase() !== 'AUTO') {
      setTemplateId(existingTemplateId);
    } 
    // Si no hay o es AUTO, intentar mapear por tipo detectado
    else if ((classification as any)?.detectedDocumentType && Array.isArray(templatesAll)) {
      const detected = normalizeLabel((classification as any).detectedDocumentType);
      const t = templatesAll.find((tpl: any) => {
        const nm = normalizeLabel((tpl.name ?? tpl.nombre) as any);
        return nm === detected;
      });
      if (t) {
        setTemplateId(Number(t.id));
      }
    }
    
    // 4. Pre-llenar expiresAt: primero del documento, luego de clasificación
    const docExpiresAt = (meta as any)?.expiresAt || (meta as any)?.expires_at;
    const classExpiration = (classification as any)?.detectedExpiration;
    const isoDate = docExpiresAt || classExpiration;
    
    if (isoDate) {
      try {
        const d = new Date(String(isoDate));
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const ymd = `${yyyy}-${mm}-${dd}`;
          setExpiresAt(ymd);
          setExpiresRaw(toDmy(ymd));
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [meta, classification, templatesAll, prefilled]);

  // Requiere elegir plantilla si está en AUTO o no hay tipo detectado
  const mustChooseTemplate = useMemo(() => {
    const tplName: string | undefined = ((meta as any)?.template?.name || (meta as any)?.template?.nombre) as any;
    const isAuto = String(tplName || '').toUpperCase() === 'AUTO';
    const hasDetectedType = Boolean((classification as any)?.detectedDocumentType);
    return isAuto || !hasDetectedType;
  }, [meta, classification]);

  const onApprove = async () => {
    if (!entityType || !entityId || !templateId || !expiresAt) return;
    await approve({ id: docId, confirmedEntityType: entityType, confirmedEntityId: entityId, expiresAt, reviewNotes: reviewNotes || undefined, templateId: Number(templateId) });
    navigate('/documentos/aprobacion');
  };
  const onReject = async () => {
    await reject({ id: docId, reason: rejectReason || '', reviewNotes: reviewNotes || undefined });
    navigate('/documentos/aprobacion');
  };
  const onRecheck = async () => {
    try {
      await recheckWithAI({ id: docId }).unwrap();
      // Refrescar después de 2 segundos para dar tiempo al proceso
      setTimeout(() => refetch(), 2000);
    } catch (e) {
      console.error('Error rechecking document:', e);
    }
  };
  
  // Disparidades del documento
  const disparidades = useMemo(() => {
    const clf = classification || (info as any)?.data?.classification;
    return (clf as any)?.disparidades || [];
  }, [classification, info]);
  
  const tieneDisparidades = disparidades.length > 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={goBack} 
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-all duration-200"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Revisión de Documento #{docId}</h1>
            <p className="text-muted-foreground">Verificá la clasificación y confirmá los datos antes de aprobar.</p>
          </div>
        </div>
        {canRecheck && (
          <button
            onClick={onRecheck}
            disabled={rechecking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rechequear con IA"
          >
            <ArrowPathIcon className={`h-5 w-5 ${rechecking ? 'animate-spin' : ''}`} />
            {rechecking ? 'Rechecando...' : 'Rechequear con IA'}
          </button>
        )}
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 text-sm text-muted-foreground">Vista previa</div>
            {loadingPreview && (
              <div className="h-40 grid place-items-center text-muted-foreground">Cargando preview...</div>
            )}
            {previewError && !loadingPreview && (
              <div className="h-40 grid place-items-center text-red-600">{previewError}</div>
            )}
            {previewBlobUrl && !loadingPreview && !previewError ? (
              <iframe src={`${previewBlobUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1`} className="w-full h-[70vh] rounded-md border" title="preview" />
            ) : (!loadingPreview && !previewError) ? (
              <div className="h-40 grid place-items-center text-muted-foreground">Sin preview disponible</div>
            ) : null}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <Field label="Entidad detectada" value={classification?.detectedEntityType ?? meta?.entityType ?? '-'} />
            <Field label="Identidad detectada" value={meta?.entityNaturalId ?? classification?.detectedEntityId ?? '-'} />
            <Field label="Tipo documento detectado" value={classification?.detectedDocumentType ?? meta?.template?.name ?? meta?.template?.nombre ?? '-'} />
            <Field label="Subido" value={meta?.uploadedAt ? formatDateTime(meta.uploadedAt) : '-'} />
            <Field 
              label="Vencimiento detectado" 
              value={(() => {
                const dateStr = (classification as any)?.detectedExpiration || meta?.expiresAt || (meta as any)?.expires_at;
                if (!dateStr) return '-';
                try { 
                  const d = new Date(String(dateStr)); 
                  if (isNaN(d.getTime())) return '-'; 
                  const yyyy = d.getFullYear(); 
                  const mm = String(d.getMonth()+1).padStart(2,'0'); 
                  const dd = String(d.getDate()).padStart(2,'0'); 
                  return `${dd}/${mm}/${yyyy}`; 
                } catch { return '-'; } 
              })()} 
            />

            {/* Panel de disparidades */}
            {tieneDisparidades && (
              <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2 mb-2 text-amber-800 font-medium">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Disparidades detectadas
                </div>
                <div className="space-y-2">
                  {disparidades.map((d: any, i: number) => (
                    <DisparidadItem key={i} disparidad={d} />
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t" />

            <div className="space-y-2">
              <label className="text-sm font-medium">Entidad</label>
              <select className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="EMPRESA_TRANSPORTISTA">Empresa Transportista</option>
                <option value="CHOFER">Chofer</option>
                <option value="CAMION">Camión</option>
                <option value="ACOPLADO">Acoplado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Identidad (ID)</label>
              <input className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Ej: 123" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de documento</label>
              <select
                className="input input-bordered py-2 px-3 rounded-md bg-background border w-full"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccionar</option>
                {Array.isArray(templatesAll) && (entityType ? templatesAll.filter((t: any) => (t.entityType || t.tipo || t.type) === entityType) : templatesAll)
                  .map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name ?? t.nombre}</option>
                  ))}
              </select>
              {mustChooseTemplate && !templateId && (
                <div className="text-xs text-red-600">Seleccioná el tipo de documento para continuar.</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vencimiento</label>
              <input
                type="date"
                className="input input-bordered py-2 px-3 rounded-md bg-background border w-full"
                value={expiresAt}
                onChange={(e) => {
                  const v = e.target.value; // formato yyyy-mm-dd
                  setExpiresAt(v);
                  setExpiresRaw(toDmy(v));
                }}
              />
              {expiresRaw && <span className="text-xs text-muted-foreground">{expiresRaw}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <textarea className="input input-bordered py-2 px-3 rounded-md bg-background border w-full min-h-[80px]" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
            </div>

            <div className="pt-2 border-t" />

            <div className="flex items-center gap-2">
              <button 
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                onClick={onApprove} 
                disabled={approving || !entityType || !entityId || !templateId || !expiresAt}
              >
                {approving ? 'Aprobando...' : 'Aprobar'}
              </button>
              <button 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                onClick={onReject} 
                disabled={rejecting}
              >
                {rejecting ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <select 
                className="input input-bordered py-2 px-3 rounded-md bg-background border flex-1"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              >
                <option value="">Seleccionar motivo de rechazo...</option>
                <option value="Documento ilegible">Documento ilegible</option>
                <option value="Documento vencido">Documento vencido</option>
                <option value="Datos incorrectos">Datos incorrectos</option>
                <option value="Documento incompleto">Documento incompleto</option>
                <option value="No corresponde al tipo solicitado">No corresponde al tipo solicitado</option>
                <option value="Firma o sello faltante">Firma o sello faltante</option>
              </select>
              <input 
                className="input input-bordered py-2 px-3 rounded-md bg-background border flex-1" 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="O escribir motivo personalizado..." 
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

interface Disparidad {
  campo: string;
  valorEnSistema: unknown;
  valorEnDocumento: unknown;
  severidad: 'critica' | 'advertencia' | 'info';
  mensaje: string;
}

function DisparidadItem({ disparidad }: { disparidad: Disparidad }) {
  const severidadConfig = {
    critica: {
      icon: ShieldExclamationIcon,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    advertencia: {
      icon: ExclamationTriangleIcon,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
    },
    info: {
      icon: InformationCircleIcon,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
    },
  };
  
  const config = severidadConfig[disparidad.severidad] || severidadConfig.info;
  const Icon = config.icon;
  
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };
  
  return (
    <div className={`p-2 rounded border ${config.border} ${config.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.badge}`}>
              {disparidad.severidad.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-gray-700">{disparidad.campo}</span>
          </div>
          <p className={`text-xs ${config.text}`}>{disparidad.mensaje}</p>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">En sistema:</span>
              <span className="ml-1 font-mono">{formatValue(disparidad.valorEnSistema)}</span>
            </div>
            <div>
              <span className="text-gray-500">En documento:</span>
              <span className="ml-1 font-mono">{formatValue(disparidad.valorEnDocumento)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


