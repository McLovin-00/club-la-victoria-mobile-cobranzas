/**
 * Tests reales para config/serviceConfig.ts
 * @jest-environment node
 */

import { backendServiceConfig } from '../serviceConfig';

describe('backendServiceConfig (real)', () => {
  const oldEnv = process.env.NODE_ENV;
  const oldEnable = process.env.ENABLE_DOCUMENTOS;

  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
    process.env.ENABLE_DOCUMENTOS = oldEnable;
    backendServiceConfig.clearCache();
  });

  it('caches in non-development and clearCache refreshes', () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DOCUMENTOS = 'false';
    const c1 = backendServiceConfig.getConfig();
    process.env.ENABLE_DOCUMENTOS = 'true';
    const c2 = backendServiceConfig.getConfig();
    expect(c2.documentos.enabled).toBe(c1.documentos.enabled); // cached

    backendServiceConfig.clearCache();
    const c3 = backendServiceConfig.getConfig();
    expect(c3.documentos.enabled).toBe(true);
  });

  it('bypasses cache in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DOCUMENTOS = 'false';
    expect(backendServiceConfig.getConfig().documentos.enabled).toBe(false);
    process.env.ENABLE_DOCUMENTOS = 'true';
    expect(backendServiceConfig.getConfig().documentos.enabled).toBe(true);
  });

  it('getEnabledServices and isServiceEnabled reflect config', () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DOCUMENTOS = 'true';
    backendServiceConfig.clearCache();
    expect(backendServiceConfig.isServiceEnabled()).toBe(true);
    expect(backendServiceConfig.getEnabledServices()).toEqual(['Documentos']);
  });
});


