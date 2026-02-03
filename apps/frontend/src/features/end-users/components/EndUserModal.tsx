import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useGetEmpresasQuery } from '../../empresas/api/empresasApiSlice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial?: any | null;
  onSubmit: (values: any) => Promise<void> | void;
}

const EndUserModal: React.FC<Props> = ({ isOpen, onClose, initial, onSubmit }) => {
  const { data: empresas = [] } = useGetEmpresasQuery();
  const [values, setValues] = useState<any>({
    identifierType: 'email',
    identifierValue: '',
    empresaId: undefined as number | undefined,
    nombre: '',
    apellido: '',
    direccion: '',
    localidad: '',
    provincia: '',
    pais: '',
    contacto: '',
    metadata: '', // JSON string in UI
    isActive: true,
  });

  useEffect(() => {
    if (initial) {
      setValues({
        identifierType: initial.identifierType,
        identifierValue: initial.identifier_value,
        empresaId: initial.empresaId ?? undefined,
        nombre: initial.nombre ?? '',
        apellido: initial.apellido ?? '',
        direccion: initial.direccion ?? '',
        localidad: initial.localidad ?? '',
        provincia: initial.provincia ?? '',
        pais: initial.pais ?? '',
        contacto: initial.contacto ?? '',
        metadata: initial.metadata ? JSON.stringify(initial.metadata, null, 2) : '',
        isActive: initial.is_active,
      });
    } else {
      setValues({ identifierType: 'email', identifierValue: '', empresaId: undefined, nombre: '', apellido: '', direccion: '', localidad: '', provincia: '', pais: '', contacto: '', metadata: '', isActive: true });
    }
  }, [initial]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;
    setValues((v: any) => ({ ...v, [name]: name === 'empresaId' ? (value ? Number(value) : undefined) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...values };
    // parse metadata JSON if provided
    if (typeof payload.metadata === 'string' && payload.metadata.trim() !== '') {
      try {
        payload.metadata = JSON.parse(payload.metadata);
      } catch (_err) {
        window.alert('Metadata debe ser JSON válido');
        return;
      }
    } else if (payload.metadata === '') {
      delete payload.metadata;
    }
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-xl p-6 bg-background">
        <h2 className="text-xl font-semibold mb-4">{initial ? 'Editar usuario final' : 'Nuevo usuario final'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initial && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm">Tipo</label>
                <select name="identifierType" value={values.identifierType} onChange={handleChange} className="w-full border rounded px-2 py-2">
                  <option value="email">email</option>
                  <option value="whatsapp">whatsapp</option>
                  <option value="telegram">telegram</option>
                  <option value="facebook">facebook</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm">Identificador</label>
                <input name="identifierValue" value={values.identifierValue} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="email o handle" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Empresa</label>
              <select name="empresaId" value={values.empresaId ?? ''} onChange={handleChange} className="w-full border rounded px-2 py-2">
                <option value="">Sin empresa</option>
                {empresas.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="mr-2 text-sm">Activo</label>
              <select name="isActive" value={String(values.isActive)} onChange={handleChange} className="border rounded px-2 py-2">
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Nombre</label>
              <input name="nombre" value={values.nombre} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Apellido</label>
              <input name="apellido" value={values.apellido} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Dirección</label>
              <input name="direccion" value={values.direccion} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Localidad</label>
              <input name="localidad" value={values.localidad} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Provincia</label>
              <input name="provincia" value={values.provincia} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">País</label>
              <input name="pais" value={values.pais} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="text-sm">Contacto</label>
            <input name="contacto" value={values.contacto} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="text-sm">Metadata (JSON)</label>
            <textarea name="metadata" value={values.metadata} onChange={handleChange} className="w-full border rounded px-3 py-2 font-mono text-sm" rows={4} placeholder='{"preferencias": {"idioma": "es"}}' />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{initial ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EndUserModal;


