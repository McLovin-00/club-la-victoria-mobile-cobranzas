const { TemplatesController } = require('../src/controllers/templates.controller');

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      documentTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id:1, name:'Licencia', entityType:'CHOFER', active:true }),
        findUnique: jest.fn().mockResolvedValue({ id:1, name:'Licencia', entityType:'CHOFER', active:true, documents:[], clientRequirements:[] }),
        delete: jest.fn().mockResolvedValue({}),
      },
    }),
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('TemplatesController', () => {
  it('createTemplate ok', async () => {
    const req: any = { body: { name:'Licencia', entityType:'CHOFER' }, user: { userId: 1 } };
    const res = mockRes();
    await TemplatesController.createTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deleteTemplate ok', async () => {
    const req: any = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await TemplatesController.deleteTemplate(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
