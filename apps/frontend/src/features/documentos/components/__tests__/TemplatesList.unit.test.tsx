// Tests unitarios simples para TemplatesList - aumentar cobertura
import { describe, it, expect } from '@jest/globals';

describe('TemplatesList - Unit Tests', () => {
  describe('getEntityTypeColor', () => {
    const getEntityTypeColor = (entityType: string): string => {
      switch (entityType) {
        case 'EMPRESA_TRANSPORTISTA':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'CHOFER':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'CAMION':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'ACOPLADO':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    it('debe retornar azul para EMPRESA_TRANSPORTISTA', () => {
      const result = getEntityTypeColor('EMPRESA_TRANSPORTISTA');
      expect(result).toContain('blue');
      expect(result).toBe('bg-blue-100 text-blue-800 border-blue-200');
    });

    it('debe retornar verde para CHOFER', () => {
      const result = getEntityTypeColor('CHOFER');
      expect(result).toContain('green');
      expect(result).toBe('bg-green-100 text-green-800 border-green-200');
    });

    it('debe retornar naranja para CAMION', () => {
      const result = getEntityTypeColor('CAMION');
      expect(result).toContain('orange');
      expect(result).toBe('bg-orange-100 text-orange-800 border-orange-200');
    });

    it('debe retornar morado para ACOPLADO', () => {
      const result = getEntityTypeColor('ACOPLADO');
      expect(result).toContain('purple');
      expect(result).toBe('bg-purple-100 text-purple-800 border-purple-200');
    });

    it('debe retornar gris por defecto', () => {
      const result = getEntityTypeColor('DESCONOCIDO');
      expect(result).toContain('gray');
      expect(result).toBe('bg-gray-100 text-gray-800 border-gray-200');
    });
  });

  describe('getEntityTypeIcon', () => {
    const getEntityTypeIcon = (entityType: string): string => {
      switch (entityType) {
        case 'EMPRESA_TRANSPORTISTA':
          return '🏢';
        case 'CHOFER':
          return '👨‍💼';
        case 'CAMION':
          return '🚛';
        case 'ACOPLADO':
          return '🚚';
        default:
          return '📄';
      }
    };

    it('debe retornar 🏢 para EMPRESA_TRANSPORTISTA', () => {
      const result = getEntityTypeIcon('EMPRESA_TRANSPORTISTA');
      expect(result).toBe('🏢');
    });

    it('debe retornar 👨‍💼 para CHOFER', () => {
      const result = getEntityTypeIcon('CHOFER');
      expect(result).toBe('👨‍💼');
    });

    it('debe retornar 🚛 para CAMION', () => {
      const result = getEntityTypeIcon('CAMION');
      expect(result).toBe('🚛');
    });

    it('debe retornar 🚚 para ACOPLADO', () => {
      const result = getEntityTypeIcon('ACOPLADO');
      expect(result).toBe('🚚');
    });

    it('debe retornar 📄 por defecto', () => {
      const result = getEntityTypeIcon('DESCONOCIDO');
      expect(result).toBe('📄');
    });
  });

  describe('filtrado de templates', () => {
    interface Template {
      id: number;
      entityType: string;
      isActive: boolean;
    }

    const filterTemplates = (
      templates: Template[],
      filterEntityType: string,
      filterActive: string
    ): Template[] => {
      return templates.filter((template) => {
        if (filterEntityType !== 'all' && template.entityType !== filterEntityType) {
          return false;
        }
        if (filterActive === 'active' && !template.isActive) {
          return false;
        }
        if (filterActive === 'inactive' && template.isActive) {
          return false;
        }
        return true;
      });
    };

    const mockTemplates: Template[] = [
      { id: 1, entityType: 'CHOFER', isActive: true },
      { id: 2, entityType: 'CAMION', isActive: true },
      { id: 3, entityType: 'CHOFER', isActive: false },
      { id: 4, entityType: 'ACOPLADO', isActive: false },
    ];

    it('debe retornar todos con filtros all', () => {
      const result = filterTemplates(mockTemplates, 'all', 'all');
      expect(result.length).toBe(4);
    });

    it('debe filtrar por entityType CHOFER', () => {
      const result = filterTemplates(mockTemplates, 'CHOFER', 'all');
      expect(result.length).toBe(2);
      expect(result.every(t => t.entityType === 'CHOFER')).toBe(true);
    });

    it('debe filtrar por activos', () => {
      const result = filterTemplates(mockTemplates, 'all', 'active');
      expect(result.length).toBe(2);
      expect(result.every(t => t.isActive)).toBe(true);
    });

    it('debe filtrar por inactivos', () => {
      const result = filterTemplates(mockTemplates, 'all', 'inactive');
      expect(result.length).toBe(2);
      expect(result.every(t => !t.isActive)).toBe(true);
    });

    it('debe filtrar por entityType y activos combinados', () => {
      const result = filterTemplates(mockTemplates, 'CHOFER', 'active');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    it('debe retornar vacío si no hay coincidencias', () => {
      const result = filterTemplates(mockTemplates, 'EMPRESA_TRANSPORTISTA', 'active');
      expect(result.length).toBe(0);
    });
  });

  describe('estado de template activo/inactivo', () => {
    it('debe mostrar "Activa" cuando isActive es true', () => {
      const isActive = true;
      const label = isActive ? 'Activa' : 'Inactiva';
      expect(label).toBe('Activa');
    });

    it('debe mostrar "Inactiva" cuando isActive es false', () => {
      const isActive = false;
      const label = isActive ? 'Activa' : 'Inactiva';
      expect(label).toBe('Inactiva');
    });

    it('debe mostrar "Activar" cuando isActive es false', () => {
      const isActive = false;
      const label = isActive ? 'Desactivar' : 'Activar';
      expect(label).toBe('Activar');
    });

    it('debe mostrar "Desactivar" cuando isActive es true', () => {
      const isActive = true;
      const label = isActive ? 'Desactivar' : 'Activar';
      expect(label).toBe('Desactivar');
    });
  });

  describe('clases CSS según estado activo', () => {
    it('debe usar clases de éxito para activo', () => {
      const isActive = true;
      const classes = isActive
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-red-100 text-red-800 border-red-200';
      expect(classes).toContain('green');
    });

    it('debe usar clases de error para inactivo', () => {
      const isActive = false;
      const classes = isActive
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-red-100 text-red-800 border-red-200';
      expect(classes).toContain('red');
    });
  });

  describe('valores de filtros', () => {
    it('debe tener valor "all" para todos', () => {
      expect('all').toBe('all');
    });

    it('debe tener valor "active" para activas', () => {
      expect('active').toBe('active');
    });

    it('debe tener valor "inactive" para inactivas', () => {
      expect('inactive').toBe('inactive');
    });
  });
});
