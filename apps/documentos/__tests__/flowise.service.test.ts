jest.mock('axios', () => ({ post: jest.fn().mockRejectedValue(new Error('down')) }));
const { flowiseService } = require('../src/services/flowise.service');

describe('FlowiseService', () => {
  it('validateDocument returns invalid when Flowise down', async () => {
    const res = await flowiseService.validateDocument('http://file', 'Licencia', 'CHOFER');
    expect(res.isValid).toBe(false);
  });
});
