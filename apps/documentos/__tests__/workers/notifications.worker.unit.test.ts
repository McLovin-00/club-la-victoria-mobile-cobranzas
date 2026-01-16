describe('notifications.worker', () => {
  it('creates a singleton Worker and processes verify-missing-equipo', async () => {
    let processor: any;
    const workerCtor = jest.fn((_name: string, proc: any) => {
      processor = proc;
      return { on: jest.fn(), close: jest.fn() };
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('bullmq', () => ({ Worker: workerCtor }));
      jest.doMock('ioredis', () => ({ Redis: jest.fn(() => ({ quit: jest.fn() })) }));
      jest.doMock('../../src/config/environment', () => ({ getEnvironment: () => ({ REDIS_URL: 'redis://x' }) }));
      const checkMissingForEquipo = jest.fn(async () => 3);
      jest.doMock('../../src/services/notification.service', () => ({ NotificationService: { checkMissingForEquipo } }));
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      }));

      const mod = await import('../../src/workers/notifications.worker');
      const w1 = mod.getNotificationsWorker();
      const w2 = mod.getNotificationsWorker();
      expect(w2).toBe(w1);
      expect(workerCtor).toHaveBeenCalledWith(
        'compliance-checks',
        expect.any(Function),
        expect.objectContaining({ connection: expect.any(Object) })
      );

      // Processor handles expected job
      await processor({ data: { type: 'verify-missing-equipo', tenantId: 1, equipoId: 2 } });
      expect(checkMissingForEquipo).toHaveBeenCalledWith(1, 2);

      // Other type => no crash
      await processor({ data: { type: 'other', tenantId: 1, equipoId: 2 } });
    });
  });

  it('rethrows on processing error', async () => {
    let processor: any;
    const workerCtor = jest.fn((_name: string, proc: any) => {
      processor = proc;
      return { on: jest.fn(), close: jest.fn() };
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('bullmq', () => ({ Worker: workerCtor }));
      jest.doMock('ioredis', () => ({ Redis: jest.fn(() => ({ quit: jest.fn() })) }));
      jest.doMock('../../src/config/environment', () => ({ getEnvironment: () => ({ REDIS_URL: 'redis://x' }) }));
      const checkMissingForEquipo = jest.fn(async () => {
        throw new Error('boom');
      });
      jest.doMock('../../src/services/notification.service', () => ({ NotificationService: { checkMissingForEquipo } }));
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      }));

      const mod = await import('../../src/workers/notifications.worker');
      mod.getNotificationsWorker();

      await expect(processor({ data: { type: 'verify-missing-equipo', tenantId: 1, equipoId: 2 } })).rejects.toThrow('boom');
    });
  });
});


