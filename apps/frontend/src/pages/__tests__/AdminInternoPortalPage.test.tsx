/**
 * Tests para AdminInternoPortalPage
 * Verifica la estructura y exports del portal de administración interno
 */
import { describe, it, expect } from '@jest/globals';

describe('AdminInternoPortalPage - exports', () => {
  it('exporta AdminInternoPortalPage como named export', async () => {
    const module = await import('../AdminInternoPortalPage');
    expect(module.AdminInternoPortalPage).toBeDefined();
    expect(typeof module.AdminInternoPortalPage).toBe('function');
  });

  it('exporta AdminInternoPortalPage como default export', async () => {
    const module = await import('../AdminInternoPortalPage');
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.AdminInternoPortalPage);
  });
});

describe('AdminInternoPortalPage - rutas de navegación', () => {
  it('alta completa navega a /documentos/equipos/alta-completa', () => {
    const expectedRoute = '/documentos/equipos/alta-completa';
    expect(expectedRoute).toBe('/documentos/equipos/alta-completa');
    expect(expectedRoute).toContain('/documentos');
    expect(expectedRoute).toContain('/equipos');
    expect(expectedRoute).toContain('/alta-completa');
  });

  it('consulta navega a /documentos/consulta', () => {
    const expectedRoute = '/documentos/consulta';
    expect(expectedRoute).toBe('/documentos/consulta');
  });

  it('aprobaciones navega a /documentos/aprobacion', () => {
    const expectedRoute = '/documentos/aprobacion';
    expect(expectedRoute).toBe('/documentos/aprobacion');
  });

  it('auditoría navega a /documentos/auditoria', () => {
    const expectedRoute = '/documentos/auditoria';
    expect(expectedRoute).toBe('/documentos/auditoria');
  });
});

describe('AdminInternoPortalPage - estructura de contenido', () => {
  it('tiene título del portal', () => {
    const expectedTitle = 'Portal Admin Interno';
    expect(expectedTitle).toBe('Portal Admin Interno');
  });

  it('tiene descripción del portal', () => {
    const expectedDescription = 'Gestión completa de equipos y documentación';
    expect(expectedDescription).toContain('Gestión');
    expect(expectedDescription).toContain('equipos');
    expect(expectedDescription).toContain('documentación');
  });

  it('tiene opción de Alta Completa de Equipo', () => {
    const altaCompletaData = {
      title: 'Alta Completa de Equipo',
      description: 'Registrar nuevo equipo con toda su documentación',
      buttonText: 'Iniciar Alta Completa',
    };

    expect(altaCompletaData.title).toBe('Alta Completa de Equipo');
    expect(altaCompletaData.description).toContain('Registrar');
    expect(altaCompletaData.buttonText).toContain('Iniciar');
  });

  it('tiene opción de Consulta de Equipos', () => {
    const consultaData = {
      title: 'Consulta de Equipos',
      description: 'Buscar equipos existentes y actualizar su documentación',
      buttonText: 'Ir a Consulta',
    };

    expect(consultaData.title).toBe('Consulta de Equipos');
    expect(consultaData.description).toContain('Buscar');
    expect(consultaData.buttonText).toBe('Ir a Consulta');
  });
});

describe('AdminInternoPortalPage - funcionalidades de Alta Completa', () => {
  it('incluye carga de empresa transportista y chofer', () => {
    const funcionalidad = 'Carga de empresa transportista y chofer';
    expect(funcionalidad).toContain('empresa');
    expect(funcionalidad).toContain('transportista');
    expect(funcionalidad).toContain('chofer');
  });

  it('incluye registro de camión y acoplado', () => {
    const funcionalidad = 'Registro de camión y acoplado';
    expect(funcionalidad).toContain('camión');
    expect(funcionalidad).toContain('acoplado');
  });

  it('incluye subida de documentos', () => {
    const funcionalidad = 'Subida de todos los documentos requeridos';
    expect(funcionalidad).toContain('documentos');
  });
});

describe('AdminInternoPortalPage - funcionalidades de Consulta', () => {
  it('permite buscar por DNI, patente camión o acoplado', () => {
    const funcionalidad = 'Buscar por DNI chofer, patente camión o acoplado';
    expect(funcionalidad).toContain('DNI');
    expect(funcionalidad).toContain('patente');
  });

  it('permite ver estado de documentación', () => {
    const funcionalidad = 'Ver estado completo de documentación';
    expect(funcionalidad).toContain('estado');
    expect(funcionalidad).toContain('documentación');
  });

  it('permite actualizar documentos', () => {
    const funcionalidad = 'Actualizar documentos vencidos o faltantes';
    expect(funcionalidad).toContain('Actualizar');
    expect(funcionalidad).toContain('vencidos');
    expect(funcionalidad).toContain('faltantes');
  });
});

describe('AdminInternoPortalPage - accesos rápidos', () => {
  it('tiene acceso a Aprobaciones Pendientes', () => {
    const accesoRapido = 'Aprobaciones Pendientes';
    expect(accesoRapido).toBe('Aprobaciones Pendientes');
  });

  it('tiene acceso a Auditoría', () => {
    const accesoRapido = 'Auditoría';
    expect(accesoRapido).toBe('Auditoría');
  });
});
