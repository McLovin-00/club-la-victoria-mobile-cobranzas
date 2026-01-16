import type { Request, Response, Router } from 'express';

const noopMiddleware = (_req: Request, _res: Response, next: () => void) => next();

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: noopMiddleware,
  authorize: () => noopMiddleware,
  validate: () => noopMiddleware,
  tenantResolver: noopMiddleware,
  authorizeEmpresa: noopMiddleware,
}));

jest.mock('../../src/middlewares/rateLimiter.middleware', () => ({
  generalRateLimit: noopMiddleware,
  configRateLimit: noopMiddleware,
  uploadRateLimit: noopMiddleware,
}));

jest.mock('../../src/controllers/config.controller', () => ({
  ConfigController: {
    getEmpresaConfig: jest.fn(),
    updateEmpresaConfig: jest.fn(),
    getEmpresaStatus: jest.fn(),
  },
}));

jest.mock('../../src/controllers/compliance.controller', () => ({
  ComplianceController: { getEquipoCompliance: jest.fn() },
}));

jest.mock('../../src/controllers/dashboard.controller', () => ({
  DashboardController: {
    getEquipoKpis: jest.fn(),
    getSemaforosView: jest.fn(),
    getGlobalStats: jest.fn(),
    getPendingSummary: jest.fn(),
    getAlertsView: jest.fn(),
    getFrontendConfig: jest.fn(),
    getApprovalKpis: jest.fn(),
    getStatsPorRol: jest.fn(),
  },
}));

jest.mock('../../src/controllers/defaults.controller', () => ({
  DefaultsController: { get: jest.fn(), update: jest.fn() },
}));

jest.mock('../../src/controllers/dadores.controller', () => ({
  DadoresController: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateNotifications: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../src/controllers/maestros.controller', () => ({
  MaestrosController: {
    listEmpresas: jest.fn(),
    createEmpresa: jest.fn(),
    updateEmpresa: jest.fn(),
    deleteEmpresa: jest.fn(),
    listChoferes: jest.fn(),
    getChoferById: jest.fn(),
    createChofer: jest.fn(),
    updateChofer: jest.fn(),
    deleteChofer: jest.fn(),
    listCamiones: jest.fn(),
    createCamion: jest.fn(),
    updateCamion: jest.fn(),
    deleteCamion: jest.fn(),
    listAcoplados: jest.fn(),
    createAcoplado: jest.fn(),
    updateAcoplado: jest.fn(),
    deleteAcoplado: jest.fn(),
  },
}));

jest.mock('../../src/controllers/notifications.controller', () => ({
  NotificationsController: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    test: jest.fn(),
    runExpirations: jest.fn(),
    runMissing: jest.fn(),
  },
}));

jest.mock('../../src/controllers/search.controller', () => ({
  SearchController: { search: jest.fn() },
}));

jest.mock('../../src/controllers/storage.controller', () => ({
  StorageController: { initTenantBucket: jest.fn() },
}));

jest.mock('../../src/controllers/templates.controller', () => ({
  TemplatesController: {
    getTemplates: jest.fn(),
    getTemplateById: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
  },
}));

jest.mock('../../src/controllers/empresas-transportistas.controller', () => ({
  EmpresasTransportistasController: {
    list: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getChoferes: jest.fn(),
    getEquipos: jest.fn(),
  },
}));

jest.mock('../../src/controllers/entity-data.controller', () => ({
  EntityDataController: {
    listExtractedData: jest.fn(),
    getExtractedData: jest.fn(),
    updateExtractedData: jest.fn(),
    deleteExtractedData: jest.fn(),
    getExtractionHistory: jest.fn(),
  },
}));

jest.mock('../../src/controllers/flowise-config.controller', () => ({
  FlowiseConfigController: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    testConnection: jest.fn(),
    getStatus: jest.fn(),
  },
}));

jest.mock('../../src/controllers/evolution-config.controller', () => ({
  EvolutionConfigController: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    testConnection: jest.fn(),
  },
}));

jest.mock('../../src/controllers/portal-cliente.controller', () => ({
  PortalClienteController: {
    bulkDownloadForm: jest.fn(),
    getEquiposAsignados: jest.fn(),
    getEquipoDetalle: jest.fn(),
    downloadDocumento: jest.fn(),
    downloadAllDocumentos: jest.fn(),
    bulkDownloadDocumentos: jest.fn(),
  },
}));

jest.mock('../../src/controllers/portal-transportista.controller', () => ({
  PortalTransportistaController: {
    getMisEntidades: jest.fn(),
    getMisEquipos: jest.fn(),
    getDocumentosRechazados: jest.fn(),
    getDocumentosPendientes: jest.fn(),
  },
}));

import configRouter from '../../src/routes/config.routes';
import complianceRouter from '../../src/routes/compliance.routes';
import dashboardRouter from '../../src/routes/dashboard.routes';
import defaultsRouter from '../../src/routes/defaults.routes';
import dadoresRouter from '../../src/routes/dadores.routes';
import maestrosRouter from '../../src/routes/maestros.routes';
import notificationsRouter from '../../src/routes/notifications.routes';
import searchRouter from '../../src/routes/search.routes';
import storageRouter from '../../src/routes/storage.routes';
import templatesRouter from '../../src/routes/templates.routes';
import empresasTransportistasRouter from '../../src/routes/empresas-transportistas.routes';
import entityDataRouter from '../../src/routes/entity-data.routes';
import flowiseConfigRouter from '../../src/routes/flowise-config.routes';
import evolutionConfigRouter from '../../src/routes/evolution-config.routes';
import portalClienteRouter from '../../src/routes/portal-cliente.routes';
import portalTransportistaRouter from '../../src/routes/portal-transportista.routes';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
  };
};

const hasRoute = (router: Router, method: HttpMethod, path: string): boolean => {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  return stack.some((layer) => layer.route?.path === path && layer.route?.methods?.[method]);
};

describe('simple routes wiring', () => {
  it('config routes expose endpoints', () => {
    expect(hasRoute(configRouter, 'get', '/:dadorId')).toBe(true);
    expect(hasRoute(configRouter, 'post', '/:dadorId')).toBe(true);
    expect(hasRoute(configRouter, 'get', '/:dadorId/status')).toBe(true);
  });

  it('compliance routes expose endpoints', () => {
    expect(hasRoute(complianceRouter, 'get', '/equipos/:id')).toBe(true);
  });

  it('dashboard routes expose endpoints', () => {
    expect(hasRoute(dashboardRouter, 'get', '/equipo-kpis')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/semaforos')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/stats')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/pending/summary')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/alerts')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/config')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/approval-kpis')).toBe(true);
    expect(hasRoute(dashboardRouter, 'get', '/stats-por-rol')).toBe(true);
  });

  it('defaults routes expose endpoints', () => {
    expect(hasRoute(defaultsRouter, 'get', '/')).toBe(true);
    expect(hasRoute(defaultsRouter, 'put', '/')).toBe(true);
  });

  it('dadores routes expose endpoints', () => {
    expect(hasRoute(dadoresRouter, 'get', '/')).toBe(true);
    expect(hasRoute(dadoresRouter, 'post', '/')).toBe(true);
    expect(hasRoute(dadoresRouter, 'put', '/:id')).toBe(true);
    expect(hasRoute(dadoresRouter, 'put', '/:id/notifications')).toBe(true);
    expect(hasRoute(dadoresRouter, 'delete', '/:id')).toBe(true);
  });

  it('maestros routes expose endpoints', () => {
    expect(hasRoute(maestrosRouter, 'get', '/empresas')).toBe(true);
    expect(hasRoute(maestrosRouter, 'post', '/empresas')).toBe(true);
    expect(hasRoute(maestrosRouter, 'put', '/empresas/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'delete', '/empresas/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'get', '/choferes')).toBe(true);
    expect(hasRoute(maestrosRouter, 'get', '/choferes/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'post', '/choferes')).toBe(true);
    expect(hasRoute(maestrosRouter, 'put', '/choferes/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'delete', '/choferes/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'get', '/camiones')).toBe(true);
    expect(hasRoute(maestrosRouter, 'post', '/camiones')).toBe(true);
    expect(hasRoute(maestrosRouter, 'put', '/camiones/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'delete', '/camiones/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'get', '/acoplados')).toBe(true);
    expect(hasRoute(maestrosRouter, 'post', '/acoplados')).toBe(true);
    expect(hasRoute(maestrosRouter, 'put', '/acoplados/:id')).toBe(true);
    expect(hasRoute(maestrosRouter, 'delete', '/acoplados/:id')).toBe(true);
  });

  it('notifications routes expose endpoints', () => {
    expect(hasRoute(notificationsRouter, 'get', '/')).toBe(true);
    expect(hasRoute(notificationsRouter, 'put', '/')).toBe(true);
    expect(hasRoute(notificationsRouter, 'post', '/test')).toBe(true);
    expect(hasRoute(notificationsRouter, 'post', '/run-expirations')).toBe(true);
    expect(hasRoute(notificationsRouter, 'post', '/run-missing')).toBe(true);
  });

  it('search routes expose endpoints', () => {
    expect(hasRoute(searchRouter, 'get', '/')).toBe(true);
  });

  it('storage routes expose endpoints', () => {
    expect(hasRoute(storageRouter, 'post', '/init')).toBe(true);
  });

  it('templates routes expose endpoints', () => {
    expect(hasRoute(templatesRouter, 'get', '/')).toBe(true);
    expect(hasRoute(templatesRouter, 'get', '/:id')).toBe(true);
    expect(hasRoute(templatesRouter, 'post', '/')).toBe(true);
    expect(hasRoute(templatesRouter, 'put', '/:id')).toBe(true);
    expect(hasRoute(templatesRouter, 'delete', '/:id')).toBe(true);
  });

  it('empresas transportistas routes expose endpoints', () => {
    expect(hasRoute(empresasTransportistasRouter, 'get', '/')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'post', '/')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'get', '/:id')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'put', '/:id')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'delete', '/:id')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'get', '/:id/choferes')).toBe(true);
    expect(hasRoute(empresasTransportistasRouter, 'get', '/:id/equipos')).toBe(true);
  });

  it('entity data routes expose endpoints', () => {
    expect(hasRoute(entityDataRouter, 'get', '/extracted-data')).toBe(true);
    expect(hasRoute(entityDataRouter, 'get', '/:entityType/:entityId/extracted-data')).toBe(true);
    expect(hasRoute(entityDataRouter, 'put', '/:entityType/:entityId/extracted-data')).toBe(true);
    expect(hasRoute(entityDataRouter, 'delete', '/:entityType/:entityId/extracted-data')).toBe(true);
    expect(hasRoute(entityDataRouter, 'get', '/:entityType/:entityId/extraction-history')).toBe(true);
  });

  it('flowise config routes expose endpoints', () => {
    expect(hasRoute(flowiseConfigRouter, 'get', '/')).toBe(true);
    expect(hasRoute(flowiseConfigRouter, 'put', '/')).toBe(true);
    expect(hasRoute(flowiseConfigRouter, 'post', '/test')).toBe(true);
    expect(hasRoute(flowiseConfigRouter, 'get', '/status')).toBe(true);
  });

  it('evolution config routes expose endpoints', () => {
    expect(hasRoute(evolutionConfigRouter, 'get', '/')).toBe(true);
    expect(hasRoute(evolutionConfigRouter, 'put', '/')).toBe(true);
    expect(hasRoute(evolutionConfigRouter, 'post', '/test')).toBe(true);
  });

  it('portal cliente routes expose endpoints', () => {
    expect(hasRoute(portalClienteRouter, 'post', '/equipos/bulk-download-form')).toBe(true);
    expect(hasRoute(portalClienteRouter, 'get', '/equipos')).toBe(true);
    expect(hasRoute(portalClienteRouter, 'get', '/equipos/:id')).toBe(true);
    expect(hasRoute(portalClienteRouter, 'get', '/equipos/:id/documentos/:docId/download')).toBe(true);
    expect(hasRoute(portalClienteRouter, 'get', '/equipos/:id/download-all')).toBe(true);
    expect(hasRoute(portalClienteRouter, 'post', '/equipos/bulk-download')).toBe(true);
  });

  it('portal transportista routes expose endpoints', () => {
    expect(hasRoute(portalTransportistaRouter, 'get', '/mis-entidades')).toBe(true);
    expect(hasRoute(portalTransportistaRouter, 'get', '/equipos')).toBe(true);
    expect(hasRoute(portalTransportistaRouter, 'get', '/documentos/rechazados')).toBe(true);
    expect(hasRoute(portalTransportistaRouter, 'get', '/documentos/pendientes')).toBe(true);
  });
});
