import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import {
  useGetTemplatesQuery,
  useUploadDocumentMutation,
  useCreateEquipoCompletoMutation,
  useRollbackEquipoCompletoMutation,
  useGetDadoresQuery,
  useGetClientsQuery,
  useLazyGetConsolidatedTemplatesQuery,
} from '../../documentos/api/documentosApiSlice';
import { SeccionDocumentos, Template } from '../components/SeccionDocumentos';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

/**
 * Página de Alta Completa de Equipo
 * 
 * Permite seleccionar todos los documentos necesarios organizados por sección:
 * - Empresa Transportista
 * - Chofer
 * - Tractor (Camión)
 * - Semi (Acoplado) - opcional
 * 
 * Flujo: 1) Seleccionar archivos, 2) Crear equipo, 3) Subir todos los documentos.
 * Solo habilita el botón "Crear Equipo" cuando TODOS los documentos obligatorios
 * están SELECCIONADOS (atomicidad).
 */
const AltaEquipoCompletaPage: React.FC = () => {
  const navigate = useNavigate();
  const { goBack, getHomeRoute, user } = useRoleBasedNavigation();
  const empresaId = useAppSelector((s) => (s as any).auth?.user?.empresaId) as number | undefined;
  const role = user?.role;

  // Queries y mutations del sistema existente
  const { data: templatesResp, isLoading: loadingTemplates } = useGetTemplatesQuery(undefined);
  const { data: dadoresResp } = useGetDadoresQuery({ activo: true });
  const { data: clientsResp } = useGetClientsQuery({ activo: true });
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();
  const [createEquipoCompleto, { isLoading: creatingEquipo }] = useCreateEquipoCompletoMutation();
  const [rollbackEquipoCompleto] = useRollbackEquipoCompletoMutation();
  const [getConsolidatedTemplates, { data: consolidatedData, isFetching: loadingConsolidated }] = useLazyGetConsolidatedTemplatesQuery();

  // Estados del formulario
  const [dadorCargaId, setDadorCargaId] = useState<number | null>(null);
  const [clienteIds, setClienteIds] = useState<number[]>([]);
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

  // Estado de documentos SELECCIONADOS (no subidos aún)
  const [selectedFiles, setSelectedFiles] = useState<Map<number, { file: File; expiryDate?: string }>>(new Map());

  // Mensajes
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Permisos
  const canUpload = ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(role || '');
  const isAdminInterno = role === 'ADMIN_INTERNO';
  
  // Listas de dadores y clientes
  const dadoresList = useMemo(() => {
    const raw = (dadoresResp as any)?.data || (dadoresResp as any)?.list || [];
    return Array.isArray(raw) ? raw : [];
  }, [dadoresResp]);
  
  const clientesList = useMemo(() => {
    const raw = (clientsResp as any)?.data || (clientsResp as any)?.list || [];
    return Array.isArray(raw) ? raw : [];
  }, [clientsResp]);
  
  // Si el usuario NO es ADMIN_INTERNO, usar su empresaId como dadorCargaId por defecto
  useEffect(() => {
    if (!isAdminInterno && empresaId && !dadorCargaId) {
      setDadorCargaId(empresaId);
    }
  }, [isAdminInterno, empresaId, dadorCargaId]);

  // Cargar templates consolidados cuando cambian los clientes seleccionados
  useEffect(() => {
    if (clienteIds.length > 0) {
      getConsolidatedTemplates({ clienteIds });
    }
  }, [clienteIds, getConsolidatedTemplates]);

  // Agrupar templates por entityType
  // Si hay clientes seleccionados, usar templates consolidados; si no, usar todos los templates
  const templatesPorTipo = useMemo(() => {
    // Si hay clientes seleccionados y tenemos datos consolidados, usar esos
    if (clienteIds.length > 0 && consolidatedData?.byEntityType) {
      const byType = consolidatedData.byEntityType;
      return {
        EMPRESA_TRANSPORTISTA: (byType.EMPRESA_TRANSPORTISTA || []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames, // Info adicional para mostrar qué cliente requiere cada doc
        })),
        CHOFER: (byType.CHOFER || []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
        CAMION: (byType.CAMION || []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
        ACOPLADO: (byType.ACOPLADO || []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
      };
    }

    // Sin clientes seleccionados: usar todos los templates globales
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
  }, [templatesResp, clienteIds, consolidatedData]);

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
      dadorCargaId !== null &&
      empresaTransportista.trim().length > 1 &&
      /^\d{11}$/.test(cuitTransportista) &&
      choferNombre.trim().length >= 1 &&
      choferApellido.trim().length >= 1 &&
      choferDni.trim().length >= 6 &&
      tractorPatente.trim().length >= 5
    );
  }, [dadorCargaId, empresaTransportista, cuitTransportista, choferNombre, choferApellido, choferDni, tractorPatente]);

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

  // Verificar si todos los documentos obligatorios están SELECCIONADOS Y tienen fecha de vencimiento
  const todosDocumentosSeleccionados = useMemo(() => {
    return templateIdsObligatorios.every((id) => {
      const fileData = selectedFiles.get(id);
      // Debe tener archivo Y fecha de vencimiento
      return fileData && fileData.file && fileData.expiryDate;
    });
  }, [templateIdsObligatorios, selectedFiles]);

  // Documentos sin fecha de vencimiento (para mostrar error específico)
  const documentosSinVencimiento = useMemo(() => {
    return templateIdsObligatorios.filter((id) => {
      const fileData = selectedFiles.get(id);
      return fileData && fileData.file && !fileData.expiryDate;
    });
  }, [templateIdsObligatorios, selectedFiles]);

  // Progreso
  const progreso = useMemo(() => {
    const total = templateIdsObligatorios.length;
    const completados = templateIdsObligatorios.filter((id) => selectedFiles.has(id)).length;
    return total > 0 ? Math.round((completados / total) * 100) : 0;
  }, [templateIdsObligatorios, selectedFiles]);

  // Handler para cuando se selecciona un archivo (NO sube, solo guarda)
  const handleFileSelect = (templateId: number, file: File | null, expiryDate?: string) => {
    setSelectedFiles((prev) => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(templateId, { file, expiryDate });
      } else {
        newMap.delete(templateId);
      }
      return newMap;
    });
  };

  // Handler dummy para compatibilidad (ya no se usa)
  const handleUploadSuccess = (templateId: number, expiryDate?: string) => {
    // No hace nada, la subida se hace al crear el equipo
  };

  // Handler de creación de equipo (NUEVO FLUJO TRANSACCIONAL)
  const handleCrearEquipo = async () => {
    if (!datosBasicosCompletos) {
      setMessage({ type: 'error', text: 'Completá todos los datos básicos obligatorios' });
      return;
    }

    if (!todosDocumentosSeleccionados) {
      if (documentosSinVencimiento.length > 0) {
        setMessage({ type: 'error', text: `Hay ${documentosSinVencimiento.length} documento(s) sin fecha de vencimiento. Todos los documentos requieren fecha de vencimiento.` });
      } else {
        setMessage({ type: 'error', text: 'Seleccioná todos los documentos obligatorios antes de crear el equipo' });
      }
      return;
    }

    if (!dadorCargaId) {
      setMessage({ type: 'error', text: 'Debe seleccionar un dador de carga' });
      return;
    }

    let equipoCreado: any = null;

    try {
      setMessage({ type: 'success', text: '⏳ Validando y creando equipo...' });

      // ═══════════════════════════════════════════════════════════════════
      // PASO 1: Crear equipo COMPLETO de forma TRANSACCIONAL
      // Backend valida que chofer/camión/acoplado NO existan
      // Si existe alguno, retorna ERROR y hace ROLLBACK automático
      // ═══════════════════════════════════════════════════════════════════
      const payload = {
        dadorCargaId: dadorCargaId,
        
        // Empresa Transportista
        empresaTransportistaCuit: cuitTransportista,
        empresaTransportistaNombre: empresaTransportista,
        
        // Chofer
        choferDni: choferDni,
        choferNombre: choferNombre || undefined,
        choferApellido: choferApellido || undefined,
        choferPhones: choferPhones ? choferPhones.split(',').map((p) => p.trim()) : undefined,
        
        // Camión
        camionPatente: tractorPatente,
        camionMarca: tractorMarca || undefined,
        camionModelo: tractorModelo || undefined,
        
        // Acoplado (opcional)
        acopladoPatente: semiPatente || null,
        acopladoTipo: semiTipo || undefined,
        
        // Clientes a asociar
        clienteIds: clienteIds.length > 0 ? clienteIds : undefined,
      };

      equipoCreado = await createEquipoCompleto(payload).unwrap();

      const equipoId = equipoCreado?.id;
      const driverId = equipoCreado?.driverId;
      const truckId = equipoCreado?.truckId;
      const trailerId = equipoCreado?.trailerId;
      const empresaTransportistaId = equipoCreado?.empresaTransportistaId;

      if (!equipoId || !driverId || !truckId) {
        throw new Error('El equipo se creó pero faltan IDs esenciales');
      }

      setMessage({ type: 'success', text: `✅ Equipo creado. Subiendo ${selectedFiles.size} documentos...` });

      // ═══════════════════════════════════════════════════════════════════
      // PASO 2: Subir todos los documentos con los IDs reales
      // ═══════════════════════════════════════════════════════════════════
      let uploadedCount = 0;
      const uploadErrors: string[] = [];

      for (const [templateId, fileData] of selectedFiles.entries()) {
        try {
          const template = [...Object.values(templatesPorTipo)].flat().find((t) => t.id === templateId);
          if (!template) continue;

          let entityId: number;
          const entityType = template.entityType;

          switch (entityType) {
            case 'EMPRESA_TRANSPORTISTA':
              if (!empresaTransportistaId) {
                uploadErrors.push(`${template.name}: No hay empresa transportista`);
                continue;
              }
              entityId = empresaTransportistaId;
              break;
            case 'CHOFER':
              entityId = driverId;
              break;
            case 'CAMION':
              entityId = truckId;
              break;
            case 'ACOPLADO':
              if (!trailerId) {
                uploadErrors.push(`${template.name}: No hay acoplado en este equipo`);
                continue;
              }
              entityId = trailerId;
              break;
            default:
              uploadErrors.push(`${template.name}: Tipo de entidad desconocido`);
              continue;
          }

          const formData = new FormData();
          formData.append('document', fileData.file);
          formData.append('templateId', String(templateId));
          formData.append('entityType', entityType);
          formData.append('entityId', String(entityId));
          formData.append('dadorCargaId', String(dadorCargaId));

          if (fileData.expiryDate) {
            formData.append('expiresAt', fileData.expiryDate);
          }

          const planilla = JSON.stringify({
            empresaTransportista,
            cuitTransportista,
            choferNombre,
            choferApellido,
            choferDni,
            tractorPatente,
            semiPatente: semiPatente || undefined,
          });
          formData.append('planilla', planilla);

          await uploadDocument(formData).unwrap();
          uploadedCount++;
          setMessage({ type: 'success', text: `⏳ Subidos ${uploadedCount}/${selectedFiles.size} documentos...` });
        } catch (err: any) {
          const errorMsg = err?.data?.message || err?.message || 'Error desconocido';
          uploadErrors.push(`${template.name}: ${errorMsg}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // PASO 3: Verificar si hubo errores en la subida de documentos
      // ═══════════════════════════════════════════════════════════════════
      if (uploadErrors.length > 0) {
        setMessage({
          type: 'error',
          text: `⚠️ Algunos documentos fallaron. Deshaciendo cambios...`,
        });

        // ROLLBACK: Eliminar el equipo y sus componentes recién creados
        try {
          await rollbackEquipoCompleto({
            equipoId,
            deleteChofer: true, // Eliminar chofer creado
            deleteCamion: true, // Eliminar camión creado
            deleteAcoplado: true, // Eliminar acoplado creado (si existe)
            deleteEmpresa: false, // NO eliminar empresa (puede ser reutilizable)
          }).unwrap();

          setMessage({
            type: 'error',
            text: `❌ Rollback completado. Errores:\n${uploadErrors.slice(0, 5).join('\n')}`,
          });
        } catch (rollbackError: any) {
          console.error('Error en rollback:', rollbackError);
          setMessage({
            type: 'error',
            text: `❌ Error al deshacer cambios. Contacte al administrador. Equipo ID: ${equipoId}`,
          });
        }
      } else {
        // ═══════════════════════════════════════════════════════════════════
        // ÉXITO COMPLETO
        // ═══════════════════════════════════════════════════════════════════
        setMessage({ type: 'success', text: '✅ Equipo creado exitosamente con todos sus documentos' });
      setTimeout(() => {
          navigate(getHomeRoute());
      }, 2000);
      }
    } catch (error: any) {
      // ═══════════════════════════════════════════════════════════════════
      // ERROR EN CREACIÓN DE EQUIPO (antes de subir documentos)
      // ═══════════════════════════════════════════════════════════════════
      const errorCode = error?.data?.code;
      const errorMsg = error?.data?.message || error?.message || 'Error al crear equipo';

      // Errores específicos con mensajes claros
      if (errorCode === 'CHOFER_DUPLICADO') {
        setMessage({
          type: 'error',
          text: `❌ CHOFER YA EXISTE: El chofer con DNI ${choferDni} ya está registrado en el sistema. No se puede duplicar.`,
        });
      } else if (errorCode === 'CAMION_DUPLICADO') {
        setMessage({
          type: 'error',
          text: `❌ CAMIÓN YA EXISTE: El camión con patente ${tractorPatente} ya está registrado en el sistema. No se puede duplicar.`,
        });
      } else if (errorCode === 'ACOPLADO_DUPLICADO') {
        setMessage({
          type: 'error',
          text: `❌ ACOPLADO YA EXISTE: El acoplado con patente ${semiPatente} ya está registrado en el sistema. No se puede duplicar.`,
        });
      } else {
        setMessage({ type: 'error', text: `❌ ${errorMsg}` });
      }

      // El rollback es automático (transacción de Prisma)
      // No se creó nada en la base de datos
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
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Alta Completa de Equipo</h1>
        <button
          onClick={goBack}
          className='px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors'
        >
          ← Volver
        </button>
      </div>

      {/* Progress Bar */}
      <div className='mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Progreso de selección</span>
          <span className='text-sm text-gray-600'>
            {templateIdsObligatorios.filter((id) => selectedFiles.has(id)).length} /{' '}
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

      {/* SELECTOR DE DADOR DE CARGA (solo para ADMIN_INTERNO) */}
      {isAdminInterno && (
        <div className='bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-6 mb-4'>
          <h2 className='text-xl font-semibold text-purple-900 mb-4 flex items-center'>
            <span className='bg-purple-200 text-purple-900 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>📋</span>
            Dador de Carga *
          </h2>
          <div className='grid grid-cols-1 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Seleccionar Dador de Carga *
              </label>
              <select
                value={dadorCargaId || ''}
                onChange={(e) => setDadorCargaId(e.target.value ? Number(e.target.value) : null)}
                className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
              >
                <option value=''>-- Seleccionar Dador --</option>
                {dadoresList.map((dador: any) => (
                  <option key={dador.id} value={dador.id}>
                    {dador.razonSocial} (CUIT: {dador.cuit})
                  </option>
                ))}
              </select>
              {!dadorCargaId && (
                <p className='text-xs text-red-600 mt-1'>⚠️ Debe seleccionar un dador de carga</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SELECTOR DE CLIENTES (para todos los roles que pueden cargar) */}
      <div className='bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 mb-4'>
        <h2 className='text-xl font-semibold text-blue-900 mb-4 flex items-center'>
          <span className='bg-blue-200 text-blue-900 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>👥</span>
          Clientes (Opcional)
        </h2>
        <div className='grid grid-cols-1 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Seleccionar Clientes (puede seleccionar múltiples)
            </label>
            <div className='max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white'>
              {clientesList.length === 0 ? (
                <p className='text-sm text-gray-500'>No hay clientes disponibles</p>
              ) : (
                clientesList.map((cliente: any) => (
                  <label key={cliente.id} className='flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={clienteIds.includes(cliente.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setClienteIds([...clienteIds, cliente.id]);
                        } else {
                          setClienteIds(clienteIds.filter((id) => id !== cliente.id));
                        }
                      }}
                      className='w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                    />
                    <span className='text-sm text-gray-700'>
                      {cliente.razonSocial} {cliente.cuit && `(CUIT: ${cliente.cuit})`}
                    </span>
                  </label>
                ))
              )}
            </div>
            {clienteIds.length > 0 && (
              <div className='mt-2'>
                <p className='text-xs text-blue-600'>
                  ✓ {clienteIds.length} cliente{clienteIds.length > 1 ? 's' : ''} seleccionado{clienteIds.length > 1 ? 's' : ''}
                </p>
                {loadingConsolidated ? (
                  <p className='text-xs text-gray-500 mt-1'>⏳ Cargando documentos requeridos...</p>
                ) : consolidatedData?.templates && consolidatedData.templates.length > 0 ? (
                  <p className='text-xs text-green-600 mt-1'>
                    📋 {consolidatedData.templates.length} documentos requeridos por {clienteIds.length > 1 ? 'estos clientes' : 'este cliente'}
                  </p>
                ) : null}
              </div>
            )}
            {clienteIds.length === 0 && (
              <p className='text-xs text-amber-600 mt-2'>
                ⚠️ Sin clientes seleccionados se mostrarán todos los documentos disponibles
              </p>
            )}
          </div>
        </div>
      </div>

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
          🚚 Semi / Acoplado
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
              placeholder='Ej: Caja seca, Cisterna, etc.'
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
        dadorCargaId={dadorCargaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={Array.from(selectedFiles.keys())}
        selectOnlyMode={true}
        onFileSelect={handleFileSelect}
      />

      <SeccionDocumentos
        titulo='👤 DOCUMENTOS CHOFER'
        templates={templatesPorTipo.CHOFER}
        entityType='CHOFER'
        entityId={choferId}
        dadorCargaId={dadorCargaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={Array.from(selectedFiles.keys())}
        selectOnlyMode={true}
        onFileSelect={handleFileSelect}
      />

      <SeccionDocumentos
        titulo='🚛 DOCUMENTOS TRACTOR'
        templates={templatesPorTipo.CAMION}
        entityType='CAMION'
        entityId={tractorId}
        dadorCargaId={dadorCargaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos}
        uploadedTemplateIds={Array.from(selectedFiles.keys())}
        selectOnlyMode={true}
        onFileSelect={handleFileSelect}
      />

      <SeccionDocumentos
        titulo='🚚 DOCUMENTOS SEMI / ACOPLADO'
        templates={templatesPorTipo.ACOPLADO}
        entityType='ACOPLADO'
        entityId={semiId}
        dadorCargaId={dadorCargaId || 0}
        onUploadSuccess={handleUploadSuccess}
        uploadMutation={uploadDocument}
        disabled={!datosBasicosCompletos || !semiPatente || semiPatente.trim().length === 0}
        uploadedTemplateIds={Array.from(selectedFiles.keys())}
        selectOnlyMode={true}
        onFileSelect={handleFileSelect}
      />

      {/* BOTÓN CREAR EQUIPO */}
      <div className='mt-8 flex justify-center'>
        <button
          onClick={handleCrearEquipo}
          disabled={!datosBasicosCompletos || !todosDocumentosSeleccionados || creatingEquipo}
          className='px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg'
        >
          {creatingEquipo ? 'Creando Equipo y Subiendo Documentos...' : '✓ Crear Equipo con Todos los Documentos'}
        </button>
      </div>

      {!todosDocumentosSeleccionados && datosBasicosCompletos && (
        <div className='text-center mt-4'>
          {documentosSinVencimiento.length > 0 ? (
            <p className='text-sm text-red-600 font-medium'>
              ⚠️ {documentosSinVencimiento.length} documento(s) sin fecha de vencimiento. Todos los documentos requieren fecha de vencimiento.
            </p>
          ) : (
            <p className='text-sm text-gray-600'>
              Seleccioná {templateIdsObligatorios.length - templateIdsObligatorios.filter((id) => selectedFiles.has(id)).length} documentos más para habilitar la creación del equipo
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AltaEquipoCompletaPage;

