import { mergeTemplateFromPlantilla } from '../src/services/plantillas.service';

type MapType = Parameters<typeof mergeTemplateFromPlantilla>[0];

type Req = {
  templateId: number;
  entityType: string;
  obligatorio: boolean;
  diasAnticipacion: number;
  visibleChofer: boolean;
  plantillaRequisitoId: number;
  template?: { name: string } | null;
  plantillaRequisito?: { id: number; nombre: string; cliente?: { id: number; razonSocial: string } | null } | null;
};

function req(overrides: Partial<Req> = {}): Req {
  return {
    templateId: 1,
    entityType: 'CHOFER',
    obligatorio: false,
    diasAnticipacion: 0,
    visibleChofer: false,
    plantillaRequisitoId: 10,
    template: { name: 'Template Test' },
    plantillaRequisito: { id: 10, nombre: 'Plantilla Test', cliente: { id: 100, razonSocial: 'Cliente Test' } },
    ...overrides,
  };
}

describe('mergeTemplateFromPlantilla', () => {
  it('crea nueva entrada en el mapa cuando la clave no existe', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req());
    const key = '1:CHOFER';
    expect(map.has(key)).toBe(true);
    const entry = map.get(key)!;
    expect(entry.plantillaIds).toEqual([10]);
    expect(entry.clienteIds).toEqual([100]);
    expect(entry.templateName).toBe('Template Test');
    expect(entry.plantillaNames).toEqual(['Plantilla Test']);
  });

  it('fusiona plantilla cuando la clave existe (agrega plantillaId y clienteId)', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 10, plantillaRequisito: { id: 10, nombre: 'P1', cliente: { id: 100, razonSocial: 'C1' } } }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 20, plantillaRequisito: { id: 20, nombre: 'P2', cliente: { id: 200, razonSocial: 'C2' } } }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.plantillaIds).toContain(10);
    expect(entry.plantillaIds).toContain(20);
    expect(entry.clienteIds).toContain(100);
    expect(entry.clienteIds).toContain(200);
  });

  it('no duplica plantillaIds', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 10 }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 10 }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.plantillaIds).toEqual([10]);
  });

  it('no duplica clienteIds', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ plantillaRequisito: { id: 10, nombre: 'P1', cliente: { id: 100, razonSocial: 'C1' } } }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 20, plantillaRequisito: { id: 20, nombre: 'P2', cliente: { id: 100, razonSocial: 'C1' } } }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.clienteIds).toEqual([100]);
  });

  it('obligatorio=true gana sobre false', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ obligatorio: false }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 20, obligatorio: true }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.obligatorio).toBe(true);
  });

  it('mayor diasAnticipacion gana', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ diasAnticipacion: 5 }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 20, diasAnticipacion: 15 }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.diasAnticipacion).toBe(15);
  });

  it('visibleChofer=true gana sobre false', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({ visibleChofer: false }));
    mergeTemplateFromPlantilla(map, req({ plantillaRequisitoId: 20, visibleChofer: true }));
    const entry = map.get('1:CHOFER')!;
    expect(entry.visibleChofer).toBe(true);
  });

  it('usa nombres por defecto cuando template y plantillaRequisito son null', () => {
    const map: MapType = new Map();
    mergeTemplateFromPlantilla(map, req({
      template: null,
      plantillaRequisito: null,
      templateId: 42,
      plantillaRequisitoId: 99,
    }));
    const entry = map.get('42:CHOFER')!;
    expect(entry.templateName).toBe('Template 42');
    expect(entry.plantillaNames).toEqual(['Plantilla 99']);
    expect(entry.clienteNames).toEqual(['Sin cliente']);
  });
});
