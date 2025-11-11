const { NotificationsController } = require('../src/controllers/notifications.controller');

jest.mock('../src/services/notification.service', () => ({
  NotificationService: {
    checkExpirations: jest.fn().mockResolvedValue(3),
    checkMissingDocs: jest.fn().mockResolvedValue(2),
  },
}));

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('NotificationsController run jobs', () => {
  it('runExpirations returns count', async () => {
    const req = { tenantId: 1 };
    const res = mockRes();
    await NotificationsController.runExpirations(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, sent: 3 });
  });
  it('runMissing returns count', async () => {
    const req = { tenantId: 1 };
    const res = mockRes();
    await NotificationsController.runMissing(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, sent: 2 });
  });
});


