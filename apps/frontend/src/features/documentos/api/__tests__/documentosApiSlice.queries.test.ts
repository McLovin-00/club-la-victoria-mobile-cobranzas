// Tests de query endpoints sin cobertura completa en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Query Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useGetDocumentsByEmpresaQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetDocumentsByEmpresaQuery).toBeDefined();
  });

  it('exports useGetDocumentosPorEquipoQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetDocumentosPorEquipoQuery).toBeDefined();
  });

  it('exports useDownloadDocumentoQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDownloadDocumentoQuery).toBeDefined();
  });

  it('exports useGetJobStatusQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetJobStatusQuery).toBeDefined();
  });

  it('exports useLazyGetJobStatusQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetJobStatusQuery).toBeDefined();
  });

  it('exports useGetClientsZipJobQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetClientsZipJobQuery).toBeDefined();
  });

  it('exports useLazyGetClientsZipJobQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetClientsZipJobQuery).toBeDefined();
  });

  it('exports useGetMisEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetMisEquiposQuery).toBeDefined();
  });

  it('exports useGetClienteEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetClienteEquiposQuery).toBeDefined();
  });

  it('exports useGetEquipoHistoryQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoHistoryQuery).toBeDefined();
  });

  it('exports useGetEquipoRequisitosQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoRequisitosQuery).toBeDefined();
  });

  it('exports useGetEquipoAuditHistoryQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoAuditHistoryQuery).toBeDefined();
  });

  it('exports useGetConsolidatedTemplatesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetConsolidatedTemplatesQuery).toBeDefined();
  });

  it('exports useLazyGetConsolidatedTemplatesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetConsolidatedTemplatesQuery).toBeDefined();
  });

  it('exports useLazyCheckMissingDocsForClientQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyCheckMissingDocsForClientQuery).toBeDefined();
  });

  it('exports useCheckMissingDocsForClientQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCheckMissingDocsForClientQuery).toBeDefined();
  });

  it('exports useGetDefaultsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetDefaultsQuery).toBeDefined();
  });

  it('exports useLazySearchEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazySearchEquiposQuery).toBeDefined();
  });

  it('exports useSearchEquiposPagedQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useSearchEquiposPagedQuery).toBeDefined();
  });

  it('exports useLazySearchEquiposPagedQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazySearchEquiposPagedQuery).toBeDefined();
  });

  it('exports useGetApprovalPendingByIdQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetApprovalPendingByIdQuery).toBeDefined();
  });

  it('exports useGetApprovalStatsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetApprovalStatsQuery).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaByIdQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaByIdQuery).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaChoferesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaChoferesQuery).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaEquiposQuery).toBeDefined();
  });

  it('exports useGetAuditLogsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetAuditLogsQuery).toBeDefined();
  });

  it('exports useGetPortalClienteEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalClienteEquiposQuery).toBeDefined();
  });

  it('exports useGetPortalClienteEquipoDetalleQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalClienteEquipoDetalleQuery).toBeDefined();
  });

  it('exports useGetPortalTransportistaMisEntidadesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalTransportistaMisEntidadesQuery).toBeDefined();
  });

  it('exports useGetPortalTransportistaEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalTransportistaEquiposQuery).toBeDefined();
  });

  it('exports useGetPortalTransportistaDocumentosRechazadosQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalTransportistaDocumentosRechazadosQuery).toBeDefined();
  });

  it('exports useGetPortalTransportistaDocumentosPendientesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPortalTransportistaDocumentosPendientesQuery).toBeDefined();
  });

  it('exports useGetStatsPorRolQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetStatsPorRolQuery).toBeDefined();
  });

  it('exports useGetExtractedDataListQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetExtractedDataListQuery).toBeDefined();
  });

  it('exports useGetEntityExtractedDataQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEntityExtractedDataQuery).toBeDefined();
  });

  it('exports useGetEntityExtractionHistoryQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEntityExtractionHistoryQuery).toBeDefined();
  });

  it('exports useGetUserNotificationsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetUserNotificationsQuery).toBeDefined();
  });

  it('exports useGetUnreadNotificationsCountQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetUnreadNotificationsCountQuery).toBeDefined();
  });

  it('exports useGetRejectedDocumentsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetRejectedDocumentsQuery).toBeDefined();
  });

  it('exports useGetRejectedStatsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetRejectedStatsQuery).toBeDefined();
  });

  it('exports useLazyGetEquipoComplianceQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetEquipoComplianceQuery).toBeDefined();
  });

  it('exports useGetChoferByIdQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetChoferByIdQuery).toBeDefined();
  });

  it('exports useGetEquipoByIdQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoByIdQuery).toBeDefined();
  });

  it('exports useGetPendingSummaryQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetPendingSummaryQuery).toBeDefined();
  });

  it('exports useGetApprovalKpisQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetApprovalKpisQuery).toBeDefined();
  });

  it('verify getDocumentsByEmpresa endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDocumentsByEmpresa).toBeDefined();
  });

  it('verify getDocumentosPorEquipo endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDocumentosPorEquipo).toBeDefined();
  });

  it('verify downloadDocumento endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.downloadDocumento).toBeDefined();
  });

  it('verify getJobStatus endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getJobStatus).toBeDefined();
  });

  it('verify getClientsZipJob endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getClientsZipJob).toBeDefined();
  });

  it('verify getMisEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getMisEquipos).toBeDefined();
  });

  it('verify getClienteEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getClienteEquipos).toBeDefined();
  });

  it('verify getEquipoHistory endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEquipoHistory).toBeDefined();
  });

  it('verify getEquipoRequisitos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEquipoRequisitos).toBeDefined();
  });

  it('verify getEquipoAuditHistory endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEquipoAuditHistory).toBeDefined();
  });

  it('verify getConsolidatedTemplates endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getConsolidatedTemplates).toBeDefined();
  });

  it('verify checkMissingDocsForClient endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.checkMissingDocsForClient).toBeDefined();
  });

  it('verify getDefaults endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDefaults).toBeDefined();
  });

  it('verify searchEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.searchEquipos).toBeDefined();
  });

  it('verify searchEquiposPaged endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.searchEquiposPaged).toBeDefined();
  });

  it('verify getApprovalPendingById endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getApprovalPendingById).toBeDefined();
  });

  it('verify getApprovalStats endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getApprovalStats).toBeDefined();
  });

  it('verify getEmpresaTransportistaById endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaById).toBeDefined();
  });

  it('verify getEmpresaTransportistaChoferes endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaChoferes).toBeDefined();
  });

  it('verify getEmpresaTransportistaEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaEquipos).toBeDefined();
  });

  it('verify getAuditLogs endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getAuditLogs).toBeDefined();
  });

  it('verify getPortalClienteEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalClienteEquipos).toBeDefined();
  });

  it('verify getPortalClienteEquipoDetalle endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalClienteEquipoDetalle).toBeDefined();
  });

  it('verify getPortalTransportistaMisEntidades endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalTransportistaMisEntidades).toBeDefined();
  });

  it('verify getPortalTransportistaEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalTransportistaEquipos).toBeDefined();
  });

  it('verify getPortalTransportistaDocumentosRechazados endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalTransportistaDocumentosRechazados).toBeDefined();
  });

  it('verify getPortalTransportistaDocumentosPendientes endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPortalTransportistaDocumentosPendientes).toBeDefined();
  });

  it('verify getStatsPorRol endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getStatsPorRol).toBeDefined();
  });

  it('verify getExtractedDataList endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getExtractedDataList).toBeDefined();
  });

  it('verify getEntityExtractedData endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEntityExtractedData).toBeDefined();
  });

  it('verify getEntityExtractionHistory endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEntityExtractionHistory).toBeDefined();
  });

  it('verify getUserNotifications endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getUserNotifications).toBeDefined();
  });

  it('verify getUnreadNotificationsCount endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getUnreadNotificationsCount).toBeDefined();
  });

  it('verify getRejectedDocuments endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getRejectedDocuments).toBeDefined();
  });

  it('verify getRejectedStats endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getRejectedStats).toBeDefined();
  });

  it('verify getEquipoCompliance endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEquipoCompliance).toBeDefined();
  });

  it('verify getChoferById endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getChoferById).toBeDefined();
  });

  it('verify getEquipoById endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEquipoById).toBeDefined();
  });

  it('verify getPendingSummary endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getPendingSummary).toBeDefined();
  });

  it('verify getApprovalKpis endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getApprovalKpis).toBeDefined();
  });
});
