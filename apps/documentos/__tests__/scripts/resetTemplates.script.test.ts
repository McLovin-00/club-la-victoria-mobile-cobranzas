/**
 * Tests for src/scripts/resetTemplates.ts
 * The script auto-executes on import, so we isolateModules and mock Prisma.
 */

const disconnectMock = jest.fn().mockResolvedValue(undefined);

const documentTemplateModel = {
  findFirst: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
};

const prismaClientCtorMock = jest.fn(() => ({
  documentTemplate: documentTemplateModel,
  $disconnect: disconnectMock,
}));

jest.mock('.prisma/documentos', () => ({
  PrismaClient: prismaClientCtorMock,
  EntityType: {
    EMPRESA_TRANSPORTISTA: 'EMPRESA_TRANSPORTISTA',
    CHOFER: 'CHOFER',
    CAMION: 'CAMION',
    ACOPLADO: 'ACOPLADO',
  },
}));

async function flushUntil(predicate: () => boolean, maxTicks = 30): Promise<void> {
  for (let i = 0; i < maxTicks; i++) {
    if (predicate()) return;
    // Let pending microtasks/then-chains run
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setImmediate(r));
  }
}

describe('resetTemplates script', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.exitCode = 0;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();
    process.exitCode = originalExitCode;
  });

  it('should upsert templates (mix of update/create) and deactivate non-canonical actives', async () => {
    // First desired template exists -> update, others -> create
    documentTemplateModel.findFirst
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValue(null);

    // all existing templates includes one non-canonical active
    documentTemplateModel.findMany
      .mockResolvedValueOnce([{ id: 999, entityType: 'CHOFER', name: 'OTRA', active: true }]) // all
      .mockResolvedValueOnce([{ id: 1, entityType: 'CHOFER', name: 'DNI', active: true }]); // finalList

    await jest.isolateModulesAsync(async () => {
      await import('../../src/scripts/resetTemplates');
    });
    await flushUntil(() => disconnectMock.mock.calls.length > 0);

    expect(prismaClientCtorMock).toHaveBeenCalled();
    expect(documentTemplateModel.update).toHaveBeenCalled(); // existing + deactivate
    expect(documentTemplateModel.create).toHaveBeenCalled(); // non-existing desired templates
    expect(disconnectMock).toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('should not deactivate when there are no non-canonical active templates', async () => {
    documentTemplateModel.findFirst.mockResolvedValue(null);
    documentTemplateModel.findMany
      .mockResolvedValueOnce([{ id: 1, entityType: 'CHOFER', name: 'DNI', active: false }]) // all (inactive -> not deactivated)
      .mockResolvedValueOnce([]); // finalList

    await jest.isolateModulesAsync(async () => {
      await import('../../src/scripts/resetTemplates');
    });
    await flushUntil(() => disconnectMock.mock.calls.length > 0);

    // update called only from upserts, not from deactivate loop (since active:false)
    expect(documentTemplateModel.findMany).toHaveBeenCalledTimes(2);
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should set exitCode=1 on error and still disconnect', async () => {
    documentTemplateModel.findFirst.mockResolvedValue(null);
    documentTemplateModel.create.mockRejectedValue(new Error('boom'));

    await jest.isolateModulesAsync(async () => {
      await import('../../src/scripts/resetTemplates');
    });
    await flushUntil(() => disconnectMock.mock.calls.length > 0);

    expect(process.exitCode).toBe(1);
    expect(disconnectMock).toHaveBeenCalled();
  });
});


