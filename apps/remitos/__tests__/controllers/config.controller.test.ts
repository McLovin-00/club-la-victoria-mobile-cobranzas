/**
 * Tests reales para ConfigController
 * @jest-environment node
 */

import { createMockRes } from '../helpers/testUtils';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const ConfigServiceMock = {
  getFlowiseConfig: jest.fn(),
  updateFlowiseConfig: jest.fn(),
};
jest.mock('../../src/services/config.service', () => ({
  ConfigService: ConfigServiceMock,
}));

const FlowiseMock = {
  testConnection: jest.fn(),
};
jest.mock('../../src/services/flowise.service', () => ({
  FlowiseService: FlowiseMock,
}));

import { ConfigController } from '../../src/controllers/config.controller';

describe('ConfigController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getFlowiseConfig masks apiKey', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ apiKey: 'abcd1234', enabled: true });
    const req: any = { user: { userId: 1 } };
    const res = createMockRes();
    await ConfigController.getFlowiseConfig(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data.apiKey).toBe('***1234');
  });

  it('updateFlowiseConfig keeps apiKey when masked', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ apiKey: 'secret', enabled: true });
    const req: any = { user: { userId: 1 }, body: { apiKey: '***1234', enabled: true } };
    const res = createMockRes();
    await ConfigController.updateFlowiseConfig(req, res);
    expect(ConfigServiceMock.updateFlowiseConfig).toHaveBeenCalledWith(expect.objectContaining({ apiKey: undefined }), 1);
  });

  it('testFlowise returns result', async () => {
    FlowiseMock.testConnection.mockResolvedValue({ success: true, message: 'ok' });
    const req: any = { user: { userId: 1 } };
    const res = createMockRes();
    await ConfigController.testFlowise(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'ok' }));
  });
});


