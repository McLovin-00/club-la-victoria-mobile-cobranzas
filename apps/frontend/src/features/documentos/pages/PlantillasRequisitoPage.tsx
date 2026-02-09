import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { BasicSelect as Select } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  useGetClientsQuery,
  useGetPlantillasByClienteQuery,
  useGetPlantillaByIdQuery,
  useCreatePlantillaRequisitoMutation,
  useUpdatePlantillaRequisitoMutation,
  useDeletePlantillaRequisitoMutation,
  useDuplicatePlantillaRequisitoMutation,
  useGetTemplatesQuery,
  useAddPlantillaTemplateMutation,
  useRemovePlantillaTemplateMutation,
} from '../api/documentosApiSlice';

type EntityType = 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';

const ENTITY_LABELS: Record<EntityType, string> = {
  EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
  CHOFER: 'Chofer',
  CAMION: 'Camión',
  ACOPLADO: 'Acoplado',
};

export const PlantillasRequisitoPage: React.FC = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const selectedClienteId = clienteId ? Number(clienteId) : undefined;

  // Queries
  const { data: clientesResp } = useGetClientsQuery({});
  const clientes = clientesResp?.list ?? [];
  const { data: plantillas = [], refetch: refetchPlantillas } = useGetPlantillasByClienteQuery(
    { clienteId: selectedClienteId! },
    { skip: !selectedClienteId }
  );
  const { data: allTemplates = [] } = useGetTemplatesQuery();

  // Mutations
  const [createPlantilla] = useCreatePlantillaRequisitoMutation();
  const [updatePlantilla] = useUpdatePlantillaRequisitoMutation();
  const [deletePlantilla] = useDeletePlantillaRequisitoMutation();
  const [duplicatePlantilla] = useDuplicatePlantillaRequisitoMutation();
  const [addTemplate] = useAddPlantillaTemplateMutation();
  const [removeTemplate] = useRemovePlantillaTemplateMutation();

  // State
  const [expandedPlantilla, setExpandedPlantilla] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlantillaNombre, setNewPlantillaNombre] = useState('');
  const [newPlantillaDescripcion, setNewPlantillaDescripcion] = useState('');
  const [editingPlantilla, setEditingPlantilla] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');

  // Plantilla expandida query
  const { data: plantillaDetalle, refetch: refetchDetalle } = useGetPlantillaByIdQuery(
    { id: expandedPlantilla! },
    { skip: !expandedPlantilla }
  );

  // Templates disponibles para agregar (filtrar los ya agregados)
  const availableTemplates = useMemo(() => {
    if (!plantillaDetalle) return { EMPRESA_TRANSPORTISTA: [], CHOFER: [], CAMION: [], ACOPLADO: [] };
    const usedTemplateIds = new Set(plantillaDetalle.templates.map((t) => `${t.templateId}:${t.entityType}`));
    const result: Record<EntityType, typeof allTemplates> = {
      EMPRESA_TRANSPORTISTA: [],
      CHOFER: [],
      CAMION: [],
      ACOPLADO: [],
    };
    for (const t of allTemplates) {
      const key = `${t.id}:${t.entityType}`;
      if (!usedTemplateIds.has(key) && result[t.entityType as EntityType]) {
        result[t.entityType as EntityType].push(t);
      }
    }
    return result;
  }, [allTemplates, plantillaDetalle]);

  // State para agregar template
  const [addEntityType, setAddEntityType] = useState<EntityType>('CHOFER');
  const [addTemplateId, setAddTemplateId] = useState<number | undefined>();

  // Handlers
  const handleCreatePlantilla = async () => {
    if (!selectedClienteId || !newPlantillaNombre.trim()) return;
    await createPlantilla({
      clienteId: selectedClienteId,
      nombre: newPlantillaNombre.trim(),
      descripcion: newPlantillaDescripcion.trim() ?? undefined,
    });
    setNewPlantillaNombre('');
    setNewPlantillaDescripcion('');
    setShowCreateForm(false);
    refetchPlantillas();
  };

  const handleUpdatePlantilla = async (id: number) => {
    await updatePlantilla({
      id,
      nombre: editNombre.trim(),
      descripcion: editDescripcion.trim() ?? undefined,
    });
    setEditingPlantilla(null);
    refetchPlantillas();
  };

  const handleDeletePlantilla = async (id: number) => {
    if (!confirm('¿Eliminar esta plantilla? Se desasociará de todos los equipos.')) return;
    await deletePlantilla(id);
    if (expandedPlantilla === id) setExpandedPlantilla(null);
    refetchPlantillas();
  };

  const handleDuplicatePlantilla = async (id: number, nombre: string) => {
    const nuevoNombre = prompt('Nombre de la nueva plantilla:', `${nombre} (copia)`);
    if (!nuevoNombre?.trim()) return;
    await duplicatePlantilla({ id, nuevoNombre: nuevoNombre.trim() });
    refetchPlantillas();
  };

  const handleAddTemplate = async () => {
    if (!expandedPlantilla || !addTemplateId) return;
    await addTemplate({
      plantillaId: expandedPlantilla,
      templateId: addTemplateId,
      entityType: addEntityType,
    });
    setAddTemplateId(undefined);
    refetchDetalle();
  };

  const handleRemoveTemplate = async (templateConfigId: number) => {
    if (!expandedPlantilla) return;
    await removeTemplate({ plantillaId: expandedPlantilla, templateConfigId });
    refetchDetalle();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/documentos/clientes')} className="flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Plantillas de Requisitos</h1>
      </div>

      {/* Selector de Cliente */}
      <Card className="p-4 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Cliente</Label>
            <Select
              value={selectedClienteId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) navigate(`/documentos/plantillas/${val}`);
              }}
            >
              <option value="" disabled>
                Seleccione un cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                </option>
              ))}
            </Select>
          </div>
          {selectedClienteId && (
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Nueva Plantilla
            </Button>
          )}
        </div>
      </Card>

      {/* Formulario para crear plantilla */}
      {showCreateForm && selectedClienteId && (
        <Card className="p-4 mb-6 border-2 border-primary">
          <h3 className="font-semibold mb-3">Nueva Plantilla de Requisitos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Nombre</Label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Requisitos Combustibles"
                value={newPlantillaNombre}
                onChange={(e) => setNewPlantillaNombre(e.target.value)}
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Descripción de cuándo usar esta plantilla"
                value={newPlantillaDescripcion}
                onChange={(e) => setNewPlantillaDescripcion(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreatePlantilla} disabled={!newPlantillaNombre.trim()}>
              Crear
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de Plantillas */}
      {selectedClienteId && (
        <div className="space-y-4">
          {plantillas.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Este cliente no tiene plantillas de requisitos. Cree una nueva plantilla para comenzar.
            </Card>
          ) : (
            plantillas.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {/* Header de la plantilla */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedPlantilla(expandedPlantilla === p.id ? null : p.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedPlantilla(expandedPlantilla === p.id ? null : p.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    {expandedPlantilla === p.id ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                    <div>
                      {editingPlantilla === p.id ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="group">
                          <input
                            type="text"
                            className="border rounded px-2 py-1"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                          />
                          <Button size="sm" onClick={() => handleUpdatePlantilla(p.id)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPlantilla(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold">{p.nombre}</span>
                          {p.descripcion && <span className="text-sm text-muted-foreground ml-2">- {p.descripcion}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="group">
                    <span className="text-sm text-muted-foreground">
                      {p._count.templates} docs | {p._count.equipos} equipos
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingPlantilla(p.id);
                        setEditNombre(p.nombre);
                        setEditDescripcion(p.descripcion ?? '');
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicatePlantilla(p.id, p.nombre)}>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeletePlantilla(p.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Contenido expandido */}
                {expandedPlantilla === p.id && plantillaDetalle && (
                  <div className="border-t p-4 bg-muted/20">
                    {/* Agregar template */}
                    <div className="flex items-end gap-3 mb-4 p-3 bg-background rounded border">
                      <div className="flex-1">
                        <Label>Tipo de Entidad</Label>
                        <Select
                          value={addEntityType}
                          onChange={(e) => {
                            setAddEntityType(e.target.value as EntityType);
                            setAddTemplateId(undefined);
                          }}
                        >
                          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label>Documento</Label>
                        <Select value={addTemplateId ?? ''} onChange={(e) => setAddTemplateId(Number(e.target.value))}>
                          <option value="" disabled>
                            Seleccione...
                          </option>
                          {availableTemplates[addEntityType].map((t) => (
                            <option key={t.id} value={t.id}>
                              {(t as any).nombre ?? (t as any).name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button onClick={handleAddTemplate} disabled={!addTemplateId}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>

                    {/* Lista de templates */}
                    <div className="space-y-2">
                      {plantillaDetalle.templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Esta plantilla no tiene documentos configurados. Agregue documentos requeridos.
                        </p>
                      ) : (
                        <>
                          {(['EMPRESA_TRANSPORTISTA', 'CHOFER', 'CAMION', 'ACOPLADO'] as EntityType[]).map((entityType) => {
                            const templatesForEntity = plantillaDetalle.templates.filter((t) => t.entityType === entityType);
                            if (templatesForEntity.length === 0) return null;
                            return (
                              <div key={entityType} className="mb-3">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">{ENTITY_LABELS[entityType]}</h4>
                                {templatesForEntity.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-background rounded border mb-1">
                                    <span>{t.template.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {t.obligatorio ? 'Obligatorio' : 'Opcional'}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => handleRemoveTemplate(t.id)}
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {!selectedClienteId && (
        <Card className="p-8 text-center text-muted-foreground">Seleccione un cliente para gestionar sus plantillas de requisitos.</Card>
      )}
    </div>
  );
};

export default PlantillasRequisitoPage;
