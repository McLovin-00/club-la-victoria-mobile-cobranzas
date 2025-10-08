jest.mock('ioredis', () => ({ Redis: class { quit() { return Promise.resolve(); } } }));

const { getNotificationsWorker } = require('../dist/workers/notifications.worker');

jest.mock('../dist/services/notification.service', () => ({
  NotificationService: { checkMissingForEquipo: jest.fn().mockResolvedValue(0) }
}));

describe('NotificationsWorker', () => {
  it('module exposes worker factory', () => {
    const w = getNotificationsWorker();
    expect(w).toBeDefined();
  });
});
