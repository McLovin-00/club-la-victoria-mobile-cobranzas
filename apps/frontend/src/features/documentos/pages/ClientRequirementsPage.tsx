import React, { useMemo, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { BasicSelect as Select } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAddClientRequirementMutation, useGetClientRequirementsQuery, useGetTemplatesQuery, useRemoveClientRequirementMutation, useGetClientsQuery } from '../api/documentosApiSlice';

export const ClientRequirementsPage: React.FC = () => {
  const { clienteId } = useParams();
  const id = Number(clienteId);
  const navigate = useNavigate();
  const { data: clientesResp } = useGetClientsQuery({});
  const clientes = clientesResp?.list ?? (Array.isArray(clientesResp) ? clientesResp : []);
  const { data: reqs = [], refetch } = useGetClientRequirementsQuery({ clienteId: id }, { skip: !id });
  const { data: templates = [] } = useGetTemplatesQuery();
  const [addReq] = useAddClientRequirementMutation();
  const [removeReq] = useRemoveClientRequirementMutation();

  // Filtrar plantillas ya seleccionadas para no ofrecer duplicadas
  const tplByEntity = useMemo(() => {
    const selectedByEntity = reqs.reduce<Record<string, Set<number>>>((acc, r) => {
      acc[r.entityType] = acc[r.entityType] || new Set<number>();
      acc[r.entityType].add(r.templateId);
      return acc;
    }, {} as Record<string, Set<number>>);
    const filterOutSelected = (entity: 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO') =>
      templates
        .filter(t => (t.entityType === entity))
        .filter(t => !selectedByEntity[entity]?.has(t.id));
    return {
      EMPRESA_TRANSPORTISTA: filterOutSelected('EMPRESA_TRANSPORTISTA'),
      CHOFER: filterOutSelected('CHOFER'),
      CAMION: filterOutSelected('CAMION'),
      ACOPLADO: filterOutSelected('ACOPLADO'),
    };
  }, [templates, reqs]);

  const [entity, setEntity] = useState<'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO'>('EMPRESA_TRANSPORTISTA');
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-4'>
        <Button variant='outline' size='sm' onClick={() => navigate('/documentos/clientes')} className='flex items-center'>
          <ArrowLeftIcon className='h-4 w-4 mr-2' />
          Volver
        </Button>
        <h1 className='text-2xl font-bold'>Requisitos por Cliente</h1>
      </div>

      <Card className='p-4 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3 items-end'>
          <div className='flex flex-col'>
            <Label>Cliente</Label>
            <Select value={String(id)} onChange={(e) => navigate(`/documentos/clientes/${Number(e.target.value)}/requirements`)}>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.razonSocial}</option>
              ))}
            </Select>
          </div>
          <div className='flex flex-col'>
            <Label>Entidad</Label>
            <Select value={entity} onChange={(e) => { const val = e.target.value as 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO'; setEntity(val); setTemplateId(tplByEntity[val][0]?.id); }}>
              <option value='EMPRESA_TRANSPORTISTA'>Empresa Transportista</option>
              <option value='CHOFER'>Chofer</option>
              <option value='CAMION'>Camión</option>
              <option value='ACOPLADO'>Acoplado</option>
            </Select>
          </div>
          <div className='flex flex-col'>
            <Label>Documento requerido</Label>
            <Select value={templateId ?? ''} onChange={(e) => setTemplateId(Number(e.target.value))}>
              <option value='' disabled>Selecciona una plantilla</option>
              {tplByEntity[entity].map((t) => <option key={t.id} value={t.id}>{(t as any).nombre ?? (t as any).name}</option>)}
            </Select>
          </div>
          <div>
            <Button className='w-full' disabled={!templateId} onClick={async () => { if (!templateId) return; await addReq({ clienteId: id, templateId, entityType: entity }); setTemplateId(undefined); refetch(); }}>Agregar</Button>
          </div>
        </div>
      </Card>

      <Card className='p-4'>
        <div className='grid gap-2'>
          {reqs.map(r => (
            <div key={r.id} className='flex items-center justify-between'>
              <div>
                <span className='font-medium'>{r.template.name}</span>
                <span className='text-sm text-muted-foreground ml-2'>({r.entityType === 'EMPRESA_TRANSPORTISTA' ? 'Empresa Transportista' : r.entityType === 'ACOPLADO' ? 'Acoplado' : r.entityType === 'CAMION' ? 'Camión' : 'Chofer'})</span>
              </div>
              <Button variant='destructive' onClick={() => removeReq({ clienteId: id, requirementId: r.id })}>Quitar</Button>
            </div>
          ))}
          {reqs.length === 0 && <div className='text-sm text-muted-foreground'>Sin requisitos configurados</div>}
        </div>
      </Card>
    </div>
  );
};

export default ClientRequirementsPage;


