import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  useGetEmpresaTransportistaByIdQuery,
  useGetPlantillasRequisitoQuery,
  useLazyGetConsolidatedTemplatesByPlantillasQuery,
} from '../../documentos/api/documentosApiSlice';
import { SeccionDocumentos, Template } from '../components/SeccionDocumentos';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { PreCheckModal } from '../components/PreCheckModal';
import { useEntityVerification, EntityType } from '../hooks/useEntityVerification';
import { EntityStatusBadge } from '../components/EntityStatusBadge';

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
  const userDadorCargaId = useAppSelector((s) => (s as any).auth?.user?.dadorCargaId) as number | undefined;
  const role = user?.role;

  // Queries y mutations del sistema existente
  const { data: templatesResp, isLoading: loadingTemplates } = useGetTemplatesQuery(undefined);
  const { data: dadoresResp } = useGetDadoresQuery({ activo: true });
  const { data: clientsResp } = useGetClientsQuery({ activo: true });
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();
  const [createEquipoCompleto, { isLoading: creatingEquipo }] = useCreateEquipoCompletoMutation();
  const [rollbackEquipoCompleto] = useRollbackEquipoCompletoMutation();
  const [getConsolidatedTemplates, { data: consolidatedData, isFetching: loadingConsolidated }] = useLazyGetConsolidatedTemplatesQuery();
  const { data: plantillasData = [] } = useGetPlantillasRequisitoQuery({ activo: true });
  const [getConsolidatedTemplatesByPlantillas, { data: consolidatedPlantillasData, isFetching: loadingConsolidatedPlantillas }] = useLazyGetConsolidatedTemplatesByPlantillasQuery();

  // Estados del formulario
  const [dadorCargaId, setDadorCargaId] = useState<number | null>(null);
  const [clienteIds, setClienteIds] = useState<number[]>([]);
  const [plantillaIds, setPlantillaIds] = useState<number[]>([]);
  const [usePlantillas, setUsePlantillas] = useState(true); // Por defecto usar plantillas
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

  // Estado de envío: true desde que se hace click hasta que termina todo el proceso
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para pre-check de entidades existentes
  const [showPreCheck, setShowPreCheck] = useState(false);
  const [preCheckPassed, setPreCheckPassed] = useState(false);
  const [preCheckResult, setPreCheckResult] = useState<any>(null);

  // Hook para verificación inline de entidades
  // Pasa el dadorCargaId para que el backend compare correctamente (especialmente para ADMIN_INTERNO)
  const { verify, getResult, clearResult } = useEntityVerification({ dadorCargaId });

  // Permisos
  const canUpload = ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(role ?? '');
  const isAdminInterno = role === 'ADMIN_INTERNO';
  const isTransportista = role === 'TRANSPORTISTA';
  
  // Si el usuario es TRANSPORTISTA, obtener sus datos de empresa transportista
  const userEmpresaTransportistaId = useAppSelector((s) => (s as any).auth?.user?.empresaTransportistaId) as number | undefined;
  const { data: empresaTransportistaData } = useGetEmpresaTransportistaByIdQuery(
    { id: userEmpresaTransportistaId! },
    { skip: !isTransportista || !userEmpresaTransportistaId }
  );
  
  // Listas de dadores y clientes
  const dadoresList = useMemo(() => {
    const raw = (dadoresResp as any)?.data || (dadoresResp as any)?.list ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [dadoresResp]);
  
  const clientesList = useMemo(() => {
    const raw = (clientsResp as any)?.data || (clientsResp as any)?.list ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [clientsResp]);
  
  // Determinar dadorCargaId según el rol del usuario
  // - DADOR_DE_CARGA: DEBE usar su propio dadorCargaId (obligatorio)
  // - TRANSPORTISTA: se asigna en el useEffect de empresaTransportistaData
  // - ADMIN_INTERNO: selecciona manualmente
  // - Otros roles admin: usan su dadorCargaId si lo tienen
  const isDadorDeCarga = role === 'DADOR_DE_CARGA';
  const dadorCargaIdMissing = isDadorDeCarga && !userDadorCargaId;
  
  useEffect(() => {
    // Para DADOR_DE_CARGA: usar su dadorCargaId del perfil (obligatorio)
    if (isDadorDeCarga && userDadorCargaId && !dadorCargaId) {
      setDadorCargaId(userDadorCargaId);
      return;
    }
    
    // Para otros roles (excepto ADMIN_INTERNO que selecciona manual):
    // Si tienen dadorCargaId en su perfil, usarlo
    if (!isAdminInterno && !isTransportista && !isDadorDeCarga && userDadorCargaId && !dadorCargaId) {
      setDadorCargaId(userDadorCargaId);
    }
    // NOTA: NO usar empresaId como fallback, son conceptos diferentes
  }, [isAdminInterno, isTransportista, isDadorDeCarga, userDadorCargaId, dadorCargaId]);

  // Si el usuario es TRANSPORTISTA, auto-completar datos de su empresa transportista
  useEffect(() => {
    if (isTransportista && empresaTransportistaData) {
      const nombre = empresaTransportistaData.razonSocial || empresaTransportistaData.nombre ?? '';
      const cuit = empresaTransportistaData.cuit ?? '';
      setEmpresaTransportista(nombre);
      setCuitTransportista(cuit);
      // También usar el dadorCargaId de la empresa transportista si está disponible
      if (empresaTransportistaData.dadorCargaId && !dadorCargaId) {
        setDadorCargaId(empresaTransportistaData.dadorCargaId);
      }
    }
  }, [isTransportista, empresaTransportistaData, dadorCargaId]);

  // Cargar templates consolidados cuando cambian los clientes seleccionados
  useEffect(() => {
    if (clienteIds.length > 0 && !usePlantillas) {
      getConsolidatedTemplates({ clienteIds });
    }
  }, [clienteIds, getConsolidatedTemplates, usePlantillas]);

  // Cargar templates consolidados cuando cambian las plantillas seleccionadas
  useEffect(() => {
    if (plantillaIds.length > 0 && usePlantillas) {
      getConsolidatedTemplatesByPlantillas({ plantillaIds });
    }
  }, [plantillaIds, getConsolidatedTemplatesByPlantillas, usePlantillas]);

  // Agrupar templates por entityType
  // Si hay plantillas/clientes seleccionados, usar templates consolidados; si no, usar todos los templates
  const templatesPorTipo = useMemo(() => {
    // Si usamos plantillas y hay plantillas seleccionadas
    if (usePlantillas && plantillaIds.length > 0 && consolidatedPlantillasData?.byEntityType) {
      const byType = consolidatedPlantillasData.byEntityType;
      return {
        EMPRESA_TRANSPORTISTA: (byType.EMPRESA_TRANSPORTISTA ?? []).map((t: any) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: 'EMPRESA_TRANSPORTISTA',
          active: true,
        })),
        CHOFER: (byType.CHOFER ?? []).map((t: any) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: 'CHOFER',
          active: true,
        })),
        CAMION: (byType.CAMION ?? []).map((t: any) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: 'CAMION',
          active: true,
        })),
        ACOPLADO: (byType.ACOPLADO ?? []).map((t: any) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: 'ACOPLADO',
          active: true,
        })),
      };
    }
    // Si hay clientes seleccionados y tenemos datos consolidados, usar esos
    if (!usePlantillas && clienteIds.length > 0 && consolidatedData?.byEntityType) {
      const byType = consolidatedData.byEntityType;
      return {
        EMPRESA_TRANSPORTISTA: (byType.EMPRESA_TRANSPORTISTA ?? []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames, // Info adicional para mostrar qué cliente requiere cada doc
        })),
        CHOFER: (byType.CHOFER ?? []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
        CAMION: (byType.CAMION ?? []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
        ACOPLADO: (byType.ACOPLADO ?? []).map((t) => ({
          id: t.templateId,
          name: t.templateName,
          entityType: t.entityType,
          clienteNames: t.clienteNames,
        })),
      };
    }

    // Sin clientes seleccionados: usar todos los templates globales
    const rawTemplates = (templatesResp as any)?.data || (templatesResp as any) ?? [];
    
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
  }, [templatesResp, clienteIds, consolidatedData, usePlantillas, plantillaIds, consolidatedPlantillasData]);

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

  // Construir lista de entidades para pre-check
  const buildPreCheckEntidades = useCallback(() => {
    const entidades: Array<{ entityType: string; identificador: string; nombre?: string }> = [];
    
    // Empresa Transportista (por CUIT)
    if (cuitTransportista && /^\d{11}$/.test(cuitTransportista)) {
      entidades.push({
        entityType: 'EMPRESA_TRANSPORTISTA',
        identificador: cuitTransportista,
        nombre: empresaTransportista,
      });
    }
    
    // Chofer (por DNI)
    if (choferDni && choferDni.length >= 6) {
      entidades.push({
        entityType: 'CHOFER',
        identificador: choferDni,
        nombre: `${choferNombre} ${choferApellido}`.trim(),
      });
    }
    
    // Camión (por patente)
    if (tractorPatente && tractorPatente.length >= 5) {
      entidades.push({
        entityType: 'CAMION',
        identificador: tractorPatente.toUpperCase(),
        nombre: `${tractorMarca} ${tractorModelo}`.trim() ?? undefined,
      });
    }
    
    // Acoplado (por patente, si tiene)
    if (semiPatente && semiPatente.length >= 5) {
      entidades.push({
        entityType: 'ACOPLADO',
        identificador: semiPatente.toUpperCase(),
        nombre: semiTipo ?? undefined,
      });
    }
    
    return entidades;
  }, [cuitTransportista, empresaTransportista, choferDni, choferNombre, choferApellido, 
      tractorPatente, tractorMarca, tractorModelo, semiPatente, semiTipo]);

  // Handler cuando el pre-check pasa exitosamente
  const handlePreCheckContinue = useCallback((result: any) => {
    setPreCheckResult(result);
    setPreCheckPassed(true);
    setShowPreCheck(false);
    
    // Mostrar resumen de entidades reutilizadas
    const reutilizadas = result.entidades.filter((e: any) => e.existe && e.perteneceSolicitante);
    if (reutilizadas.length > 0) {
      const nombres = reutilizadas.map((e: any) => {
        const docsVigentes = e.resumen?.vigentes || 0;
        return `${e.identificador}${docsVigentes > 0 ? ` (${docsVigentes} docs vigentes)` : ''}`;
      }).join(', ');
      setMessage({ 
        type: 'success', 
        text: `✓ Entidades existentes detectadas: ${nombres}. Sus documentos vigentes se reutilizarán.` 
      });
    }
  }, []);

  // Handler cuando se crea una solicitud de transferencia
  const handleTransferenciaCreada = useCallback(() => {
    setMessage({ 
      type: 'success', 
      text: '📨 Solicitud de transferencia enviada. Recibirás una notificación cuando sea aprobada.' 
    });
    setShowPreCheck(false);
  }, []);

  // Resetear pre-check cuando cambian los datos básicos
  useEffect(() => {
    if (preCheckPassed) {
      setPreCheckPassed(false);
      setPreCheckResult(null);
    }
  }, [cuitTransportista, choferDni, tractorPatente, semiPatente]);

  // Handlers de verificación inline (onBlur)
  const handleVerifyCuit = useCallback(async () => {
    if (!cuitTransportista || !/^\d{11}$/.test(cuitTransportista)) return;
    
    const result = await verify('EMPRESA_TRANSPORTISTA', cuitTransportista);
    
    // Auto-completar nombre si existe y es del mismo dador
    if (result?.status === 'disponible' && result.nombre && !empresaTransportista) {
      setEmpresaTransportista(result.nombre);
    }
  }, [cuitTransportista, empresaTransportista, verify]);

  const handleVerifyDni = useCallback(async () => {
    if (!choferDni || choferDni.length < 6) return;
    
    const result = await verify('CHOFER', choferDni);
    
    // Auto-completar nombre si existe y es del mismo dador
    if (result?.status === 'disponible' && result.nombre) {
      const parts = result.nombre.split(' ');
      if (parts.length >= 2 && !choferNombre && !choferApellido) {
        setChoferNombre(parts[0]);
        setChoferApellido(parts.slice(1).join(' '));
      }
    }
  }, [choferDni, choferNombre, choferApellido, verify]);

  const handleVerifyPatenteCamion = useCallback(async () => {
    if (!tractorPatente || tractorPatente.length < 5) return;
    
    const result = await verify('CAMION', tractorPatente.toUpperCase());
    
    // Auto-completar marca/modelo si existe y es del mismo dador
    if (result?.status === 'disponible' && result.nombre) {
      const parts = result.nombre.split(' ');
      if (parts.length >= 1 && !tractorMarca) {
        setTractorMarca(parts[0]);
        if (parts.length >= 2 && !tractorModelo) {
          setTractorModelo(parts.slice(1).join(' '));
        }
      }
    }
  }, [tractorPatente, tractorMarca, tractorModelo, verify]);

  const handleVerifyPatenteAcoplado = useCallback(async () => {
    if (!semiPatente || semiPatente.length < 5) return;
    
    const result = await verify('ACOPLADO', semiPatente.toUpperCase());
    
    // Auto-completar tipo si existe y es del mismo dador
    if (result?.status === 'disponible' && result.nombre && !semiTipo) {
      setSemiTipo(result.nombre);
    }
  }, [semiPatente, semiTipo, verify]);

  // Limpiar verificación cuando cambia el valor del campo
  const handleCuitChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    setCuitTransportista(cleaned);
    if (cleaned.length < 11) {
      clearResult('EMPRESA_TRANSPORTISTA');
    }
  };

  const handleDniChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setChoferDni(cleaned);
    if (cleaned.length < 6) {
      clearResult('CHOFER');
    }
  };

  const handlePatenteCamionChange = (value: string) => {
    setTractorPatente(value.toUpperCase());
    if (value.length < 5) {
      clearResult('CAMION');
    }
  };

  const handlePatenteAcopladoChange = (value: string) => {
    setSemiPatente(value.toUpperCase());
    if (value.length < 5) {
      clearResult('ACOPLADO');
    }
  };

  // Handler para iniciar el pre-check
  const handleInitPreCheck = () => {
    if (!datosBasicosCompletos) {
      setMessage({ type: 'error', text: 'Completá todos los datos básicos obligatorios' });
      return;
    }
    if (!dadorCargaId) {
      setMessage({ type: 'error', text: 'Debe seleccionar un dador de carga' });
      return;
    }
    setShowPreCheck(true);
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
      if (dadorCargaIdMissing) {
        setMessage({ type: 'error', text: 'Tu sesión está desactualizada. Cerrá sesión y volvé a iniciar sesión para continuar.' });
      } else {
        setMessage({ type: 'error', text: 'Debe seleccionar un dador de carga' });
      }
      return;
    }

    // Deshabilitar botón durante todo el proceso
    setIsSubmitting(true);
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
        choferNombre: choferNombre ?? undefined,
        choferApellido: choferApellido ?? undefined,
        choferPhones: choferPhones ? choferPhones.split(',').map((p) => p.trim()) : undefined,
        
        // Camión
        camionPatente: tractorPatente,
        camionMarca: tractorMarca ?? undefined,
        camionModelo: tractorModelo ?? undefined,
        
        // Acoplado (opcional)
        acopladoPatente: semiPatente || null,
        acopladoTipo: semiTipo ?? undefined,
        
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
            semiPatente: semiPatente ?? undefined,
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
        // Mantener deshabilitado hasta la navegación
        setTimeout(() => {
          navigate(getHomeRoute());
        }, 2000);
        return; // No rehabilitar el botón, vamos a navegar
      }
      // Rehabilitar botón si hubo errores en uploads pero no navegamos
      setIsSubmitting(false);
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
      setIsSubmitting(false);
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

      {/* Alerta: sesión desactualizada para DADOR_DE_CARGA */}
      {dadorCargaIdMissing && (
        <div className='mb-4 p-4 rounded-lg bg-amber-50 border-2 border-amber-400 text-amber-800'>
          <div className='flex items-start gap-3'>
            <span className='text-2xl'>⚠️</span>
            <div>
              <p className='font-semibold mb-1'>Sesión desactualizada</p>
              <p className='text-sm'>
                Tu perfil no tiene el dador de carga asignado correctamente. 
                Por favor, <strong>cerrá sesión y volvé a iniciar sesión</strong> para actualizar tus datos.
              </p>
            </div>
          </div>
        </div>
      )}

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
                value={dadorCargaId ?? ''}
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

      {/* SELECTOR DE PLANTILLAS DE REQUISITOS */}
      <div className='bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 mb-4'>
        <h2 className='text-xl font-semibold text-blue-900 mb-4 flex items-center'>
          <span className='bg-blue-200 text-blue-900 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>📋</span>
          Plantillas de Requisitos (Opcional)
        </h2>
        <div className='grid grid-cols-1 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Seleccionar Plantillas de Requisitos (puede seleccionar múltiples)
            </label>
            <div className='max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white'>
              {plantillasData.length === 0 ? (
                <p className='text-sm text-gray-500'>No hay plantillas de requisitos disponibles</p>
              ) : (
                // Agrupar por cliente
                Object.entries(
                  plantillasData.reduce((acc: Record<string, any[]>, p: any) => {
                    const clienteName = p.cliente?.razonSocial || 'Sin cliente';
                    acc[clienteName] = acc[clienteName] ?? [];
                    acc[clienteName].push(p);
                    return acc;
                  }, {})
                ).map(([clienteName, plantillas]: [string, any[]]) => (
                  <div key={clienteName} className='mb-3'>
                    <div className='text-xs font-semibold text-gray-500 uppercase mb-1 px-2'>{clienteName}</div>
                    {plantillas.map((plantilla: any) => (
                      <label key={plantilla.id} className='flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={plantillaIds.includes(plantilla.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPlantillaIds([...plantillaIds, plantilla.id]);
                              // También agregar el clienteId para la asociación
                              if (!clienteIds.includes(plantilla.clienteId)) {
                                setClienteIds([...clienteIds, plantilla.clienteId]);
                              }
                            } else {
                              setPlantillaIds(plantillaIds.filter((id) => id !== plantilla.id));
                            }
                          }}
                          className='w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                        />
                        <span className='text-sm text-gray-700'>
                          {plantilla.nombre}
                          <span className='text-xs text-gray-500 ml-2'>
                            ({plantilla._count?.templates || 0} docs)
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
            {plantillaIds.length > 0 && (
              <div className='mt-2'>
                <p className='text-xs text-blue-600'>
                  ✓ {plantillaIds.length} plantilla{plantillaIds.length > 1 ? 's' : ''} seleccionada{plantillaIds.length > 1 ? 's' : ''}
                </p>
                {loadingConsolidatedPlantillas ? (
                  <p className='text-xs text-gray-500 mt-1'>⏳ Cargando documentos requeridos...</p>
                ) : consolidatedPlantillasData?.templates && consolidatedPlantillasData.templates.length > 0 ? (
                  <p className='text-xs text-green-600 mt-1'>
                    📋 {consolidatedPlantillasData.templates.length} documentos requeridos por {plantillaIds.length > 1 ? 'estas plantillas' : 'esta plantilla'}
                  </p>
                ) : null}
              </div>
            )}
            {plantillaIds.length === 0 && (
              <p className='text-xs text-amber-600 mt-2'>
                ⚠️ Sin plantillas seleccionadas se mostrarán todos los documentos disponibles
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DATOS BÁSICOS AGRUPADOS POR ENTIDAD */}
      
      {/* EMPRESA TRANSPORTISTA */}
      <div className={`border rounded-lg p-6 mb-4 ${isTransportista ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300'}`}>
        <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center'>
          <span className='bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold'>1</span>
          🏢 Empresa Transportista
          {isTransportista && (
            <span className='ml-3 text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded'>
              ✓ Tu empresa (automático)
            </span>
          )}
        </h2>
        
        {isTransportista && (
          <div className='mb-4 bg-blue-100 border border-blue-200 rounded p-3 text-sm text-blue-800'>
            ℹ️ Los datos de tu empresa transportista se completan automáticamente y no pueden modificarse.
          </div>
        )}
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Razón Social *
            </label>
            <input
              type='text'
              value={empresaTransportista}
              onChange={(e) => !isTransportista && setEmpresaTransportista(e.target.value)}
              disabled={isTransportista}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isTransportista 
                  ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed' 
                  : 'border-gray-300'
              }`}
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
              onChange={(e) => !isTransportista && handleCuitChange(e.target.value)}
              onBlur={!isTransportista ? handleVerifyCuit : undefined}
              onKeyDown={(e) => e.key === 'Enter' && !isTransportista && handleVerifyCuit()}
              disabled={isTransportista}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isTransportista 
                  ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed' 
                  : 'border-gray-300'
              }`}
              placeholder='30123456789'
              maxLength={11}
            />
            {cuitTransportista && !/^\d{11}$/.test(cuitTransportista) && !isTransportista && (
              <p className='text-xs text-red-600 mt-1'>⚠️ Debe tener 11 dígitos</p>
            )}
            {!isTransportista && /^\d{11}$/.test(cuitTransportista) && (
              <EntityStatusBadge result={getResult('EMPRESA_TRANSPORTISTA')} entityType="EMPRESA_TRANSPORTISTA" />
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
              onChange={(e) => handleDniChange(e.target.value)}
              onBlur={handleVerifyDni}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyDni()}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='12345678'
            />
            {choferDni.length >= 6 && (
              <EntityStatusBadge result={getResult('CHOFER')} entityType="CHOFER" />
            )}
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
              onChange={(e) => handlePatenteCamionChange(e.target.value)}
              onBlur={handleVerifyPatenteCamion}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPatenteCamion()}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono'
              placeholder='ABC123'
            />
            {tractorPatente.length >= 5 && (
              <EntityStatusBadge result={getResult('CAMION')} entityType="CAMION" />
            )}
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
              onChange={(e) => handlePatenteAcopladoChange(e.target.value)}
              onBlur={handleVerifyPatenteAcoplado}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPatenteAcoplado()}
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono'
              placeholder='DEF456'
            />
            {semiPatente.length >= 5 && (
              <EntityStatusBadge result={getResult('ACOPLADO')} entityType="ACOPLADO" />
            )}
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

      {/* INDICADOR DE PRE-CHECK PASADO */}
      {preCheckPassed && preCheckResult && (
        <div className='mt-6 bg-green-50 border border-green-200 rounded-lg p-4'>
          <div className='flex items-start gap-3'>
            <span className='text-2xl'>✓</span>
            <div className='flex-1'>
              <p className='font-medium text-green-800'>Entidades verificadas</p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {preCheckResult.entidades.map((e: any, idx: number) => (
                  <span 
                    key={idx}
                    className={`px-2 py-1 rounded text-xs ${
                      e.existe 
                        ? e.perteneceSolicitante 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {e.entityType === 'EMPRESA_TRANSPORTISTA' && '🏢'}
                    {e.entityType === 'CHOFER' && '👤'}
                    {e.entityType === 'CAMION' && '🚛'}
                    {e.entityType === 'ACOPLADO' && '📦'}
                    {' '}{e.identificador}
                    {e.existe && e.perteneceSolicitante && e.resumen?.vigentes > 0 && (
                      <span className='ml-1'>({e.resumen.vigentes} docs ✓)</span>
                    )}
                    {!e.existe && ' (nueva)'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTONES DE ACCIÓN */}
      <div className='mt-8 flex flex-col items-center gap-4'>
        {/* Botón de verificar entidades (si no pasó pre-check) */}
        {!preCheckPassed && datosBasicosCompletos && (
          <button
            onClick={handleInitPreCheck}
            disabled={isSubmitting}
            className='px-6 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            🔍 Verificar disponibilidad de entidades
          </button>
        )}

        {/* Botón crear equipo */}
        <button
          onClick={preCheckPassed ? handleCrearEquipo : handleInitPreCheck}
          disabled={!datosBasicosCompletos || !todosDocumentosSeleccionados || isSubmitting}
          className='px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg'
        >
          {isSubmitting 
            ? 'Creando Equipo y Subiendo Documentos...' 
            : preCheckPassed 
              ? '✓ Crear Equipo con Todos los Documentos'
              : '🔍 Verificar y Crear Equipo'
          }
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

      {/* MODAL DE PRE-CHECK */}
      <PreCheckModal
        isOpen={showPreCheck}
        onClose={() => setShowPreCheck(false)}
        entidades={buildPreCheckEntidades()}
        clienteId={clienteIds.length > 0 ? clienteIds[0] : undefined}
        onContinue={handlePreCheckContinue}
        onTransferenciaCreada={handleTransferenciaCreada}
      />
    </div>
  );
};

export default AltaEquipoCompletaPage;

