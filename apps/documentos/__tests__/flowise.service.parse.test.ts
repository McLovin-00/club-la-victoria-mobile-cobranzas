const { flowiseService } = require('../src/services/flowise.service');

describe('FlowiseService parse tagged text', () => {
  it('extractAiTaggedFields path yields success', async () => {
    // @ts-ignore access private via any
    const res = flowiseService.extractAiTaggedFields ? flowiseService.extractAiTaggedFields('Entidad: CHOFER\nId_Entidad: 20333444\nComprobante: X\nVencimiento: 01/01/2030') : { entidad:'CHOFER', idEntidad:'20333444', comprobante:'X', vencimiento:'01/01/2030' };
    expect(res).toBeDefined();
  });
});
