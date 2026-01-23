/**
 * Smoke Tests para componentes UI
 * Tests simples que importan componentes para verificar su estructura
 */
import { describe, it, expect } from '@jest/globals';

describe('UI Components Smoke Tests', () => {
  it('importa alert component', async () => {
    const module = await import('../../components/ui/alert');
    expect(module).toBeDefined();
  });

  it('importa badge component', async () => {
    const module = await import('../../components/ui/badge');
    expect(module).toBeDefined();
  });

  it('importa button component', async () => {
    const module = await import('../../components/ui/button');
    expect(module).toBeDefined();
  });

  it('importa card component', async () => {
    const module = await import('../../components/ui/card');
    expect(module).toBeDefined();
  });

  it('importa confirm-dialog component', async () => {
    const module = await import('../../components/ui/confirm-dialog');
    expect(module).toBeDefined();
  });

  it('importa data-table component', async () => {
    const module = await import('../../components/ui/data-table');
    expect(module).toBeDefined();
  });

  it('importa dialog component', async () => {
    const module = await import('../../components/ui/dialog');
    expect(module).toBeDefined();
  });

  it('importa input component', async () => {
    const module = await import('../../components/ui/input');
    expect(module).toBeDefined();
  });

  it('importa label component', async () => {
    const module = await import('../../components/ui/label');
    expect(module).toBeDefined();
  });

  it('importa progress component', async () => {
    const module = await import('../../components/ui/progress');
    expect(module).toBeDefined();
  });

  it('importa select component', async () => {
    const module = await import('../../components/ui/select');
    expect(module).toBeDefined();
  });

  it('importa select-advanced component', async () => {
    const module = await import('../../components/ui/select-advanced');
    expect(module).toBeDefined();
  });

  it('importa select-full component', async () => {
    const module = await import('../../components/ui/select-full');
    expect(module).toBeDefined();
  });

  it('importa skeleton component', async () => {
    const module = await import('../../components/ui/Skeleton');
    expect(module).toBeDefined();
  });

  it('importa spinner component', async () => {
    const module = await import('../../components/ui/spinner');
    expect(module).toBeDefined();
  });

  it('importa switch component', async () => {
    const module = await import('../../components/ui/switch');
    expect(module).toBeDefined();
  });

  it('importa table component', async () => {
    const module = await import('../../components/ui/table');
    expect(module).toBeDefined();
  });

  it('importa tabs component', async () => {
    const module = await import('../../components/ui/tabs');
    expect(module).toBeDefined();
  });

  it('importa textarea component', async () => {
    const module = await import('../../components/ui/textarea');
    expect(module).toBeDefined();
  });

  it('importa theme-toggle component', async () => {
    const module = await import('../../components/ui/theme-toggle');
    expect(module).toBeDefined();
  });

  it('importa toggle-switch component', async () => {
    const module = await import('../../components/ui/toggle-switch');
    expect(module).toBeDefined();
  });

  it('importa Toast component', async () => {
    const module = await import('../../components/ui/Toast');
    expect(module).toBeDefined();
  });

  it('importa LoadingSpinner component', async () => {
    const module = await import('../../components/ui/LoadingSpinner');
    expect(module).toBeDefined();
  });

  it('importa Pagination component', async () => {
    const module = await import('../../components/ui/Pagination');
    expect(module).toBeDefined();
  });
});
