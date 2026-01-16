/**
 * Mocks para RTK Query API Slices
 * 
 * Provee funciones factory para crear mocks de queries y mutations.
 * Usar solo cuando sea necesario aislar componentes de las APIs reales.
 */

// =============================================================================
// FACTORIES PARA CREAR MOCKS DE QUERIES Y MUTATIONS
// =============================================================================

/**
 * Crea un mock de query con respuesta personalizable
 */
export const createQueryMock = <T>(data: T, options: { isLoading?: boolean; error?: unknown } = {}) => 
  jest.fn(() => ({
    data,
    isLoading: options.isLoading ?? false,
    isFetching: false,
    isError: !!options.error,
    error: options.error ?? null,
    refetch: jest.fn(),
  }));

/**
 * Crea un mock de mutation con comportamiento personalizable
 */
export const createMutationMock = <T>(
  response: T = {} as T,
  options: { isLoading?: boolean; shouldError?: boolean } = {}
) => {
  const triggerFn = options.shouldError
    ? jest.fn().mockRejectedValue(new Error('Mock error'))
    : jest.fn().mockResolvedValue({ data: response });

  return jest.fn(() => [triggerFn, { isLoading: options.isLoading ?? false }]);
};

/**
 * Crea un mock de lazy query
 */
export const createLazyQueryMock = <T>(data: T = {} as T) => 
  jest.fn(() => [jest.fn().mockResolvedValue({ data }), { isFetching: false }]);

// =============================================================================
// MOCK DE DOCUMENTOS API SLICE
// =============================================================================

export const createDocumentosApiMock = (overrides: Record<string, unknown> = {}) => {
  const emptyQuery = createQueryMock(undefined);
  const emptyMutation = createMutationMock({});
  const listQuery = createQueryMock({ list: [] });
  const arrayQuery = createQueryMock([]);

  return {
    documentosApiSlice: { 
      reducerPath: 'documentosApi', 
      reducer: () => ({}), 
      middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
      util: { invalidateTags: jest.fn() },
    },
    // Queries básicas
    useGetDadoresQuery: listQuery,
    useGetEquiposQuery: arrayQuery,
    useGetClientsQuery: listQuery,
    useGetTemplatesQuery: arrayQuery,
    useGetChoferesQuery: createQueryMock({ data: [], pagination: { total: 0 } }),
    useGetCamionesQuery: createQueryMock({ data: [], pagination: { total: 0 } }),
    useGetAcopladosQuery: createQueryMock({ data: [], pagination: { total: 0 } }),
    useGetEmpresasTransportistasQuery: arrayQuery,
    useGetClientRequirementsQuery: arrayQuery,
    useGetClienteEquiposQuery: arrayQuery,
    useGetMisEquiposQuery: arrayQuery,
    useGetDocumentosPorEquipoQuery: arrayQuery,
    useGetPendingDocumentsQuery: arrayQuery,
    useGetEquipoHistoryQuery: arrayQuery,
    useGetConsolidatedTemplatesQuery: createQueryMock({ templates: [], byEntityType: {} }),
    
    // Queries de dashboard/KPIs
    useGetApprovalKpisQuery: createQueryMock({ semaforos: [], total: 0 }),
    useGetEquipoKpisQuery: createQueryMock({ created: 0, swaps: 0, deleted: 0 }),
    useGetDashboardDataQuery: createQueryMock({ empresas: [], semaforos: [] }),
    useGetPendingSummaryQuery: createQueryMock({ total: 0, top: [] }),
    useGetDefaultsQuery: createQueryMock({ defaultDadorId: 1, defaultClienteId: 1 }),
    
    // Queries de búsqueda
    useSearchEquiposQuery: createQueryMock([]),
    useSearchEquiposPagedQuery: createQueryMock({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      stats: undefined,
    }),
    
    // Queries con parámetros
    useGetEquipoByIdQuery: jest.fn(({ id }: { id: number }) => ({
      data: { id, dadorCargaId: 1, clientes: [], driverId: 1, truckId: 1, trailerId: null, empresaTransportistaId: 1 },
      isLoading: false,
      refetch: jest.fn(),
    })),
    useGetEquipoComplianceQuery: emptyQuery,
    useGetEquipoRequisitosQuery: createQueryMock([]),
    useGetJobStatusQuery: emptyQuery,
    useGetClientsZipJobQuery: emptyQuery,
    useGetEmpresaTransportistaChoferesQuery: arrayQuery,
    
    // Lazy queries
    useLazyGetEquipoComplianceQuery: createLazyQueryMock({}),
    useLazyGetJobStatusQuery: jest.fn(() => [jest.fn()]),
    useLazyCheckMissingDocsForClientQuery: createLazyQueryMock({ templates: [] }),
    
    // Mutations CRUD
    useCreateEquipoMutation: emptyMutation,
    useUpdateEquipoMutation: emptyMutation,
    useDeleteEquipoMutation: emptyMutation,
    useCreateEquipoMinimalMutation: emptyMutation,
    useCreateChoferMutation: emptyMutation,
    useCreateCamionMutation: emptyMutation,
    useCreateAcopladoMutation: emptyMutation,
    useCreateDadorMutation: emptyMutation,
    useUpdateDadorMutation: emptyMutation,
    useDeleteDadorMutation: emptyMutation,
    useCreateClientMutation: emptyMutation,
    useUpdateClientMutation: emptyMutation,
    useDeleteClientMutation: emptyMutation,
    useCreateEmpresaTransportistaMutation: emptyMutation,
    useUpdateEmpresaTransportistaMutation: emptyMutation,
    
    // Mutations de documentos
    useUploadDocumentMutation: emptyMutation,
    useApproveDocumentMutation: emptyMutation,
    useRejectDocumentMutation: emptyMutation,
    useUploadBatchDocsDadorMutation: emptyMutation,
    useUploadBatchDocsTransportistasMutation: emptyMutation,
    
    // Mutations de equipos
    useAssociateEquipoClienteMutation: emptyMutation,
    useAttachEquipoComponentsMutation: createMutationMock({}),
    useDetachEquipoComponentsMutation: createMutationMock({}),
    useToggleEquipoActivoMutation: emptyMutation,
    useRemoveEquipoClienteWithArchiveMutation: emptyMutation,
    useImportCsvEquiposMutation: emptyMutation,
    
    // Mutations de requisitos
    useAddClientRequirementMutation: emptyMutation,
    useRemoveClientRequirementMutation: emptyMutation,
    
    // Mutations de búsqueda
    useBulkSearchPlatesMutation: emptyMutation,
    useRequestClientsBulkZipMutation: emptyMutation,
    useTransportistasSearchMutation: emptyMutation,
    useSearchEquiposByDnisMutation: createMutationMock([]),
    
    // Permitir overrides
    ...overrides,
  };
};

export const mockDocumentosApi = createDocumentosApiMock();

// =============================================================================
// MOCK DE USERS API SLICE
// =============================================================================

export const createUsersApiMock = (overrides: Record<string, unknown> = {}) => ({
  usersApiSlice: { 
    reducerPath: 'usersApi', 
    reducer: () => ({}), 
    middleware: (getDefault: () => unknown[]) => getDefault(),
  },
  useGetUsuariosQuery: createQueryMock({ data: [], total: 0 }),
  useGetPlatformUsersQuery: createQueryMock({ data: [], total: 0 }),
  useDeleteUserMutation: createMutationMock({}),
  useRegisterPlatformUserMutation: createMutationMock({}),
  useUpdateUserStatusMutation: createMutationMock({}),
  useUpdateUserRoleMutation: createMutationMock({}),
  useUpdateUserMutation: createMutationMock({}),
  ...overrides,
});

export const mockUsersApi = createUsersApiMock();

// =============================================================================
// MOCK DE EMPRESAS API SLICE
// =============================================================================

export const createEmpresasApiMock = (overrides: Record<string, unknown> = {}) => ({
  useGetEmpresasQuery: createQueryMock([]),
  ...overrides,
});

export const mockEmpresasApi = createEmpresasApiMock();

// =============================================================================
// MOCK DE PLATFORM USERS API SLICE
// =============================================================================

export const createPlatformUsersApiMock = (overrides: Record<string, unknown> = {}) => ({
  useRegisterPlatformUserMutation: createMutationMock({}),
  useRegisterClientWizardMutation: createMutationMock({}),
  useRegisterDadorWizardMutation: createMutationMock({}),
  useRegisterTransportistaWizardMutation: createMutationMock({}),
  useRegisterChoferWizardMutation: createMutationMock({}),
  ...overrides,
});

export const mockPlatformUsersApi = createPlatformUsersApiMock();

// =============================================================================
// MOCK DE REMITOS API SLICE
// =============================================================================

export const createRemitosApiMock = (overrides: Record<string, unknown> = {}) => ({
  useGetRemitosQuery: createQueryMock({ data: [] }),
  useGetRemitoQuery: createQueryMock({ data: null }),
  useUploadRemitoMutation: createMutationMock({}),
  useApproveRemitoMutation: createMutationMock({}),
  useRejectRemitoMutation: createMutationMock({}),
  useReprocessRemitoMutation: createMutationMock({}),
  useUpdateRemitoMutation: createMutationMock({}),
  ...overrides,
});

export const mockRemitosApi = createRemitosApiMock();

// =============================================================================
// MOCK DE SERVICES API SLICE
// =============================================================================

export const createServicesApiMock = (overrides: Record<string, unknown> = {}) => ({
  useGetServiceConfigQuery: createQueryMock({ 
    documentos: { enabled: true }, 
    remitos: { enabled: true } 
  }),
  ...overrides,
});

export const mockServicesApi = createServicesApiMock();

// =============================================================================
// MOCK DE END USERS API SLICE
// =============================================================================

export const createEndUsersApiMock = (overrides: Record<string, unknown> = {}) => ({
  useGetEndUsersQuery: createQueryMock({ data: [], total: 0 }),
  useCreateEndUserMutation: createMutationMock({}),
  useUpdateEndUserMutation: createMutationMock({}),
  useDeleteEndUserMutation: createMutationMock({}),
  ...overrides,
});

export const mockEndUsersApi = createEndUsersApiMock();

