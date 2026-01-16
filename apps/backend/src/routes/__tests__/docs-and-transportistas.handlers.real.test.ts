/**
 * Ejecuta handlers de rutas grandes (docs/transportistas/openapi) para subir cobertura sin supertest.
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandler } from '../../__tests__/helpers/routerTestUtils';

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('docs/transportistas/openapi route handlers (real)', () => {
  it('openapi routes serve 200 and 404 based on fs.existsSync', async () => {
    jest.resetModules();
    jest.doMock('fs', () => ({
      existsSync: jest.fn((p: string) => p.endsWith('openapi.yaml')),
      readFileSync: jest.fn(() => 'yaml'),
    }));
    const router = (await import('../openapi.routes')).default;

    const res0: any = { ...createMockRes(), type: jest.fn().mockReturnThis() };
    await getRouteHandler(router, 'get', '/')({} as any, res0);
    expect(res0.json).toHaveBeenCalled();

    const res1: any = { ...createMockRes(), type: jest.fn().mockReturnThis() };
    await getRouteHandler(router, 'get', '/openapi.yaml')({} as any, res1);
    expect(res1.send).toHaveBeenCalledWith('yaml');

    const res2: any = { ...createMockRes(), type: jest.fn().mockReturnThis() };
    await getRouteHandler(router, 'get', '/openapi.json')({} as any, res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('docs.routes basic endpoints execute', async () => {
    jest.resetModules();
    const router = (await import('../docs.routes')).default;

    // GET defaults
    const res0 = createMockRes();
    await getRouteHandler(router, 'get', '/defaults')({} as any, res0);
    expect(res0.json).toHaveBeenCalled();

    // PUT defaults
    const res1 = createMockRes();
    await getRouteHandler(router, 'put', '/defaults')({ body: { defaultClienteId: 2 } } as any, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // GET dadores?activo=true
    const res2 = createMockRes();
    await getRouteHandler(router, 'get', '/dadores')({ query: { activo: 'true' } } as any, res2);
    expect(res2.json).toHaveBeenCalled();

    // PUT dadores/:id not found
    const res3 = createMockRes();
    await getRouteHandler(router, 'put', '/dadores/:id')({ params: { id: '999' }, body: {} } as any, res3);
    expect(res3.status).toHaveBeenCalledWith(404);

    // POST clients/:clienteId/requirements
    const res4 = createMockRes();
    await getRouteHandler(router, 'post', '/clients/:clienteId/requirements')({ params: { clienteId: '1' }, body: { templateId: 1, entityType: 'CHOFER' } } as any, res4);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('docs.routes covers CRUD paths for dadores/clients/equipos/requirements', async () => {
    jest.resetModules();
    const router = (await import('../docs.routes')).default;

    // POST dadores
    const res1 = createMockRes();
    await getRouteHandler(router, 'post', '/dadores')({ body: { razonSocial: 'X', cuit: '30', activo: true } } as any, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const createdDadorId = (res1.json as any).mock.calls[0][0].data.id;

    // PUT dadores/:id success
    const res2 = createMockRes();
    await getRouteHandler(router, 'put', '/dadores/:id')({ params: { id: String(createdDadorId) }, body: { notas: 'n' } } as any, res2);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // DELETE dadores/:id
    const res3 = createMockRes();
    await getRouteHandler(router, 'delete', '/dadores/:id')({ params: { id: String(createdDadorId) } } as any, res3);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // clients list + create + update/delete
    const res4 = createMockRes();
    await getRouteHandler(router, 'get', '/clients')({ query: { activo: 'true' } } as any, res4);
    expect(res4.json).toHaveBeenCalled();

    const res5 = createMockRes();
    await getRouteHandler(router, 'post', '/clients')({ body: { razonSocial: 'C', cuit: '30' } } as any, res5);
    const createdClientId = (res5.json as any).mock.calls[0][0].data.id;

    const res6 = createMockRes();
    await getRouteHandler(router, 'put', '/clients/:id')({ params: { id: String(createdClientId) }, body: { notas: 'x' } } as any, res6);
    expect(res6.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res7 = createMockRes();
    await getRouteHandler(router, 'put', '/clients/:id')({ params: { id: '999999' }, body: {} } as any, res7);
    expect(res7.status).toHaveBeenCalledWith(404);

    const res8 = createMockRes();
    await getRouteHandler(router, 'delete', '/clients/:id')({ params: { id: String(createdClientId) } } as any, res8);
    expect(res8.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // equipos handlers
    const res9 = createMockRes();
    await getRouteHandler(router, 'get', '/equipos')({ query: { dadorCargaId: '1' } } as any, res9);
    expect(res9.json).toHaveBeenCalled();

    const res10 = createMockRes();
    await getRouteHandler(router, 'post', '/equipos/:id/check-missing-now')({ params: { id: '101' } } as any, res10);
    expect(res10.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res11 = createMockRes();
    await getRouteHandler(router, 'post', '/equipos/:id/request-missing')({ params: { id: '101' } } as any, res11);
    expect(res11.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res12: any = { ...createMockRes(), setHeader: jest.fn() };
    await getRouteHandler(router, 'get', '/clients/equipos/:id/zip')({ params: { id: '101' } } as any, res12);
    expect(res12.setHeader).toHaveBeenCalled();
    expect(res12.send).toHaveBeenCalled();

    // requirements list + delete
    const res13 = createMockRes();
    await getRouteHandler(router, 'get', '/clients/:clienteId/requirements')({ params: { clienteId: '1' } } as any, res13);
    expect(res13.json).toHaveBeenCalled();

    const res14 = createMockRes();
    await getRouteHandler(router, 'delete', '/clients/:clienteId/requirements/:requirementId')({ params: { clienteId: '1', requirementId: '11' } } as any, res14);
    expect(res14.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // equipos por cliente
    const res15 = createMockRes();
    await getRouteHandler(router, 'get', '/clients/:clienteId/equipos')({ params: { clienteId: '1' } } as any, res15);
    expect(res15.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('transportistas routes execute', async () => {
    const router = (await import('../transportistas')).default;

    const res1 = createMockRes();
    await getRouteHandler(router, 'get', '/dashboard-stats')({} as any, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = createMockRes();
    await getRouteHandler(router, 'get', '/alertas-urgentes')({} as any, res2);
    expect(res2.json).toHaveBeenCalled();

    const res3 = createMockRes();
    await getRouteHandler(router, 'post', '/avatar')({ body: { file: 'x' } } as any, res3);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res4 = createMockRes();
    await getRouteHandler(router, 'get', '/preferences')({} as any, res4);
    expect(res4.json).toHaveBeenCalled();
  });

  it('transportistas additional endpoints execute', async () => {
    const router = (await import('../transportistas')).default;

    const res1 = createMockRes();
    await getRouteHandler(router, 'get', '/mis-equipos')({} as any, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = createMockRes();
    await getRouteHandler(router, 'get', '/calendar-events')({} as any, res2);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res3 = createMockRes();
    await getRouteHandler(router, 'get', '/profile')({} as any, res3);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});


