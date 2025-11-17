import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetTemplatesQuery,
  useUploadDocumentMutation,
  useCreateEquipoMutation,
} from '../../documentos/api/documentosApiSlice';
import { SeccionDocumentos, Template } from '../components/SeccionDocumentos';

/**
 * Página de Alta Completa de Equipo
 * 
 * Permite cargar todos los documentos necesarios organizados por sección:
 * - Empresa Transportista
 * - Chofer
 * - Tractor (Camión)
 * - Semi (Acoplado) - opcional
 * 
 * Solo habilita el botón "Crear Equipo" cuando TODOS los documentos obligatorios
 * están subidos (atomicidad).
 */
const AltaEquipoCompletaPage: React.FC = () => {
  const navigate = useNavigate();
  const empresaId = useAppSelector((s) => (s as any).auth?.user?.empresaId) as number | undefined;
  const role = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;

  // Queries y mutations del sistema existente
  const { data: templatesResp, isLoading: loadingTemplates } = useGetTemplatesQuery(undefined);
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();
  const [createEquipo, { isLoading: creatingEquipo }] = useCreateEquipoMutation();

  // Estados del formulario
  const [empresaTransportista, setEmpresaTransportista] = useState('');
  const [cuitTransportista, setCuitTransportista] = useState('');
  const [choferNombre, setChoferNombre] = useState('');
  const [choferApellido, setChoferApellido] = useState('');
  const [choferDni, setChoferDni] = useState('');
  const [choferPhones, setChoferPhones] = useState('');
  const [tractorPatente, setTractorPatente] = useState('');
  const [tractorMarca, setTractorMarca] = useState('');
  const [tractorModelo, setTractorModelo] = useState('');
  const [semiPatente, setSemiPatente] = useState('');
  const [semiTipo, setSemiTipo] = useState('');

  // Estado de documentos subidos
  const [uploadedTemplateIds, setUploadedTemplateIds] = useState<number[]>([]);
  const [uploadedVencimientos, setUploadedVencimientos] = useState<Record<number, string>>({});

  // Mensajes
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Permisos
  const canUpload = ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(role || '');

  // Agrupar templates por entityType
  const templatesPorTipo = useMemo(() => {
    const rawTemplates = (templatesResp as any)?.data || (templatesResp as any) || [];
    
    // Mapear 'nombre' del backend a 'name' esperado por el componente
    const allTemplates = rawTemplates.map((t: any) => ({
      id: t.id,
      name: t.nombre || t.name, // El backend devuelve 'nombre'
      entityType: t.entityType,
    }));
    
    return {
      EMPRESA_TRANSPORTISTA: allTemplates.filter((t: Template) => t.entityType === 'EMPRESA_TRANSPORTISTA'),
      CHOFER: allTemplates.filter((t: Template) => t.entityType === 'CHOFER'),
      CAMION: allTemplates.filter((t: Template) => t.entityType === 'CAMION'),
      ACOPLADO: allTemplates.filter((t: Template) => t.entityType === 'ACOPLADO'),
    };
  }, [templatesResp]);

  // Calcular IDs de entidades temporales (antes de crear el equipo)
  // Usamos valores temporales para permitir uploads; el backend creará las entidades
  const empresaTransportistaId = useMemo(() => {
    return cuitTransportista && /^\d{11}$/.test(cuitTransportista) ? cuitTransportista : '0';
  }, [cuitTransportista]);

  const choferId = useMemo(() => {
    return choferDni && choferDni.length >= 6 ? choferDni : '0';
  }, [choferDni]);

  const tractorId = useMemo(() => {
    return tractorPatente && tractorPatente.length >= 5 ? tractorPatente : '0';
  }, [tractorPatente]);

  const semiId = useMemo(() => {
    return semiPatente && semiPatente.length >= 5 ? semiPatente : '0';
  }, [semiPatente]);

  // Validar datos básicos
  const datosBasicosCompletos = useMemo(() => {
    return (
      empresaTransportista.trim().length > 1 &&
      /^\d{11}$/.test(cuitTransportista) &&
      choferNombre.trim().length >= 1 &&
      choferApellido.trim().length >= 1 &&
      choferDni.trim().length >= 6 &&
      tractorPatente.trim().length >= 5
    );
  }, [empresaTransportista, cuitTransportista, choferNombre, choferApellido, choferDni, tractorPatente]);

  // Calcular documentos obligatorios
  const templateIdsObligatorios = useMemo(() => {
    const ids: number[] = [
      ...templatesPorTipo.EMPRESA_TRANSPORTISTA.map((t) => t.id),
      ...templatesPorTipo.CHOFER.map((t) => t.id),
      ...templatesPorTipo.CAMION.map((t) => t.id),
    ];

    // Si hay patente semi, agregar documentos de semi
    if (semiPatente && semiPatente.length >= 5) {
      ids.push(...templatesPorTipo.ACOPLADO.map((t) => t.id));
    }

    return ids;
  }, [templatesPorTipo, semiPatente]);

  // Verificar si todos los documentos obligatorios están subidos
  const todosDocumentosSubidos = useMemo(() => {
    return templateIdsObligatorios.every((id) => uploadedTemplateIds.includes(id));
  }, [templateIdsObligatorios, uploadedTemplateIds]);

  // Progreso
  const progreso = useMemo(() => {
    const total = templateIdsObligatorios.length;
    const completados = uploadedTemplateIds.filter((id) => templateIdsObligatorios.includes(id)).length;
    return total > 0 ? Math.round((completados / total) * 100) : 0;
  }, [templateIdsObligatorios, uploadedTemplateIds]);

  // Handler de upload exitoso
  const handleUploadSuccess = (templateId: number, expiryDate?: string) => {
    setUploadedTemplateIds((prev) => {
      if (!prev.includes(templateId)) {
        return [...prev, templateId];
      }
      return prev;
    });

    if (expiryDate) {
      setUploadedVencimientos((prev) => ({ ...prev, [templateId]: expiryDate }));
    }

    setMessage({ type: 'success', text: 'Documento subido exitosamente' });
    setTimeout(() => setMessage(null), 3000);
  };

  // Handler de creación de equipo
  const handleCrearEquipo = async () => {
    if (!datosBasicosCompletos) {
      setMessage({ type: 'error', text: 'Completá todos los datos básicos obligatorios' });
      return;
    }

    if (!todosDocumentosSubidos) {
      setMessage({ type: 'error', text: 'Subí todos los documentos obligatorios antes de crear el equipo' });
      return;
    }

    if (!empresaId) {
      setMessage({ type: 'error', text: 'No se pudo determinar la empresa' });
      return;
    }

    try {
      // Usar el endpoint existente de creación de equipo
      const payload = {
        dadorCargaId: empresaId,
        dniChofer: choferDni,
        patenteTractor: tractorPatente,
        patenteAcoplado: semiPatente || undefined,
        choferPhones: choferPhones ? choferPhones.split(',').map((p) => p.trim()) : undefined,
        empresaTransportistaCuit: cuitTransportista,
        empresaTransportistaNombre: empresaTransportista,
      };

      await createEquipo(payload).unwrap();

      setMessage({ type: 'success', text: '✅ Equipo creado exitosamente con todos sus documentos' });
      
      // Redirigir al listado de equipos después de 2 segundos
      setTimeout(() => {
        navigate('/equipos');
      }, 2000);
    } catch (error: any) {
      const errorMsg = error?.data?.message || error?.message || 'Error al crear equipo';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  if (loadingTemplates) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <div className='text-center'>Cargando templates...</div>
      </div>
    );
  }

  if (!canUpload) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <div className='bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800'>
          ⚠️ Tu rol no permite cargar documentación desde este portal.
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Alta Completa de Equipo</h1>
        <button
          onClick={() => navigate(-1)}
          className='px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
        >
          ← Volver
        </button>
      </div>

      {/* Progress Bar */}
      <div className='mb-6 bg-white border border-gray-300 rounded-lg p-4'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-sm font-medium text-gray-700'>Progreso de carga</span>
          <span className='text-sm text-gray-600'>
            {uploadedTemplateIds.filter((id) => templateIdsObligatorios.includes(id)).length} /{' '}
            {templateIdsObligatorios.length} documentos ({progreso}%)
          </span>
        </div>
        <div className='w-full h-3 bg-gray-200 rounded-full overflow-hidden'>
          <div
            className='h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500'
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* DATOS BÁSICOS AGRUPADOS POR ENTIDAD */}
      
      {/* EMPRESA TRANSPORTISTA */}
      <div className='bg-white border border-gray-300 rounded-lg p-6 mb-4'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center'>
          <span className='bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>1</span>
          🏢 Empresa Transportista
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Razón Social *
            </label>
            <input
              type='text'
              value={empresaTransportista}
              onChange={(e) => setEmpresaTransportista(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Ej: Transportes del Norte S.A.'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              CUIT * (11 dígitos)
            </label>
            <input
              type='text'
              value={cuitTransportista}
              onChange={(e) => setCuitTransportista(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='30123456789'
              maxLength={11}
            />
            {cuitTransportista && !/^\d{11}$/.test(cuitTransportista) && (
              <p className='text-xs text-red-600 mt-1'>⚠️ Debe tener 11 dígitos</p>
            )}
          </div>
        </div>
      </div>

      {/* CHOFER */}
      <div className='bg-white border border-gray-300 rounded-lg p-6 mb-4'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center'>
          <span className='bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>2</span>
          👤 Chofer
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              DNI *
            </label>
            <input
              type='text'
              value={choferDni}
              onChange={(e) => setChoferDni(e.target.value.replace(/\D/g, ''))}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='12345678'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nombre *
            </label>
            <input
              type='text'
              value={choferNombre}
              onChange={(e) => setChoferNombre(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Juan'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Apellido *
            </label>
            <input
              type='text'
              value={choferApellido}
              onChange={(e) => setChoferApellido(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Pérez'
            />
          </div>
        </div>

        <div className='mt-4'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Teléfono(s) (opcional)
          </label>
          <input
            type='text'
            value={choferPhones}
            onChange={(e) => setChoferPhones(e.target.value)}
            className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='+5491112345678, +5491187654321'
          />
          <p className='text-xs text-gray-500 mt-1'>💡 Separar con comas si hay varios números</p>
        </div>
      </div>

      {/* TRACTOR */}
      <div className='bg-white border border-gray-300 rounded-lg p-6 mb-4'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center'>
          <span className='bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>3</span>
          🚛 Tractor
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Patente *
            </label>
            <input
              type='text'
              value={tractorPatente}
              onChange={(e) => setTractorPatente(e.target.value.toUpperCase())}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono'
              placeholder='ABC123'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Marca (opcional)
            </label>
            <input
              type='text'
              value={tractorMarca}
              onChange={(e) => setTractorMarca(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Mercedes-Benz'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Modelo (opcional)
            </label>
            <input
              type='text'
              value={tractorModelo}
              onChange={(e) => setTractorModelo(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Actros 2046'
            />
          </div>
        </div>
      </div>

      {/* SEMI (OPCIONAL) */}
      <div className='bg-white border border-gray-300 rounded-lg p-6 mb-6'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center'>
          <span className='bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>4</span>
          🚚 Semi / Acoplado (opcional)
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Patente
            </label>
            <input
              type='text'
              value={semiPatente}
              onChange={(e) => setSemiPatente(e.target.value.toUpperCase())}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono'
              placeholder='DEF456'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Tipo
            </label>
            <input
              type='text'
              value={semiTipo}
              onChange={(e) => setSemiTipo(e.target.value)}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Ej: Semirremolque caja seca'
            />
          </div>
        </div>
        
        {semiPatente && semiPatente.trim().length > 0 && (
          <div className='mt-3 bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-800'>
            ℹ️ Al completar los datos básicos, aparecerá la sección de documentos del semi (5 documentos obligatorios)
          </div>
        )}
      </div>

      {!datosBasicosCompletos && (
        <div className='mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4'>
          <div className='flex items-center'>
            <span className='text-2xl mr-3'>⚠️</span>
            <div>
              <p className='font-semibold text-yellow-800'>Completá todos los campos obligatorios (*)</p>
              <p className='text-sm text-yellow-700 mt-1'>
                Se requiere: Razón Social, CUIT, DNI, Nombre y Apellido del Chofer, y Patente del Tractor
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECCIONES DE DOCUMENTOS */}
      <SeccionDocumentos
        titulo='📄 DOCUMENTOS EMPRESA TRANSPORTISTA'
        templates={templatesPorTipo.EMPRESA_TRANSPORTISTA}
        entityType='EMPRESA_TRANSPORTISTA'
        entityId={empresaTransportistaId}
        dadorCargaId={empresaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={uploadedTemplateIds}
      />

      <SeccionDocumentos
        titulo='👤 DOCUMENTOS CHOFER'
        templates={templatesPorTipo.CHOFER}
        entityType='CHOFER'
        entityId={choferId}
        dadorCargaId={empresaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={uploadedTemplateIds}
      />

      <SeccionDocumentos
        titulo='🚛 DOCUMENTOS TRACTOR'
        templates={templatesPorTipo.CAMION}
        entityType='CAMION'
        entityId={tractorId}
        dadorCargaId={empresaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={uploadedTemplateIds}
      />

      {semiPatente && semiPatente.trim().length > 0 && (
        <SeccionDocumentos
          titulo='🚚 DOCUMENTOS SEMI (Acoplado)'
          templates={templatesPorTipo.ACOPLADO}
          entityType='ACOPLADO'
          entityId={semiId}
          dadorCargaId={empresaId || 0}
          onUploadSuccess={handleUploadSuccess}
          uploadMutation={uploadDocument}
          disabled={!datosBasicosCompletos}
          uploadedTemplateIds={uploadedTemplateIds}
        />
      )}

      {/* BOTÓN CREAR EQUIPO */}
      <div className='mt-8 flex justify-center'>
        <button
          onClick={handleCrearEquipo}
          disabled={!datosBasicosCompletos || !todosDocumentosSubidos || creatingEquipo}
          className='px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg'
        >
          {creatingEquipo ? 'Creando Equipo...' : '✓ Crear Equipo con Todos los Documentos'}
        </button>
      </div>

      {!todosDocumentosSubidos && datosBasicosCompletos && (
        <p className='text-center text-sm text-gray-600 mt-4'>
          Subí {templateIdsObligatorios.length - uploadedTemplateIds.filter((id) => templateIdsObligatorios.includes(id)).length} documentos más para habilitar la creación del equipo
        </p>
      )}
    </div>
  );
};

export default AltaEquipoCompletaPage;

