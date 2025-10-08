import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../store/store';

type Unit = 'days' | 'weeks' | 'months';

const NotificationsConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/notifications`;
  const token = useSelector((s: RootState) => s.auth?.token);
  const empresaId = useSelector((s: RootState) => s.auth?.user?.empresaId);
  const headers: HeadersInit = useMemo(() => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    'Content-Type': 'application/json',
  }), [token, empresaId]);

  const [enabled, setEnabled] = useState(true);
  const [windows, setWindows] = useState<any>({ aviso: { enabled: true, unit: 'days', value: 30 }, alerta: { enabled: true, unit: 'days', value: 14 }, alarma: { enabled: true, unit: 'days', value: 3 } });
  const [templates, setTemplates] = useState<any>({
    aviso: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
    alerta:{ chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
    alarma:{ chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
  });
  const [msisdn, setMsisdn] = useState('');
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(()=>{
    (async ()=>{
      const res = await fetch(baseUrl, { headers });
      const data = await res.json();
      if (data?.data) {
        setEnabled(Boolean(data.data.enabled));
        if (data.data.windows) setWindows(data.data.windows);
        if (data.data.templates) setTemplates(data.data.templates);
      }
    })();
  },[baseUrl, headers]);

  const save = async ()=>{
    setStatus(null);
    await fetch(baseUrl, { method:'PUT', headers, body: JSON.stringify({ enabled, windows, templates }) });
    setStatus('Guardado');
  };

  const test = async ()=>{
    setStatus(null);
    const res = await fetch(`${baseUrl}/test`, { method:'POST', headers, body: JSON.stringify({ msisdn, text: msg || 'Prueba notificaciones' }) });
    setStatus(res.ok ? 'Enviado' : 'Error');
  };

  const units: Unit[] = ['days','weeks','months'];

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-4'>
        <Button variant='outline' size='sm' onClick={() => navigate('/documentos')} className='flex items-center'>
          <span className='mr-2'>←</span>
          Volver
        </Button>
        <h1 className='text-2xl font-bold'>Configuración de Notificaciones</h1>
      </div>
      <Card className='p-6 max-w-4xl bg-card'>
        <div className='mb-4'>
          <label className='mr-2'>Sistema de notificaciones</label>
          <input type='checkbox' checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
        </div>

        {(['aviso','alerta','alarma'] as const).map((k)=> (
          <div key={k} className='border rounded p-4 mb-4'>
            <div className='flex items-center gap-3 mb-3'>
              <span className='font-semibold capitalize'>{k}</span>
              <label className='flex items-center gap-2'>
                <input type='checkbox' checked={windows[k].enabled} onChange={(e)=> setWindows((w:any)=> ({...w, [k]: {...w[k], enabled: e.target.checked}}))} /> Habilitado
              </label>
              <select value={windows[k].unit} onChange={(e)=> setWindows((w:any)=> ({...w, [k]: {...w[k], unit: e.target.value}}))} className='border rounded px-2 h-9 bg-background text-foreground'>
                {units.map(u=> <option key={u} value={u}>{u}</option>)}
              </select>
              <Input value={windows[k].value} onChange={(e)=> setWindows((w:any)=> ({...w, [k]: {...w[k], value: Number(e.target.value||0)}}))} className='w-24' />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {(['chofer','dador'] as const).map((aud)=> (
                <div key={aud} className='border rounded p-3'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='font-medium capitalize'>{aud}</span>
                    <label className='flex items-center gap-2'>
                      <input type='checkbox' checked={templates[k][aud].enabled} onChange={(e)=> setTemplates((t:any)=> ({...t, [k]: {...t[k], [aud]: {...t[k][aud], enabled: e.target.checked}}}))} /> Enviar
                    </label>
                  </div>
                  <textarea className='w-full border rounded p-2 h-24 bg-background text-foreground' value={templates[k][aud].text} onChange={(e)=> setTemplates((t:any)=> ({...t, [k]: {...t[k], [aud]: {...t[k][aud], text: e.target.value}}}))} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className='flex gap-2 items-center mt-4'>
          <Button onClick={save}>Guardar</Button>
          <Input placeholder='MSISDN (+549...)' value={msisdn} onChange={(e)=>setMsisdn(e.target.value)} className='w-64' />
          <Input placeholder='Mensaje de prueba' value={msg} onChange={(e)=>setMsg(e.target.value)} />
          <Button variant='outline' onClick={test}>Probar envío</Button>
          {status && <span className='text-sm text-muted-foreground ml-2'>{status}</span>}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsConfigPage;


