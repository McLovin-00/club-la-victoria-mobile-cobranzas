/**
 * Tests comprehensivos para api.mocks.ts
 * 
 * Verifica todas las funciones factory para crear mocks de APIs RTK Query.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createQueryMock,
  createMutationMock,
  createLazyQueryMock,
  createDocumentosApiMock,
  mockDocumentosApi,
  createUsersApiMock,
  mockUsersApi,
  createEmpresasApiMock,
  mockEmpresasApi,
  createPlatformUsersApiMock,
  mockPlatformUsersApi,
  createRemitosApiMock,
  mockRemitosApi,
  createServicesApiMock,
  mockServicesApi,
  createEndUsersApiMock,
  mockEndUsersApi,
} from '../mocks/api.mocks';

describe('api.mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQueryMock', () => {
    it('crea un mock con data', () => {
      const mockData = { id: 1, name: 'Test' };
      const query = createQueryMock(mockData);
      const result = query();
      
      expect(result.data).toEqual(mockData);
    });

    it('tiene isLoading false por defecto', () => {
      const query = createQueryMock({ test: true });
      const result = query();
      
      expect(result.isLoading).toBe(false);
    });

    it('tiene isFetching false', () => {
      const query = createQueryMock({ test: true });
      const result = query();
      
      expect(result.isFetching).toBe(false);
    });

    it('tiene isError false por defecto', () => {
      const query = createQueryMock({ test: true });
      const result = query();
      
      expect(result.isError).toBe(false);
    });

    it('tiene error null por defecto', () => {
      const query = createQueryMock({ test: true });
      const result = query();
      
      expect(result.error).toBeNull();
    });

    it('tiene función refetch', () => {
      const query = createQueryMock({ test: true });
      const result = query();
      
      expect(typeof result.refetch).toBe('function');
    });

    it('permite especificar isLoading', () => {
      const query = createQueryMock({ test: true }, { isLoading: true });
      const result = query();
      
      expect(result.isLoading).toBe(true);
    });

    it('permite especificar error', () => {
      const error = new Error('Test error');
      const query = createQueryMock({ test: true }, { error });
      const result = query();
      
      expect(result.isError).toBe(true);
      expect(result.error).toBe(error);
    });

    it('funciona con arrays', () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const query = createQueryMock(mockData);
      const result = query();
      
      expect(result.data).toHaveLength(2);
    });

    it('funciona con undefined', () => {
      const query = createQueryMock(undefined);
      const result = query();
      
      expect(result.data).toBeUndefined();
    });
  });

  describe('createMutationMock', () => {
    it('crea un mock que retorna tuple [trigger, state]', () => {
      const mutation = createMutationMock({ success: true });
      const [trigger, state] = mutation();
      
      expect(typeof trigger).toBe('function');
      expect(typeof state).toBe('object');
    });

    it('trigger resuelve con data por defecto', async () => {
      const mutation = createMutationMock({ success: true });
      const [trigger] = mutation();
      
      const result = await trigger();
      
      expect(result).toEqual({ data: { success: true } });
    });

    it('tiene isLoading false por defecto', () => {
      const mutation = createMutationMock({});
      const [, state] = mutation();
      
      expect(state.isLoading).toBe(false);
    });

    it('permite especificar isLoading', () => {
      const mutation = createMutationMock({}, { isLoading: true });
      const [, state] = mutation();
      
      expect(state.isLoading).toBe(true);
    });

    it('permite especificar que falle', async () => {
      const mutation = createMutationMock({}, { shouldError: true });
      const [trigger] = mutation();
      
      await expect(trigger()).rejects.toThrow('Mock error');
    });

    it('funciona con respuesta vacía', async () => {
      const mutation = createMutationMock();
      const [trigger] = mutation();
      
      const result = await trigger();
      
      expect(result).toEqual({ data: {} });
    });
  });

  describe('createLazyQueryMock', () => {
    it('crea un mock que retorna tuple [trigger, state]', () => {
      const lazyQuery = createLazyQueryMock({ data: 'test' });
      const [trigger, state] = lazyQuery();
      
      expect(typeof trigger).toBe('function');
      expect(typeof state).toBe('object');
    });

    it('trigger resuelve con data', async () => {
      const lazyQuery = createLazyQueryMock({ data: 'test' });
      const [trigger] = lazyQuery();
      
      const result = await trigger();
      
      expect(result).toEqual({ data: { data: 'test' } });
    });

    it('tiene isFetching false', () => {
      const lazyQuery = createLazyQueryMock({});
      const [, state] = lazyQuery();
      
      expect(state.isFetching).toBe(false);
    });

    it('funciona con data vacía', async () => {
      const lazyQuery = createLazyQueryMock();
      const [trigger] = lazyQuery();
      
      const result = await trigger();
      
      expect(result).toEqual({ data: {} });
    });
  });

  describe('createDocumentosApiMock', () => {
    it('crea mock con todas las queries básicas', () => {
      const api = createDocumentosApiMock();
      
      expect(api.useGetDadoresQuery).toBeDefined();
      expect(api.useGetEquiposQuery).toBeDefined();
      expect(api.useGetClientsQuery).toBeDefined();
      expect(api.useGetTemplatesQuery).toBeDefined();
      expect(api.useGetChoferesQuery).toBeDefined();
      expect(api.useGetCamionesQuery).toBeDefined();
      expect(api.useGetAcopladosQuery).toBeDefined();
    });

    it('crea mock con queries de dashboard', () => {
      const api = createDocumentosApiMock();
      
      expect(api.useGetApprovalKpisQuery).toBeDefined();
      expect(api.useGetEquipoKpisQuery).toBeDefined();
      expect(api.useGetDashboardDataQuery).toBeDefined();
      expect(api.useGetPendingSummaryQuery).toBeDefined();
      expect(api.useGetDefaultsQuery).toBeDefined();
    });

    it('crea mock con mutations CRUD', () => {
      const api = createDocumentosApiMock();
      
      expect(api.useCreateEquipoMutation).toBeDefined();
      expect(api.useUpdateEquipoMutation).toBeDefined();
      expect(api.useDeleteEquipoMutation).toBeDefined();
      expect(api.useCreateDadorMutation).toBeDefined();
      expect(api.useUpdateDadorMutation).toBeDefined();
      expect(api.useDeleteDadorMutation).toBeDefined();
    });

    it('crea mock con mutations de documentos', () => {
      const api = createDocumentosApiMock();
      
      expect(api.useUploadDocumentMutation).toBeDefined();
      expect(api.useApproveDocumentMutation).toBeDefined();
      expect(api.useRejectDocumentMutation).toBeDefined();
    });

    it('crea mock con lazy queries', () => {
      const api = createDocumentosApiMock();
      
      expect(api.useLazyGetEquipoComplianceQuery).toBeDefined();
      expect(api.useLazyGetJobStatusQuery).toBeDefined();
      expect(api.useLazyCheckMissingDocsForClientQuery).toBeDefined();
    });

    it('permite overrides', () => {
      const customQuery = jest.fn(() => ({ data: 'custom' }));
      const api = createDocumentosApiMock({ useGetDadoresQuery: customQuery });
      
      expect(api.useGetDadoresQuery).toBe(customQuery);
    });

    it('tiene documentosApiSlice con reducerPath', () => {
      const api = createDocumentosApiMock();
      
      expect(api.documentosApiSlice.reducerPath).toBe('documentosApi');
    });

    it('useGetEquipoByIdQuery funciona con parámetro', () => {
      const api = createDocumentosApiMock();
      const result = api.useGetEquipoByIdQuery({ id: 5 });
      
      expect(result.data.id).toBe(5);
      expect(result.isLoading).toBe(false);
    });
  });

  describe('mockDocumentosApi', () => {
    it('es una instancia pre-creada', () => {
      expect(mockDocumentosApi.useGetDadoresQuery).toBeDefined();
      expect(mockDocumentosApi.documentosApiSlice).toBeDefined();
    });
  });

  describe('createUsersApiMock', () => {
    it('crea mock con queries de usuarios', () => {
      const api = createUsersApiMock();
      
      expect(api.useGetUsuariosQuery).toBeDefined();
      expect(api.useGetPlatformUsersQuery).toBeDefined();
    });

    it('crea mock con mutations de usuarios', () => {
      const api = createUsersApiMock();
      
      expect(api.useDeleteUserMutation).toBeDefined();
      expect(api.useRegisterPlatformUserMutation).toBeDefined();
      expect(api.useUpdateUserStatusMutation).toBeDefined();
      expect(api.useUpdateUserRoleMutation).toBeDefined();
      expect(api.useUpdateUserMutation).toBeDefined();
    });

    it('permite overrides', () => {
      const customQuery = jest.fn();
      const api = createUsersApiMock({ useGetUsuariosQuery: customQuery });
      
      expect(api.useGetUsuariosQuery).toBe(customQuery);
    });
  });

  describe('mockUsersApi', () => {
    it('es una instancia pre-creada', () => {
      expect(mockUsersApi.useGetUsuariosQuery).toBeDefined();
    });
  });

  describe('createEmpresasApiMock', () => {
    it('crea mock con query de empresas', () => {
      const api = createEmpresasApiMock();
      
      expect(api.useGetEmpresasQuery).toBeDefined();
    });

    it('retorna array vacío por defecto', () => {
      const api = createEmpresasApiMock();
      const result = api.useGetEmpresasQuery();
      
      expect(result.data).toEqual([]);
    });
  });

  describe('createPlatformUsersApiMock', () => {
    it('crea mock con mutations de registro', () => {
      const api = createPlatformUsersApiMock();
      
      expect(api.useRegisterPlatformUserMutation).toBeDefined();
      expect(api.useRegisterClientWizardMutation).toBeDefined();
      expect(api.useRegisterDadorWizardMutation).toBeDefined();
      expect(api.useRegisterTransportistaWizardMutation).toBeDefined();
      expect(api.useRegisterChoferWizardMutation).toBeDefined();
    });
  });

  describe('createRemitosApiMock', () => {
    it('crea mock con queries de remitos', () => {
      const api = createRemitosApiMock();
      
      expect(api.useGetRemitosQuery).toBeDefined();
      expect(api.useGetRemitoQuery).toBeDefined();
    });

    it('crea mock con mutations de remitos', () => {
      const api = createRemitosApiMock();
      
      expect(api.useUploadRemitoMutation).toBeDefined();
      expect(api.useApproveRemitoMutation).toBeDefined();
      expect(api.useRejectRemitoMutation).toBeDefined();
      expect(api.useReprocessRemitoMutation).toBeDefined();
      expect(api.useUpdateRemitoMutation).toBeDefined();
    });
  });

  describe('createServicesApiMock', () => {
    it('crea mock con query de config', () => {
      const api = createServicesApiMock();
      
      expect(api.useGetServiceConfigQuery).toBeDefined();
    });

    it('retorna config con servicios habilitados', () => {
      const api = createServicesApiMock();
      const result = api.useGetServiceConfigQuery();
      
      expect(result.data.documentos.enabled).toBe(true);
      expect(result.data.remitos.enabled).toBe(true);
    });
  });

  describe('createEndUsersApiMock', () => {
    it('crea mock con queries de end users', () => {
      const api = createEndUsersApiMock();
      
      expect(api.useGetEndUsersQuery).toBeDefined();
    });

    it('crea mock con mutations de end users', () => {
      const api = createEndUsersApiMock();
      
      expect(api.useCreateEndUserMutation).toBeDefined();
      expect(api.useUpdateEndUserMutation).toBeDefined();
      expect(api.useDeleteEndUserMutation).toBeDefined();
    });
  });
});

