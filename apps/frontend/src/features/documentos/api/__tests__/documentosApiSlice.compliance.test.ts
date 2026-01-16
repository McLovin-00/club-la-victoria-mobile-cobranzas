/**
 * Tests de endpoints de Compliance para documentosApiSlice
 * Prueba endpoints relacionados con compliance, clientes, transportistas y documentos
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Compliance Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Endpoints de Compliance - Exportaciones', () => {
    it('should export useGetEquipoComplianceQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoComplianceQuery).toBeDefined();
    });

    it('should export useLazyGetEquipoComplianceQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useLazyGetEquipoComplianceQuery).toBeDefined();
    });

    it('should export useGetClienteEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetClienteEquiposQuery).toBeDefined();
    });

    it('should export useBulkSearchPlatesMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useBulkSearchPlatesMutation).toBeDefined();
    });

    it('should export useRequestClientsBulkZipMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useRequestClientsBulkZipMutation).toBeDefined();
    });

    it('should export useGetClientsZipJobQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetClientsZipJobQuery).toBeDefined();
    });

    it('should export useGetMisEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetMisEquiposQuery).toBeDefined();
    });

    it('should export useTransportistasSearchMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useTransportistasSearchMutation).toBeDefined();
    });

    it('should export useGetDocumentosPorEquipoQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDocumentosPorEquipoQuery).toBeDefined();
    });
  });

  describe('Endpoints de Batch Jobs', () => {
    it('should export useGetJobStatusQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetJobStatusQuery).toBeDefined();
    });

    it('should export useLazyGetJobStatusQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useLazyGetJobStatusQuery).toBeDefined();
    });

    it('should export useImportCsvEquiposMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useImportCsvEquiposMutation).toBeDefined();
    });

    it('should export useUploadBatchDocsDadorMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUploadBatchDocsDadorMutation).toBeDefined();
    });

    it('should export useUploadBatchDocsTransportistasMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUploadBatchDocsTransportistasMutation).toBeDefined();
    });

    it('should export useCreateEquipoMinimalMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateEquipoMinimalMutation).toBeDefined();
    });
  });

  describe('Endpoints de Templates', () => {
    it('should export useGetTemplatesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetTemplatesQuery).toBeDefined();
    });

    it('should export useCreateTemplateMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateTemplateMutation).toBeDefined();
    });

    it('should export useUpdateTemplateMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateTemplateMutation).toBeDefined();
    });

    it('should export useDeleteTemplateMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteTemplateMutation).toBeDefined();
    });
  });

  describe('Endpoints de Clients', () => {
    it('should export useGetClientsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetClientsQuery).toBeDefined();
    });

    it('should export useCreateClientMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateClientMutation).toBeDefined();
    });

    it('should export useUpdateClientMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateClientMutation).toBeDefined();
    });

    it('should export useDeleteClientMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteClientMutation).toBeDefined();
    });

    it('should export useGetClientRequirementsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetClientRequirementsQuery).toBeDefined();
    });

    it('should export useAddClientRequirementMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useAddClientRequirementMutation).toBeDefined();
    });

    it('should export useRemoveClientRequirementMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useRemoveClientRequirementMutation).toBeDefined();
    });

    it('should export useGetConsolidatedTemplatesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetConsolidatedTemplatesQuery).toBeDefined();
    });

    it('should export useCheckMissingDocsForClientQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCheckMissingDocsForClientQuery).toBeDefined();
    });

  });

  describe('Endpoints de Dashboard', () => {
    it('should export useGetDashboardDataQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDashboardDataQuery).toBeDefined();
    });

    it('should export useGetPendingSummaryQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPendingSummaryQuery).toBeDefined();
    });

    it('should export useGetDashboardStatsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDashboardStatsQuery).toBeDefined();
    });

    it('should export useGetEquipoKpisQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoKpisQuery).toBeDefined();
    });

    it('should export useGetStatsPorRolQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetStatsPorRolQuery).toBeDefined();
    });
  });

  describe('Endpoints de Approval Workflow', () => {
    it('should export useGetApprovalPendingQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetApprovalPendingQuery).toBeDefined();
    });

    it('should export useGetApprovalPendingByIdQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetApprovalPendingByIdQuery).toBeDefined();
    });

    it('should export useApprovePendingDocumentMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useApprovePendingDocumentMutation).toBeDefined();
    });

    it('should export useRejectPendingDocumentMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useRejectPendingDocumentMutation).toBeDefined();
    });

    it('should export useRecheckDocumentWithAIMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useRecheckDocumentWithAIMutation).toBeDefined();
    });

    it('should export useBatchApproveDocumentsMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useBatchApproveDocumentsMutation).toBeDefined();
    });

    it('should export useGetApprovalStatsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetApprovalStatsQuery).toBeDefined();
    });

    it('should export useGetApprovalKpisQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetApprovalKpisQuery).toBeDefined();
    });
  });

  describe('Endpoints de Empresas Transportistas', () => {
    it('should export useGetEmpresasTransportistasQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEmpresasTransportistasQuery).toBeDefined();
    });

    it('should export useGetEmpresaTransportistaByIdQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEmpresaTransportistaByIdQuery).toBeDefined();
    });

    it('should export useCreateEmpresaTransportistaMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateEmpresaTransportistaMutation).toBeDefined();
    });

    it('should export useUpdateEmpresaTransportistaMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateEmpresaTransportistaMutation).toBeDefined();
    });

    it('should export useDeleteEmpresaTransportistaMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteEmpresaTransportistaMutation).toBeDefined();
    });

    it('should export useGetEmpresaTransportistaChoferesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEmpresaTransportistaChoferesQuery).toBeDefined();
    });

    it('should export useGetEmpresaTransportistaEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEmpresaTransportistaEquiposQuery).toBeDefined();
    });
  });

  describe('Endpoints de Audit y Config', () => {
    it('should export useGetAuditLogsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetAuditLogsQuery).toBeDefined();
    });
  });

  describe('Endpoints de AI Extracted Data', () => {
    it('should export useGetExtractedDataListQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetExtractedDataListQuery).toBeDefined();
    });

    it('should export useGetEntityExtractedDataQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEntityExtractedDataQuery).toBeDefined();
    });

    it('should export useGetEntityExtractionHistoryQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEntityExtractionHistoryQuery).toBeDefined();
    });

    it('should export useUpdateEntityExtractedDataMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateEntityExtractedDataMutation).toBeDefined();
    });

    it('should export useDeleteEntityExtractedDataMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteEntityExtractedDataMutation).toBeDefined();
    });
  });

  describe('Endpoints de Documents', () => {
    it('should export useGetDocumentsByEmpresaQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDocumentsByEmpresaQuery).toBeDefined();
    });

    it('should export useUploadDocumentMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUploadDocumentMutation).toBeDefined();
    });

    it('should export useDeleteDocumentMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteDocumentMutation).toBeDefined();
    });
  });

  describe('Endpoints de Equipos/Teams', () => {
    it('should export useGetEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquiposQuery).toBeDefined();
    });

    it('should export useGetEquipoByIdQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoByIdQuery).toBeDefined();
    });

    it('should export useGetEquipoHistoryQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoHistoryQuery).toBeDefined();
    });

    it('should export useCreateEquipoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateEquipoMutation).toBeDefined();
    });

    it('should export useUpdateEquipoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateEquipoMutation).toBeDefined();
    });

    it('should export useDeleteEquipoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteEquipoMutation).toBeDefined();
    });

    it('should export useAssociateEquipoClienteMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useAssociateEquipoClienteMutation).toBeDefined();
    });

    it('should export useRemoveEquipoClienteMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useRemoveEquipoClienteMutation).toBeDefined();
    });

    it('should export useSearchEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useSearchEquiposQuery).toBeDefined();
    });

    it('should export useLazySearchEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useLazySearchEquiposQuery).toBeDefined();
    });

    it('should export useAttachEquipoComponentsMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useAttachEquipoComponentsMutation).toBeDefined();
    });

    it('should export useDetachEquipoComponentsMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDetachEquipoComponentsMutation).toBeDefined();
    });

    it('should export useGetEquipoRequisitosQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoRequisitosQuery).toBeDefined();
    });

    it('should export useGetEquipoAuditHistoryQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetEquipoAuditHistoryQuery).toBeDefined();
    });
  });

  describe('Endpoints de Maestros (Choferes)', () => {
    it('should export useGetChoferesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetChoferesQuery).toBeDefined();
    });

    it('should export useGetChoferByIdQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetChoferByIdQuery).toBeDefined();
    });

    it('should export useCreateChoferMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateChoferMutation).toBeDefined();
    });

    it('should export useUpdateChoferMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateChoferMutation).toBeDefined();
    });

    it('should export useDeleteChoferMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteChoferMutation).toBeDefined();
    });
  });

  describe('Endpoints de Maestros (Camiones)', () => {
    it('should export useGetCamionesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetCamionesQuery).toBeDefined();
    });

    it('should export useCreateCamionMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateCamionMutation).toBeDefined();
    });

    it('should export useUpdateCamionMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateCamionMutation).toBeDefined();
    });

    it('should export useDeleteCamionMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteCamionMutation).toBeDefined();
    });
  });

  describe('Endpoints de Maestros (Acoplados)', () => {
    it('should export useGetAcopladosQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetAcopladosQuery).toBeDefined();
    });

    it('should export useCreateAcopladoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateAcopladoMutation).toBeDefined();
    });

    it('should export useUpdateAcopladoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateAcopladoMutation).toBeDefined();
    });

    it('should export useDeleteAcopladoMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteAcopladoMutation).toBeDefined();
    });
  });

  describe('Endpoints de Dadores', () => {
    it('should export useGetDadoresQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDadoresQuery).toBeDefined();
    });

    it('should export useCreateDadorMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useCreateDadorMutation).toBeDefined();
    });

    it('should export useUpdateDadorMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateDadorMutation).toBeDefined();
    });

    it('should export useDeleteDadorMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useDeleteDadorMutation).toBeDefined();
    });
  });

  describe('Endpoints de Portal Cliente', () => {
    it('should export useGetPortalClienteEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalClienteEquiposQuery).toBeDefined();
    });

    it('should export useGetPortalClienteEquipoDetalleQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalClienteEquipoDetalleQuery).toBeDefined();
    });
  });

  describe('Endpoints de Portal Transportista', () => {
    it('should export useGetPortalTransportistaMisEntidadesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalTransportistaMisEntidadesQuery).toBeDefined();
    });

    it('should export useGetPortalTransportistaEquiposQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalTransportistaEquiposQuery).toBeDefined();
    });

    it('should export useGetPortalTransportistaDocumentosRechazadosQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalTransportistaDocumentosRechazadosQuery).toBeDefined();
    });

    it('should export useGetPortalTransportistaDocumentosPendientesQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetPortalTransportistaDocumentosPendientesQuery).toBeDefined();
    });
  });

  describe('Endpoints de Resubmit', () => {
    it('should export useResubmitDocumentMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useResubmitDocumentMutation).toBeDefined();
    });
  });

  describe('Endpoints de Defaults', () => {
    it('should export useGetDefaultsQuery hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useGetDefaultsQuery).toBeDefined();
    });

    it('should export useUpdateDefaultsMutation hook', async () => {
      const api = await import('../documentosApiSlice');
      expect(api.useUpdateDefaultsMutation).toBeDefined();
    });
  });
});
