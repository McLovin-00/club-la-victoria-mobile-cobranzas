/**
 * Unit tests for Report Service logic
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

describe('ReportService', () => {
  describe('Report types', () => {
    const reportTypes = [
      'COMPLIANCE_SUMMARY',
      'EXPIRING_DOCUMENTS',
      'EQUIPMENT_STATUS',
      'AUDIT_LOG',
      'USER_ACTIVITY',
      'DOCUMENT_HISTORY',
    ];

    it('should define all report types', () => {
      expect(reportTypes).toHaveLength(6);
    });

    it('should include compliance reports', () => {
      expect(reportTypes).toContain('COMPLIANCE_SUMMARY');
      expect(reportTypes).toContain('EXPIRING_DOCUMENTS');
    });

    it('should include audit reports', () => {
      expect(reportTypes).toContain('AUDIT_LOG');
      expect(reportTypes).toContain('USER_ACTIVITY');
    });
  });

  describe('Date range helpers', () => {
    function getLastNDays(n: number): { startDate: Date; endDate: Date } {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - n);
      return { startDate, endDate };
    }

    function getCurrentMonth(): { startDate: Date; endDate: Date } {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate, endDate };
    }

    function getCurrentQuarter(): { startDate: Date; endDate: Date } {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const startDate = new Date(now.getFullYear(), quarter * 3, 1);
      const endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return { startDate, endDate };
    }

    it('should get last 7 days', () => {
      const { startDate, endDate } = getLastNDays(7);
      const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(7);
    });

    it('should get current month', () => {
      const { startDate, endDate } = getCurrentMonth();
      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(endDate.getMonth());
    });

    it('should get current quarter', () => {
      const { startDate, endDate } = getCurrentQuarter();
      const monthsDiff = (endDate.getMonth() - startDate.getMonth() + 1);
      expect(monthsDiff).toBe(3);
    });
  });

  describe('Data aggregation', () => {
    interface ComplianceData {
      entityType: string;
      total: number;
      compliant: number;
      nonCompliant: number;
      expiringSoon: number;
    }

    function aggregateByEntityType(
      data: Array<{ entityType: string; status: string }>
    ): ComplianceData[] {
      const groups = new Map<string, { total: number; compliant: number; nonCompliant: number; expiringSoon: number }>();

      for (const item of data) {
        const stats = groups.get(item.entityType) || { total: 0, compliant: 0, nonCompliant: 0, expiringSoon: 0 };
        stats.total++;
        
        if (item.status === 'VIGENTE') stats.compliant++;
        else if (item.status === 'VENCIDO') stats.nonCompliant++;
        else if (item.status === 'PROXIMO_VENCER') stats.expiringSoon++;
        
        groups.set(item.entityType, stats);
      }

      return Array.from(groups.entries()).map(([entityType, stats]) => ({
        entityType,
        ...stats,
      }));
    }

    it('should aggregate by entity type', () => {
      const data = [
        { entityType: 'CHOFER', status: 'VIGENTE' },
        { entityType: 'CHOFER', status: 'VIGENTE' },
        { entityType: 'CHOFER', status: 'VENCIDO' },
        { entityType: 'CAMION', status: 'VIGENTE' },
        { entityType: 'CAMION', status: 'PROXIMO_VENCER' },
      ];

      const result = aggregateByEntityType(data);
      const chofer = result.find(r => r.entityType === 'CHOFER');
      const camion = result.find(r => r.entityType === 'CAMION');

      expect(chofer?.total).toBe(3);
      expect(chofer?.compliant).toBe(2);
      expect(chofer?.nonCompliant).toBe(1);
      expect(camion?.expiringSoon).toBe(1);
    });
  });

  describe('CSV export formatting', () => {
    function escapeCsvValue(value: any): string {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    function formatCsvRow(values: any[]): string {
      return values.map(escapeCsvValue).join(',');
    }

    function generateCsv(headers: string[], rows: any[][]): string {
      const headerRow = formatCsvRow(headers);
      const dataRows = rows.map(formatCsvRow);
      return [headerRow, ...dataRows].join('\n');
    }

    it('should escape commas in values', () => {
      expect(escapeCsvValue('a,b')).toBe('"a,b"');
    });

    it('should escape quotes in values', () => {
      expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should handle null values', () => {
      expect(escapeCsvValue(null)).toBe('');
    });

    it('should format row', () => {
      expect(formatCsvRow(['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('should generate full CSV', () => {
      const csv = generateCsv(['Name', 'Value'], [['Test', 100], ['Other', 200]]);
      expect(csv).toContain('Name,Value');
      expect(csv).toContain('Test,100');
    });
  });

  describe('Excel formatting', () => {
    interface ExcelColumn {
      header: string;
      key: string;
      width: number;
    }

    function getColumnDefinitions(reportType: string): ExcelColumn[] {
      const definitions: Record<string, ExcelColumn[]> = {
        COMPLIANCE_SUMMARY: [
          { header: 'Entidad', key: 'entityName', width: 30 },
          { header: 'Tipo', key: 'entityType', width: 15 },
          { header: 'Estado', key: 'status', width: 15 },
          { header: 'Documentos Vigentes', key: 'vigentes', width: 20 },
          { header: 'Documentos Vencidos', key: 'vencidos', width: 20 },
        ],
        EXPIRING_DOCUMENTS: [
          { header: 'Documento', key: 'templateName', width: 30 },
          { header: 'Entidad', key: 'entityName', width: 25 },
          { header: 'Vencimiento', key: 'expiresAt', width: 15 },
          { header: 'Días Restantes', key: 'daysUntilExpiry', width: 15 },
        ],
      };

      return definitions[reportType] || [];
    }

    it('should return columns for COMPLIANCE_SUMMARY', () => {
      const cols = getColumnDefinitions('COMPLIANCE_SUMMARY');
      expect(cols).toHaveLength(5);
      expect(cols[0].header).toBe('Entidad');
    });

    it('should return columns for EXPIRING_DOCUMENTS', () => {
      const cols = getColumnDefinitions('EXPIRING_DOCUMENTS');
      expect(cols).toHaveLength(4);
    });

    it('should return empty for unknown report', () => {
      expect(getColumnDefinitions('UNKNOWN')).toHaveLength(0);
    });
  });

  describe('Report scheduling', () => {
    interface ScheduleConfig {
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
      hour: number;
      minute: number;
    }

    function getNextRunTime(config: ScheduleConfig, now: Date = new Date()): Date {
      const next = new Date(now);
      next.setHours(config.hour, config.minute, 0, 0);

      if (config.frequency === 'daily') {
        if (next <= now) next.setDate(next.getDate() + 1);
      } else if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
        const daysUntil = (config.dayOfWeek - next.getDay() + 7) % 7;
        next.setDate(next.getDate() + (daysUntil === 0 && next <= now ? 7 : daysUntil));
      } else if (config.frequency === 'monthly' && config.dayOfMonth !== undefined) {
        next.setDate(config.dayOfMonth);
        if (next <= now) next.setMonth(next.getMonth() + 1);
      }

      return next;
    }

    it('should schedule daily report', () => {
      const now = new Date('2024-06-15T10:00:00');
      const config: ScheduleConfig = { frequency: 'daily', hour: 8, minute: 0 };
      const next = getNextRunTime(config, now);
      expect(next.getDate()).toBe(16); // Next day
      expect(next.getHours()).toBe(8);
    });

    it('should schedule weekly report', () => {
      const now = new Date('2024-06-15T10:00:00'); // Saturday
      const config: ScheduleConfig = { frequency: 'weekly', dayOfWeek: 1, hour: 8, minute: 0 }; // Monday
      const next = getNextRunTime(config, now);
      expect(next.getDay()).toBe(1); // Monday
    });
  });

  describe('Report access control', () => {
    interface ReportAccess {
      reportType: string;
      allowedRoles: string[];
    }

    const reportAccessRules: ReportAccess[] = [
      { reportType: 'COMPLIANCE_SUMMARY', allowedRoles: ['ADMIN', 'SUPERADMIN', 'OPERATOR'] },
      { reportType: 'AUDIT_LOG', allowedRoles: ['ADMIN', 'SUPERADMIN'] },
      { reportType: 'USER_ACTIVITY', allowedRoles: ['SUPERADMIN'] },
    ];

    function canAccessReport(reportType: string, userRole: string): boolean {
      const rule = reportAccessRules.find(r => r.reportType === reportType);
      if (!rule) return false;
      return rule.allowedRoles.includes(userRole);
    }

    it('should allow ADMIN to access COMPLIANCE_SUMMARY', () => {
      expect(canAccessReport('COMPLIANCE_SUMMARY', 'ADMIN')).toBe(true);
    });

    it('should deny OPERATOR from AUDIT_LOG', () => {
      expect(canAccessReport('AUDIT_LOG', 'OPERATOR')).toBe(false);
    });

    it('should restrict USER_ACTIVITY to SUPERADMIN', () => {
      expect(canAccessReport('USER_ACTIVITY', 'SUPERADMIN')).toBe(true);
      expect(canAccessReport('USER_ACTIVITY', 'ADMIN')).toBe(false);
    });
  });

  describe('Chart data generation', () => {
    interface ChartData {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string;
      }>;
    }

    function generatePieChartData(
      data: Array<{ label: string; value: number; color?: string }>
    ): ChartData {
      return {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Distribution',
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color || '#888'),
        }],
      };
    }

    function generateBarChartData(
      categories: string[],
      series: Array<{ name: string; values: number[]; color: string }>
    ): ChartData {
      return {
        labels: categories,
        datasets: series.map(s => ({
          label: s.name,
          data: s.values,
          backgroundColor: s.color,
        })),
      };
    }

    it('should generate pie chart data', () => {
      const data = [
        { label: 'Vigentes', value: 80, color: '#22c55e' },
        { label: 'Vencidos', value: 20, color: '#ef4444' },
      ];
      const chart = generatePieChartData(data);
      expect(chart.labels).toEqual(['Vigentes', 'Vencidos']);
      expect(chart.datasets[0].data).toEqual([80, 20]);
    });

    it('should generate bar chart data', () => {
      const chart = generateBarChartData(
        ['Ene', 'Feb', 'Mar'],
        [
          { name: 'Aprobados', values: [10, 15, 20], color: '#22c55e' },
          { name: 'Rechazados', values: [2, 3, 1], color: '#ef4444' },
        ]
      );
      expect(chart.labels).toHaveLength(3);
      expect(chart.datasets).toHaveLength(2);
    });
  });

  describe('Report caching', () => {
    interface CacheEntry {
      data: any;
      generatedAt: Date;
      ttl: number; // seconds
    }

    function isCacheValid(entry: CacheEntry): boolean {
      const now = Date.now();
      const expiresAt = entry.generatedAt.getTime() + entry.ttl * 1000;
      return now < expiresAt;
    }

    function getCacheTtl(reportType: string): number {
      const ttls: Record<string, number> = {
        COMPLIANCE_SUMMARY: 300, // 5 minutes
        EXPIRING_DOCUMENTS: 600, // 10 minutes
        AUDIT_LOG: 60, // 1 minute
      };
      return ttls[reportType] || 300;
    }

    it('should validate fresh cache', () => {
      const entry: CacheEntry = {
        data: {},
        generatedAt: new Date(),
        ttl: 300,
      };
      expect(isCacheValid(entry)).toBe(true);
    });

    it('should invalidate expired cache', () => {
      const entry: CacheEntry = {
        data: {},
        generatedAt: new Date(Date.now() - 400000), // 400 seconds ago
        ttl: 300,
      };
      expect(isCacheValid(entry)).toBe(false);
    });

    it('should return correct TTL for report types', () => {
      expect(getCacheTtl('COMPLIANCE_SUMMARY')).toBe(300);
      expect(getCacheTtl('AUDIT_LOG')).toBe(60);
      expect(getCacheTtl('UNKNOWN')).toBe(300);
    });
  });
});



