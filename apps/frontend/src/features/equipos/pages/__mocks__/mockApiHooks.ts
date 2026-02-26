import { jest } from '@jest/globals';

/**
 * Helper para crear mocks de RTK Query hooks
 */

export const createQueryMock = (data: unknown, isLoading = false, error: unknown = null) => ({
    data,
    isLoading,
    isFetching: isLoading,
    isError: !!error,
    error,
    refetch: jest.fn(),
});

export const createMutationMock = (result: any = {}, isLoading = false) => {
    const mutationFn = jest.fn<() => Promise<any>>().mockResolvedValue(result);
    return [mutationFn, { isLoading, isError: false, error: null }];
};

export const createLazyQueryMock = (data: any = null, isFetching = false) => {
    const triggerFn = jest.fn<() => Promise<any>>().mockResolvedValue({ data });
    return [triggerFn, { data, isFetching, isError: false, error: null }];
};

/**
 * Mock completo de documentosApiSlice para AltaEquipoCompletaPage
 */
export const createDocumentosApiSliceMock = (overrides: Record<string, unknown> = {}) => ({
    useGetTemplatesQuery: jest.fn(() => createQueryMock(overrides.templates || [])),
    useGetDadoresQuery: jest.fn(() => createQueryMock(overrides.dadores || { data: [] })),
    useGetClientsQuery: jest.fn(() => createQueryMock(overrides.clientes || { list: [] })),
    useLazyGetConsolidatedTemplatesQuery: jest.fn(() =>
        createLazyQueryMock(overrides.consolidatedTemplates || null)
    ),
    useUploadDocumentMutation: jest.fn(() =>
        createMutationMock(overrides.uploadResult || {})
    ),
    useCreateEquipoCompletoMutation: jest.fn(() =>
        createMutationMock(overrides.equipoCreado || {})
    ),
    useRollbackEquipoCompletoMutation: jest.fn(() =>
        createMutationMock(overrides.rollbackResult || {})
    ),
});

/**
 * Mock completo de documentosApiSlice para EditarEquipoPage
 */
export const createDocumentosApiSliceMockForEdit = (overrides: Record<string, unknown> = {}) => ({
    ...createDocumentosApiSliceMock(overrides),
    useGetEquipoByIdQuery: jest.fn(() => createQueryMock(overrides.equipo || null)),
    useGetChoferesQuery: jest.fn(() => createQueryMock(overrides.choferes || { data: [] })),
    useGetCamionesQuery: jest.fn(() => createQueryMock(overrides.camiones || { data: [] })),
    useGetAcopladosQuery: jest.fn(() => createQueryMock(overrides.acoplados || { data: [] })),
    useGetEmpresasTransportistasQuery: jest.fn(() => createQueryMock(overrides.empresas || [])),
    useGetEquipoRequisitosQuery: jest.fn(() => createQueryMock(overrides.requisitos || [])),
    useLazyCheckMissingDocsForClientQuery: jest.fn(() =>
        createLazyQueryMock(overrides.missingDocs || null)
    ),
    useAttachEquipoComponentsMutation: jest.fn(() => createMutationMock({})),
    useUpdateEquipoMutation: jest.fn(() => createMutationMock({})),
    useAssociateEquipoClienteMutation: jest.fn(() => createMutationMock({})),
    useRemoveEquipoClienteWithArchiveMutation: jest.fn(() => createMutationMock({})),
    useCreateCamionMutation: jest.fn(() => createMutationMock(overrides.camionCreado || {})),
    useCreateAcopladoMutation: jest.fn(() => createMutationMock(overrides.acopladoCreado || {})),
    useCreateChoferMutation: jest.fn(() => createMutationMock(overrides.choferCreado || {})),
    useCreateEmpresaTransportistaMutation: jest.fn(() => createMutationMock(overrides.empresaCreada || {})),
});

/**
 * Mock de platformUsersApiSlice
 */
export const createPlatformUsersApiSliceMock = (overrides: Record<string, unknown> = {}) => ({
    useRegisterChoferWizardMutation: jest.fn(() =>
        createMutationMock(overrides.choferUserCreated || { tempPassword: 'Test123!' })
    ),
    useRegisterTransportistaWizardMutation: jest.fn(() =>
        createMutationMock(overrides.transportistaUserCreated || { tempPassword: 'Test456!' })
    ),
});

/**
 * Mock de useRoleBasedNavigation
 */
export const createRoleBasedNavigationMock = (role = 'ADMIN_INTERNO', empresaId?: number) => ({
    goBack: jest.fn(),
    getHomeRoute: jest.fn(() => '/'),
    user: { role, empresaId },
});

/**
 * Mock de store Redux
 */
export const createMockStore = (authState: Record<string, any> = {}) => ({
    dispatch: jest.fn(),
    getState: jest.fn(() => ({
        auth: {
            user: { role: 'ADMIN_INTERNO', empresaId: 1, ...authState.user },
            token: 'mock-token',
            initialized: true,
            isAuthenticated: true,
            ...authState,
        },
    })),
    subscribe: jest.fn(() => () => undefined),
    replaceReducer: jest.fn(),
});
