import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { useGetTemplatesQuery, useUploadDocumentMutation, useGetEquipoComplianceQuery } from '../../documentos/api/documentosApiSlice';

type EntityType = 'CHOFER' | 'CAMION' | 'ACOPLADO';

const CargaDocumentosPage: React.FC = () => {
  const navigate = useNavigate();
  const empresaId = useAppSelector((s) => (s as any).auth?.user?.empresaId) as number | undefined;
  const role = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const location = useLocation();
  const equipoIdParam = useMemo(() => {
    try { return new URLSearchParams(location.search).get('equipoId'); } catch { return null; }
  }, [location.search]);
  const templateIdParam = useMemo(() => {
    try { return new URLSearchParams(location.search).get('templateId'); } catch { return null; }
  }, [location.search]);
  const equipoIdNum = useMemo(()=> {
    const v = equipoIdParam ? parseInt(equipoIdParam, 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : undefined;
  }, [equipoIdParam]);
  const { data: templatesResp } = useGetTemplatesQuery(undefined);
  const templates = useMemo(
    () => ((templatesResp?.data ?? []) as Array<{ id: number; name: string; entityType: EntityType }>),
    [templatesResp]
  );
  const [uploadDocument, { isLoading }] = useUploadDocumentMutation();
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);

  // Modo de carga
  const [mode, setMode] = useState<'initial' | 'renewal'>('initial');

  const [templateId, setTemplateId] = useState<number | ''>(() => {
    const q = templateIdParam ? parseInt(templateIdParam, 10) : NaN;
    return Number.isFinite(q) && q > 0 ? q : '';
  });
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
  const [entityId, setEntityId] = useState<string>('');
  // Si llegamos desde el semáforo, intentar prellenar entityId usando compliance
  const { data: complianceData } = useGetEquipoComplianceQuery({ id: equipoIdNum as number }, { skip: !equipoIdNum });
  useEffect(() => {
    if (!equipoIdNum || !selectedTemplate || entityId) return;
    try {
      const docsByEntity: Record<string, any[]> = (complianceData?.documents || {}) as any;
      const list = docsByEntity[selectedTemplate.entityType] || [];
      const match = (list as any[]).find((d) => Number(d.templateId) === Number(selectedTemplate.id));
      if (match && match.entityId) {
        setEntityId(String(match.entityId));
        return;
      }
      // Fallback: mapear desde los IDs del equipo (cuando no hay documentos previos)
      const equipo: any = (complianceData as any)?.equipo;
      if (equipo) {
        if (selectedTemplate.entityType === 'EMPRESA_TRANSPORTISTA' && equipo.empresaTransportistaId) {
          setEntityId(String(equipo.empresaTransportistaId));
          return;
        }
        if (selectedTemplate.entityType === 'CHOFER' && equipo.driverId) {
          setEntityId(String(equipo.driverId));
          return;
        }
        if (selectedTemplate.entityType === 'CAMION' && equipo.truckId) {
          setEntityId(String(equipo.truckId));
          return;
        }
        if (selectedTemplate.entityType === 'ACOPLADO' && equipo.trailerId) {
          setEntityId(String(equipo.trailerId));
          return;
        }
      }
    } catch { /* noop */ }
  }, [equipoIdNum, complianceData, selectedTemplate, entityId]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canUpload = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'OPERATOR' || role === 'DADOR_DE_CARGA' || role === 'TRANSPORTISTA';

  // Campos “planilla” (alta inicial)
  const [empresaTransportista, setEmpresaTransportista] = useState('');
  const [cuitTransportista, setCuitTransportista] = useState('');
  const [choferNombre, setChoferNombre] = useState('');
  const [choferApellido, setChoferApellido] = useState('');
  const [choferDni, setChoferDni] = useState('');
  const [tractorPatente, setTractorPatente] = useState('');
  const [semiPatente, setSemiPatente] = useState('');

  const planillaCompleta = useMemo(() => {
    if (mode !== 'initial') return true;
    return (
      empresaTransportista.trim().length > 1 &&
      /^\d{11}$/.test(cuitTransportista) &&
      choferDni.trim().length >= 6 &&
      tractorPatente.trim().length >= 5 &&
      choferNombre.trim().length >= 1 &&
      choferApellido.trim().length >= 1
    );
  }, [mode, empresaTransportista, cuitTransportista, choferDni, tractorPatente, choferNombre, choferApellido]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!canUpload) {
      setMessage({ type: 'error', text: 'No tiene permisos para subir documentación.' });
      return;
    }
    if (!empresaId) {
      setMessage({ type: 'error', text: 'No se detectó la empresa del usuario.' });
      return;
    }
    if (!templateId || !selectedTemplate) {
      setMessage({ type: 'error', text: 'Seleccione una plantilla.' });
      return;
    }
    if (!entityId || !/^\d+$/.test(entityId)) {
      setMessage({ type: 'error', text: 'Ingrese un identificador numérico válido.' });
      return;
    }
    if (mode === 'initial' && !planillaCompleta) {
      setMessage({ type: 'error', text: 'Complete todos los campos de la planilla para alta inicial.' });
      return;
    }
    const files = fileRef.current?.files;
    if (!files || files.length === 0) {
      setMessage({ type: 'error', text: 'Seleccione un archivo.' });
      return;
    }
    try {
      // Multi-archivo: subir en serie con barra de progreso consolidada
      const list = Array.from(files);
      setBatchTotal(list.length);
      setBatchDone(0);
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const form = new FormData();
        form.append('templateId', String(templateId));
        form.append('entityType', selectedTemplate.entityType);
        form.append('entityId', entityId);
        form.append('dadorCargaId', String(empresaId));
        form.append('mode', mode);
        if (mode === 'initial') {
          const planilla = {
            empresaTransportista,
            cuitTransportista,
            choferNombre,
            choferApellido,
            choferDni,
            tractorPatente,
            semiPatente: semiPatente || undefined,
          };
          form.append('planilla', JSON.stringify(planilla));
        }
        form.append('document', f);
        await uploadDocument(form).unwrap();
        setBatchDone((d) => d + 1);
      }
      setMessage({ type: 'success', text: list.length > 1 ? 'Archivos subidos correctamente.' : 'Documento subido correctamente.' });
      // Reset parcial
      setTemplateId('');
      setEntityId('');
      if (fileRef.current) fileRef.current.value = '';
      if (mode === 'initial') {
        setEmpresaTransportista(''); setCuitTransportista('');
        setChoferNombre(''); setChoferApellido(''); setChoferDni('');
        setTractorPatente(''); setSemiPatente('');
      }
    } catch (err: any) {
      const code = err?.data?.code;
      const msg = err?.data?.message || 'Error al subir documento';
      // Si el backend requiere confirmación de nueva versión, preguntar y reintentar
      if (code === 'CONFIRM_NEW_VERSION_REQUIRED') {
        const ok = window.confirm('El documento anterior no está vencido. ¿Confirmás que querés cargar una nueva versión?');
        if (ok) {
          try {
            const form = new FormData();
            form.append('templateId', String(templateId));
            form.append('entityType', selectedTemplate.entityType);
            form.append('entityId', entityId);
            form.append('dadorCargaId', String(empresaId));
            form.append('confirmNewVersion', 'true');
            form.append('document', (fileRef.current!.files as FileList)[0]);
            await uploadDocument(form).unwrap();
            setMessage({ type: 'success', text: 'Nueva versión subida correctamente.' });
            setTemplateId('');
            setEntityId('');
            if (fileRef.current) fileRef.current.value = '';
            return;
          } catch (e2: any) {
            const t2 = e2?.data?.message || 'Error al subir nueva versión';
            setMessage({ type: 'error', text: t2 });
            return;
          }
        } else {
          setMessage({ type: 'error', text: 'Operación cancelada por el usuario.' });
          return;
        }
      }
      setMessage({ type: 'error', text: msg });
    }
  };

  const entityHint =
    selectedTemplate?.entityType === 'CHOFER'
      ? 'DNI del chofer (solo números)'
      : selectedTemplate?.entityType === 'CAMION'
      ? 'ID interno del camión (numérico)'
      : selectedTemplate?.entityType === 'ACOPLADO'
      ? 'ID interno del acoplado (numérico)'
      : 'ID de la entidad (numérico)';

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Carga de Documentación</h1>
        <button className='border rounded px-3 py-1 text-sm' onClick={() => navigate(-1)}>Volver</button>
      </div>
      {equipoIdParam && (
        <div className='mb-3 p-3 border rounded text-sm bg-blue-50'>
          Renovación de documentación para equipo #{equipoIdParam}. Seleccioná el documento vencido y subilo.
        </div>
      )}

      {!canUpload && (
        <div className='mb-4 p-3 border rounded text-sm bg-yellow-50'>
          Su rol no permite subir documentación desde este portal.
        </div>
      )}

      <form onSubmit={onSubmit} className='max-w-3xl space-y-4' aria-live='polite'>
        <div className='flex gap-4 items-center'>
          <label className='flex items-center gap-2 text-sm'>
            <input type='radio' name='mode' checked={mode==='initial'} onChange={()=> setMode('initial')} />
            Alta inicial (requiere planilla completa)
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <input type='radio' name='mode' checked={mode==='renewal'} onChange={()=> setMode('renewal')} />
            Renovación (solo documentos vencidos)
          </label>
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='tpl' className='text-sm text-muted-foreground'>Plantilla</label>
          <select
            id='tpl'
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value ? parseInt(e.target.value, 10) : '')}
            className='border rounded px-2 py-1 text-sm'
          >
            <option value=''>Seleccione plantilla</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.entityType})</option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-1'>
          <label htmlFor='entityId' className='text-sm text-muted-foreground'>
            Identificador de entidad {selectedTemplate ? `(${selectedTemplate.entityType})` : ''}
          </label>
          <input
            id='entityId'
            value={entityId}
            onChange={(e) => setEntityId(e.target.value.replace(/\D+/g, ''))}
            placeholder={entityHint}
            className='border rounded px-2 py-1 text-sm'
          />
          <p className='text-xs text-muted-foreground'>{entityHint}</p>
        </div>

        {mode === 'initial' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-3'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Empresa transportista</label>
              <input className='border rounded px-2 py-1 text-sm' value={empresaTransportista} onChange={(e)=> setEmpresaTransportista(e.target.value)} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>CUIT (11 dígitos)</label>
              <input className='border rounded px-2 py-1 text-sm' value={cuitTransportista} onChange={(e)=> setCuitTransportista(e.target.value.replace(/\D+/g,''))} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Chofer - Nombre</label>
              <input className='border rounded px-2 py-1 text-sm' value={choferNombre} onChange={(e)=> setChoferNombre(e.target.value)} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Chofer - Apellido</label>
              <input className='border rounded px-2 py-1 text-sm' value={choferApellido} onChange={(e)=> setChoferApellido(e.target.value)} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Chofer - DNI</label>
              <input className='border rounded px-2 py-1 text-sm' value={choferDni} onChange={(e)=> setChoferDni(e.target.value.replace(/\D+/g,''))} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Tractor - Patente</label>
              <input className='border rounded px-2 py-1 text-sm' value={tractorPatente} onChange={(e)=> setTractorPatente(e.target.value.toUpperCase())} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Semi - Patente (opcional)</label>
              <input className='border rounded px-2 py-1 text-sm' value={semiPatente} onChange={(e)=> setSemiPatente(e.target.value.toUpperCase())} />
            </div>
            {!planillaCompleta && (
              <div className='md:col-span-2 text-xs text-red-600'>
                Complete todos los campos requeridos: empresa, CUIT, nombre y apellido de chofer, DNI y patente de tractor.
              </div>
            )}
          </div>
        )}

        <div className='flex flex-col gap-1'>
          <label htmlFor='file' className='text-sm text-muted-foreground'>Archivo(s) (PDF o imagen)</label>
          <input id='file' type='file' ref={fileRef} accept='application/pdf,image/*' multiple className='text-sm' />
          {batchTotal > 0 && (
            <div className='text-xs text-muted-foreground mt-1' aria-live='polite'>
              Progreso: {batchDone}/{batchTotal} ({Math.round((batchDone / batchTotal) * 100)}%)
              <div className='w-full h-2 bg-gray-200 rounded mt-1'>
                <div
                  className='h-2 bg-blue-500 rounded'
                  style={{ width: `${Math.round((batchDone / Math.max(1, batchTotal)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type='submit'
          className='border rounded px-3 py-1 text-sm disabled:opacity-50'
          disabled={!canUpload || isLoading || (mode==='initial' && !planillaCompleta)}
        >
          {isLoading ? 'Subiendo…' : 'Subir documento'}
        </button>

        {message && (
          <div className={`text-sm mt-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
};

export default CargaDocumentosPage;


