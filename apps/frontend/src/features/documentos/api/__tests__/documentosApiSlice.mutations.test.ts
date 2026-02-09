// Tests de mutation endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Mutation Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Document mutations
  it('exports useUploadDocumentMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUploadDocumentMutation).toBeDefined();
  });

  it('exports useDeleteDocumentMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteDocumentMutation).toBeDefined();
  });

  // Template mutations
  it('exports useCreateTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateTemplateMutation).toBeDefined();
  });

  it('exports useUpdateTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateTemplateMutation).toBeDefined();
  });

  it('exports useDeleteTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteTemplateMutation).toBeDefined();
  });

  // Client mutations
  it('exports useCreateClientMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateClientMutation).toBeDefined();
  });

  it('exports useUpdateClientMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateClientMutation).toBeDefined();
  });

  it('exports useDeleteClientMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteClientMutation).toBeDefined();
  });

  it('exports useAddClientRequirementMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useAddClientRequirementMutation).toBeDefined();
  });

  it('exports useRemoveClientRequirementMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRemoveClientRequirementMutation).toBeDefined();
  });

  // Equipment mutations
  it('exports useCreateEquipoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEquipoMutation).toBeDefined();
  });

  it('exports useCreateEquipoCompletoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEquipoCompletoMutation).toBeDefined();
  });

  it('exports useRollbackEquipoCompletoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRollbackEquipoCompletoMutation).toBeDefined();
  });

  it('exports useUpdateEquipoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateEquipoMutation).toBeDefined();
  });

  it('exports useDeleteEquipoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteEquipoMutation).toBeDefined();
  });

  it('exports useAssociateEquipoClienteMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useAssociateEquipoClienteMutation).toBeDefined();
  });

  it('exports useRemoveEquipoClienteMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRemoveEquipoClienteMutation).toBeDefined();
  });

  it('exports useCreateEquipoMinimalMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEquipoMinimalMutation).toBeDefined();
  });

  // Search and bulk operations
  it('exports useBulkSearchPlatesMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useBulkSearchPlatesMutation).toBeDefined();
  });

  it('exports useRequestClientsBulkZipMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRequestClientsBulkZipMutation).toBeDefined();
  });

  it('exports useTransportistasSearchMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useTransportistasSearchMutation).toBeDefined();
  });

  it('exports useSearchEquiposByDnisMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useSearchEquiposByDnisMutation).toBeDefined();
  });

  it('exports useDownloadVigentesBulkMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDownloadVigentesBulkMutation).toBeDefined();
  });

  // Dador mutations
  it('exports useCreateDadorMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateDadorMutation).toBeDefined();
  });

  it('exports useUpdateDadorMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateDadorMutation).toBeDefined();
  });

  it('exports useDeleteDadorMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteDadorMutation).toBeDefined();
  });

  // Maestro mutations
  it('exports useCreateChoferMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateChoferMutation).toBeDefined();
  });

  it('exports useUpdateChoferMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateChoferMutation).toBeDefined();
  });

  it('exports useDeleteChoferMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteChoferMutation).toBeDefined();
  });

  it('exports useCreateCamionMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateCamionMutation).toBeDefined();
  });

  it('exports useUpdateCamionMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateCamionMutation).toBeDefined();
  });

  it('exports useDeleteCamionMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteCamionMutation).toBeDefined();
  });

  it('exports useCreateAcopladoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateAcopladoMutation).toBeDefined();
  });

  it('exports useUpdateAcopladoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateAcopladoMutation).toBeDefined();
  });

  it('exports useDeleteAcopladoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteAcopladoMutation).toBeDefined();
  });

  // Batch job mutations
  it('exports useImportCsvEquiposMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useImportCsvEquiposMutation).toBeDefined();
  });

  it('exports useUploadBatchDocsDadorMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUploadBatchDocsDadorMutation).toBeDefined();
  });

  it('exports useUploadBatchDocsTransportistasMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUploadBatchDocsTransportistasMutation).toBeDefined();
  });

  it('exports useUpdateDefaultsMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateDefaultsMutation).toBeDefined();
  });

  // Approval mutations
  it('exports useApprovePendingDocumentMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useApprovePendingDocumentMutation).toBeDefined();
  });

  it('exports useRejectPendingDocumentMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRejectPendingDocumentMutation).toBeDefined();
  });

  it('exports useRecheckDocumentWithAIMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRecheckDocumentWithAIMutation).toBeDefined();
  });

  it('exports useBatchApproveDocumentsMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useBatchApproveDocumentsMutation).toBeDefined();
  });

  // Empresa transportista mutations
  it('exports useCreateEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEmpresaTransportistaMutation).toBeDefined();
  });

  it('exports useUpdateEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateEmpresaTransportistaMutation).toBeDefined();
  });

  it('exports useDeleteEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteEmpresaTransportistaMutation).toBeDefined();
  });

  // Equipment attach/detach
  it('exports useAttachEquipoComponentsMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useAttachEquipoComponentsMutation).toBeDefined();
  });

  it('exports useDetachEquipoComponentsMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDetachEquipoComponentsMutation).toBeDefined();
  });

  // Equipment edition mutations
  it('exports useUpdateEquipoEntidadesMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateEquipoEntidadesMutation).toBeDefined();
  });

  it('exports useAddEquipoClienteMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useAddEquipoClienteMutation).toBeDefined();
  });

  it('exports useRemoveEquipoClienteWithArchiveMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRemoveEquipoClienteWithArchiveMutation).toBeDefined();
  });

  it('exports useTransferirEquipoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useTransferirEquipoMutation).toBeDefined();
  });

  it('exports useToggleEquipoActivoMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useToggleEquipoActivoMutation).toBeDefined();
  });

  // Resubmit document
  it('exports useResubmitDocumentMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useResubmitDocumentMutation).toBeDefined();
  });

  // Extracted data mutations
  it('exports useUpdateEntityExtractedDataMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateEntityExtractedDataMutation).toBeDefined();
  });

  it('exports useDeleteEntityExtractedDataMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteEntityExtractedDataMutation).toBeDefined();
  });

  // Notification mutations
  it('exports useMarkNotificationAsReadMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useMarkNotificationAsReadMutation).toBeDefined();
  });

  it('exports useMarkAllNotificationsAsReadMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useMarkAllNotificationsAsReadMutation).toBeDefined();
  });

  it('exports useDeleteNotificationMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteNotificationMutation).toBeDefined();
  });

  it('exports useDeleteAllReadNotificationsMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteAllReadNotificationsMutation).toBeDefined();
  });

  // Verify endpoint existence
  it('verify uploadDocument endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.uploadDocument).toBeDefined();
  });

  it('verify deleteDocument endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.deleteDocument).toBeDefined();
  });

  it('verify createTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.createTemplate).toBeDefined();
  });

  it('verify updateTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.updateTemplate).toBeDefined();
  });

  it('verify deleteTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.deleteTemplate).toBeDefined();
  });

  it('verify approvePendingDocument endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.approvePendingDocument).toBeDefined();
  });

  it('verify rejectPendingDocument endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.rejectPendingDocument).toBeDefined();
  });

  it('verify resubmitDocument endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.resubmitDocument).toBeDefined();
  });

  it('verify uploadBatchDocsTransportistas endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.uploadBatchDocsTransportistas).toBeDefined();
  });

  it('verify bulkSearchPlates endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.bulkSearchPlates).toBeDefined();
  });

  it('verify transportistasSearch endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.transportistasSearch).toBeDefined();
  });

  it('verify createEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.createEmpresaTransportista).toBeDefined();
  });

  it('verify updateEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.updateEmpresaTransportista).toBeDefined();
  });

  it('verify deleteEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.deleteEmpresaTransportista).toBeDefined();
  });
});
