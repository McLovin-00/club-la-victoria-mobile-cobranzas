const { TemplatesController } = require('../src/controllers/templates.controller');

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      documentTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id:1, name:'Old', entityType:'CHOFER' }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id:1, name:'New', entityType:'CHOFER', active:true })
      },
    }),
  },
}));

function mockRes() { const res: any = {}; res.status = jest.fn().mockReturnValue(res); res.json = jest.fn().mockReturnValue(res); return res; }

describe('TemplatesController.update', () => {
  it('updates template', async () => {
    const req: any = { params: { id:'1' }, body: { name:'New', active:true }, user: { userId:1 } };
    const res = mockRes();
    await TemplatesController.updateTemplate(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
