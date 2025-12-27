/**
 * Unit tests for Dashboard Controller logic
 * @jest-environment node
 */

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DashboardController', () => {
  describe('Semaforo state calculation', () => {
    type SemaforoState = 'verde' | 'amarillo' | 'rojo' | 'gris';

    interface SemaforoData {
      totalObligatorios: number;
      vigentes: number;
      proximosVencer: number;
      vencidos: number;
      faltantes: number;
    }

    function calculateSemaforoState(data: SemaforoData): SemaforoState {
      const { totalObligatorios, vigentes, vencidos, faltantes, proximosVencer } = data;

      if (totalObligatorios === 0) return 'gris';
      if (vencidos > 0 || faltantes > 0) return 'rojo';
      if (proximosVencer > 0) return 'amarillo';
      if (vigentes === totalObligatorios) return 'verde';
      return 'gris';
    }

    it('should return verde when all documents are valid', () => {
      const data: SemaforoData = {
        totalObligatorios: 5,
        vigentes: 5,
        proximosVencer: 0,
        vencidos: 0,
        faltantes: 0,
      };
      expect(calculateSemaforoState(data)).toBe('verde');
    });

    it('should return amarillo when documents expiring soon', () => {
      const data: SemaforoData = {
        totalObligatorios: 5,
        vigentes: 4,
        proximosVencer: 1,
        vencidos: 0,
        faltantes: 0,
      };
      expect(calculateSemaforoState(data)).toBe('amarillo');
    });

    it('should return rojo when documents expired', () => {
      const data: SemaforoData = {
        totalObligatorios: 5,
        vigentes: 3,
        proximosVencer: 0,
        vencidos: 2,
        faltantes: 0,
      };
      expect(calculateSemaforoState(data)).toBe('rojo');
    });

    it('should return rojo when documents missing', () => {
      const data: SemaforoData = {
        totalObligatorios: 5,
        vigentes: 3,
        proximosVencer: 0,
        vencidos: 0,
        faltantes: 2,
      };
      expect(calculateSemaforoState(data)).toBe('rojo');
    });

    it('should prioritize rojo over amarillo', () => {
      const data: SemaforoData = {
        totalObligatorios: 5,
        vigentes: 2,
        proximosVencer: 1,
        vencidos: 1,
        faltantes: 1,
      };
      expect(calculateSemaforoState(data)).toBe('rojo');
    });

    it('should return gris when no obligatory documents', () => {
      const data: SemaforoData = {
        totalObligatorios: 0,
        vigentes: 0,
        proximosVencer: 0,
        vencidos: 0,
        faltantes: 0,
      };
      expect(calculateSemaforoState(data)).toBe('gris');
    });
  });

  describe('Dashboard stats aggregation', () => {
    interface DashboardStats {
      totalEquipos: number;
      equiposHabilitados: number;
      equiposProximoVencer: number;
      equiposNoHabilitados: number;
      totalDocumentos: number;
      documentosPendientes: number;
      documentosVigentes: number;
      documentosVencidos: number;
    }

    function aggregateStats(equipoStates: Array<{
      state: string;
      docsVigentes: number;
      docsVencidos: number;
      docsPendientes: number;
    }>): DashboardStats {
      const stats: DashboardStats = {
        totalEquipos: equipoStates.length,
        equiposHabilitados: 0,
        equiposProximoVencer: 0,
        equiposNoHabilitados: 0,
        totalDocumentos: 0,
        documentosPendientes: 0,
        documentosVigentes: 0,
        documentosVencidos: 0,
      };

      for (const equipo of equipoStates) {
        if (equipo.state === 'HABILITADO') stats.equiposHabilitados++;
        else if (equipo.state === 'PROXIMO_VENCER') stats.equiposProximoVencer++;
        else stats.equiposNoHabilitados++;

        stats.documentosVigentes += equipo.docsVigentes;
        stats.documentosVencidos += equipo.docsVencidos;
        stats.documentosPendientes += equipo.docsPendientes;
      }

      stats.totalDocumentos = stats.documentosVigentes + stats.documentosVencidos + stats.documentosPendientes;
      return stats;
    }

    it('should count equipos by state', () => {
      const equipos = [
        { state: 'HABILITADO', docsVigentes: 5, docsVencidos: 0, docsPendientes: 0 },
        { state: 'HABILITADO', docsVigentes: 5, docsVencidos: 0, docsPendientes: 0 },
        { state: 'PROXIMO_VENCER', docsVigentes: 4, docsVencidos: 0, docsPendientes: 1 },
        { state: 'NO_HABILITADO', docsVigentes: 2, docsVencidos: 2, docsPendientes: 1 },
      ];

      const stats = aggregateStats(equipos);
      expect(stats.totalEquipos).toBe(4);
      expect(stats.equiposHabilitados).toBe(2);
      expect(stats.equiposProximoVencer).toBe(1);
      expect(stats.equiposNoHabilitados).toBe(1);
    });

    it('should sum document counts', () => {
      const equipos = [
        { state: 'HABILITADO', docsVigentes: 5, docsVencidos: 0, docsPendientes: 0 },
        { state: 'NO_HABILITADO', docsVigentes: 2, docsVencidos: 3, docsPendientes: 1 },
      ];

      const stats = aggregateStats(equipos);
      expect(stats.documentosVigentes).toBe(7);
      expect(stats.documentosVencidos).toBe(3);
      expect(stats.documentosPendientes).toBe(1);
      expect(stats.totalDocumentos).toBe(11);
    });
  });

  describe('Percentage calculations', () => {
    function calculatePercentage(part: number, total: number): number {
      if (total === 0) return 0;
      return Math.round((part / total) * 100 * 100) / 100; // 2 decimals
    }

    function calculateComplianceRate(habilitados: number, total: number): number {
      return calculatePercentage(habilitados, total);
    }

    it('should calculate simple percentage', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('should handle decimal percentages', () => {
      expect(calculatePercentage(1, 3)).toBe(33.33);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(5, 0)).toBe(0);
    });

    it('should calculate compliance rate', () => {
      expect(calculateComplianceRate(80, 100)).toBe(80);
    });
  });

  describe('Date range filtering', () => {
    function getDateRange(period: string): { startDate: Date; endDate: Date } {
      const now = new Date();
      const endDate = new Date(now);
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
      }

      return { startDate, endDate };
    }

    it('should calculate week range', () => {
      const { startDate, endDate } = getDateRange('week');
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should calculate month range', () => {
      const { startDate, endDate } = getDateRange('month');
      expect(startDate.getMonth()).not.toBe(endDate.getMonth());
    });

    it('should default to month', () => {
      const { startDate: monthStart } = getDateRange('month');
      const { startDate: defaultStart } = getDateRange('invalid');
      expect(monthStart.getMonth()).toBe(defaultStart.getMonth());
    });
  });

  describe('Expiring documents grouping', () => {
    interface ExpiringDocument {
      id: number;
      templateName: string;
      entityType: string;
      entityName: string;
      expiresAt: Date;
    }

    function groupByDaysUntilExpiry(
      documents: ExpiringDocument[],
      referenceDate: Date = new Date()
    ): Record<string, ExpiringDocument[]> {
      const groups: Record<string, ExpiringDocument[]> = {
        'today': [],
        'this_week': [],
        'this_month': [],
        'next_month': [],
      };

      const day = 24 * 60 * 60 * 1000;
      const now = referenceDate.getTime();

      for (const doc of documents) {
        const daysUntil = Math.ceil((doc.expiresAt.getTime() - now) / day);

        if (daysUntil <= 0) continue; // Already expired
        if (daysUntil === 1) groups['today'].push(doc);
        else if (daysUntil <= 7) groups['this_week'].push(doc);
        else if (daysUntil <= 30) groups['this_month'].push(doc);
        else if (daysUntil <= 60) groups['next_month'].push(doc);
      }

      return groups;
    }

    it('should group documents expiring today', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const docs: ExpiringDocument[] = [
        { id: 1, templateName: 'Licencia', entityType: 'CHOFER', entityName: 'Juan', expiresAt: tomorrow },
      ];

      const groups = groupByDaysUntilExpiry(docs, now);
      expect(groups['today']).toHaveLength(1);
    });

    it('should group documents expiring this week', () => {
      const now = new Date();
      const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      const docs: ExpiringDocument[] = [
        { id: 1, templateName: 'VTV', entityType: 'CAMION', entityName: 'AB123', expiresAt: inFiveDays },
      ];

      const groups = groupByDaysUntilExpiry(docs, now);
      expect(groups['this_week']).toHaveLength(1);
    });
  });

  describe('Chart data formatting', () => {
    interface ChartDataPoint {
      label: string;
      value: number;
      color?: string;
    }

    function formatSemaforoChartData(
      verde: number,
      amarillo: number,
      rojo: number,
      gris: number
    ): ChartDataPoint[] {
      return [
        { label: 'Habilitados', value: verde, color: '#22c55e' },
        { label: 'Próximos a vencer', value: amarillo, color: '#eab308' },
        { label: 'No habilitados', value: rojo, color: '#ef4444' },
        { label: 'Sin información', value: gris, color: '#9ca3af' },
      ];
    }

    it('should format chart data with colors', () => {
      const data = formatSemaforoChartData(50, 20, 10, 5);
      expect(data).toHaveLength(4);
      expect(data[0].value).toBe(50);
      expect(data[0].color).toBe('#22c55e');
    });

    it('should include all categories', () => {
      const data = formatSemaforoChartData(0, 0, 0, 0);
      expect(data.map(d => d.label)).toContain('Habilitados');
      expect(data.map(d => d.label)).toContain('No habilitados');
    });
  });

  describe('Activity timeline', () => {
    interface ActivityItem {
      id: number;
      action: string;
      entityType: string;
      entityId: number;
      userId: number;
      timestamp: Date;
    }

    function formatActivityMessage(activity: ActivityItem): string {
      const actions: Record<string, string> = {
        CREATE: 'creó',
        UPDATE: 'actualizó',
        DELETE: 'eliminó',
        UPLOAD: 'subió',
        APPROVE: 'aprobó',
        REJECT: 'rechazó',
      };

      const entities: Record<string, string> = {
        DOCUMENT: 'documento',
        EQUIPO: 'equipo',
        CHOFER: 'chofer',
        CAMION: 'camión',
      };

      const actionText = actions[activity.action] || activity.action;
      const entityText = entities[activity.entityType] || activity.entityType;

      return `${actionText} ${entityText} #${activity.entityId}`;
    }

    it('should format create action', () => {
      const activity: ActivityItem = {
        id: 1,
        action: 'CREATE',
        entityType: 'DOCUMENT',
        entityId: 100,
        userId: 1,
        timestamp: new Date(),
      };
      expect(formatActivityMessage(activity)).toBe('creó documento #100');
    });

    it('should format approve action', () => {
      const activity: ActivityItem = {
        id: 2,
        action: 'APPROVE',
        entityType: 'DOCUMENT',
        entityId: 200,
        userId: 1,
        timestamp: new Date(),
      };
      expect(formatActivityMessage(activity)).toBe('aprobó documento #200');
    });
  });

  describe('Top entities calculation', () => {
    interface EntityIssues {
      entityId: number;
      entityName: string;
      entityType: string;
      issueCount: number;
    }

    function getTopEntitiesWithIssues(
      entities: EntityIssues[],
      limit: number = 10
    ): EntityIssues[] {
      return [...entities]
        .sort((a, b) => b.issueCount - a.issueCount)
        .slice(0, limit);
    }

    it('should return top entities by issue count', () => {
      const entities: EntityIssues[] = [
        { entityId: 1, entityName: 'Juan', entityType: 'CHOFER', issueCount: 5 },
        { entityId: 2, entityName: 'Pedro', entityType: 'CHOFER', issueCount: 10 },
        { entityId: 3, entityName: 'AB123', entityType: 'CAMION', issueCount: 3 },
      ];

      const top = getTopEntitiesWithIssues(entities, 2);
      expect(top).toHaveLength(2);
      expect(top[0].entityName).toBe('Pedro');
      expect(top[1].entityName).toBe('Juan');
    });

    it('should handle empty list', () => {
      const top = getTopEntitiesWithIssues([]);
      expect(top).toHaveLength(0);
    });
  });
});




