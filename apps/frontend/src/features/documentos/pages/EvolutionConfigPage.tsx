import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

const EvolutionConfigPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const [server, setServer] = useState('');
  const [token, setToken] = useState('');
  const [instance, setInstance] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/evolution`;
  const authToken = useSelector((s: RootState) => s.auth?.token);
  const empresaId = useSelector((s: RootState) => s.auth?.user?.empresaId);

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  }), [authToken, empresaId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}`, { headers: authHeaders });
        const data = await res.json();
        setServer(data?.data?.server || '');
        setToken(data?.data?.token || '');
        setInstance(data?.data?.instance || '');
      } catch {
        setMessage('No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [baseUrl, authHeaders]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await fetch(`${baseUrl}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ server, token, instance }),
      });
      setMessage('Configuración guardada');
    } catch {
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}/test`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      setMessage(data?.message || (data?.success ? 'OK' : 'Error'));
    } catch {
      setMessage('Error al probar conexión');
    }
  };

  if (loading) return <div className='p-6'>Cargando...</div>;

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-4'>
        <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
          <span className='mr-2'>←</span>
          Volver
        </Button>
        <h1 className='text-2xl font-bold'>Configuración Evolution API</h1>
      </div>
      <Card className='p-6 max-w-2xl'>
        <div className='grid gap-4'>
          <div>
            <label className='block text-sm mb-1'>Servidor</label>
            <Input placeholder='https://evolution.example.com' value={server} onChange={(e)=>setServer(e.target.value)} />
          </div>
          <div>
            <label className='block text-sm mb-1'>Token</label>
            <Input placeholder='token' value={token} onChange={(e)=>setToken(e.target.value)} />
          </div>
          <div>
            <label className='block text-sm mb-1'>Instancia</label>
            <Input placeholder='instancia' value={instance} onChange={(e)=>setInstance(e.target.value)} />
          </div>
          <div className='flex gap-2'>
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            <Button variant='outline' onClick={test}>Probar conexión</Button>
          </div>
          {message && <div className='text-sm text-muted-foreground'>{message}</div>}
        </div>
      </Card>
    </div>
  );
};

export default EvolutionConfigPage;


