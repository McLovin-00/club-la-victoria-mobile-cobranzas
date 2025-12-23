import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { SystemConfigService } from './system-config.service';
import { EvolutionClient } from './evolution-client.service';
import { ComplianceService } from './compliance.service';

type Unit = 'days' | 'weeks' | 'months';

interface AudienceTemplate {
  enabled: boolean;
  text: string;
}

interface NotificationTemplates {
  aviso: { chofer: AudienceTemplate; dador: AudienceTemplate };
  alerta: { chofer: AudienceTemplate; dador: AudienceTemplate };
  alarma: { chofer: AudienceTemplate; dador: AudienceTemplate };
}

interface WindowConfig { enabled: boolean; unit: Unit; value: number }
interface WindowsConfig { aviso: WindowConfig; alerta: WindowConfig; alarma: WindowConfig }

// ============================================================================
// HELPERS PARA REDUCIR COMPLEJIDAD
// ============================================================================

/** Convierte unidad de tiempo a días */
function toDays(unit: Unit, value: number): number {
  const multipliers: Record<Unit, number> = { days: 1, weeks: 7, months: 30 };
  return value * (multipliers[unit] || 1);
}

/** Carga datos del chofer si aplica */
async function loadChoferData(entityType: string, entityId: number): Promise<{ nombre: string; dni: string; phones: string[] }> {
  if (entityType !== 'CHOFER') {
    return { nombre: '', dni: '', phones: [] };
  }
  const ch = await prisma.chofer.findUnique({ 
    where: { id: entityId }, 
    select: { nombre: true, apellido: true, dni: true, phones: true } 
  });
  if (!ch) return { nombre: '', dni: '', phones: [] };
  return {
    nombre: [ch.apellido, ch.nombre].filter(Boolean).join(' ').trim(),
    dni: ch.dni,
    phones: ch.phones || [],
  };
}

/** Envía notificaciones a una lista de teléfonos */
async function sendToPhones(
  service: typeof NotificationService,
  phones: string[],
  text: string,
  meta: { tenantId: number; dadorId: number; documentId: number; audience: string; type: string; templateKey: string },
  maxPhones: number
): Promise<number> {
  let sent = 0;
  for (const ms of phones.slice(0, maxPhones)) {
    await service.send(ms, text, meta);
    sent++;
  }
  return sent;
}

export class NotificationService {
  static async getGlobalEnabled(tenantId: number): Promise<boolean> {
    const v = await SystemConfigService.getConfig(`tenant:${tenantId}:notifications.enabled`);
    if (v !== null) return v === 'true';
    const def = await SystemConfigService.getConfig('notifications.enabled');
    return def === 'true';
  }

  static async getWindows(tenantId: number): Promise<WindowsConfig> {
    const raw = (await SystemConfigService.getConfig(`tenant:${tenantId}:notifications.windows`)) || (await SystemConfigService.getConfig('notifications.windows'));
    try { return raw ? JSON.parse(raw) : { aviso: {enabled:true,unit:'days',value:30}, alerta:{enabled:true,unit:'days',value:14}, alarma:{enabled:true,unit:'days',value:3} }; }
    catch { return { aviso: {enabled:true,unit:'days',value:30}, alerta:{enabled:true,unit:'days',value:14}, alarma:{enabled:true,unit:'days',value:3} }; }
  }

  static async getTemplates(tenantId: number): Promise<NotificationTemplates> {
    const raw = (await SystemConfigService.getConfig(`tenant:${tenantId}:notifications.templates`)) || (await SystemConfigService.getConfig('notifications.templates'));
    const def: NotificationTemplates = {
      aviso:  { chofer: {enabled:true, text: 'Hola {{nombre_chofer}}, tu {{documento}} vence el {{vence_el}}.'}, dador: {enabled:true, text: '{{nombre_dador}}: {{documento}} de {{dni_chofer}} vence el {{vence_el}}.'} },
      alerta: { chofer: {enabled:true, text: 'Alerta: {{documento}} vence pronto ({{vence_el}}).'}, dador: {enabled:true, text: 'Alerta: {{documento}} de {{dni_chofer}} vence el {{vence_el}}.'} },
      alarma: { chofer: {enabled:true, text: 'URGENTE: {{documento}} por vencer hoy.'}, dador: {enabled:true, text: 'URGENTE: {{documento}} de {{dni_chofer}} por vencer hoy.'} },
    };
    try { return raw ? { ...def, ...JSON.parse(raw) } : def; } catch { return def; }
  }

  private static addDuration(date: Date, unit: Unit, value: number): Date {
    const d = new Date(date);
    if (unit === 'days') d.setDate(d.getDate() + value);
    else if (unit === 'weeks') d.setDate(d.getDate() + value * 7);
    else d.setMonth(d.getMonth() + value);
    return d;
  }

  private static subtractDuration(date: Date, unit: Unit, value: number): Date {
    return NotificationService.addDuration(date, unit, -value);
  }

  static render(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(params[k] ?? ''));
  }

  static async shouldDeduplicate(opts: { documentId?: number; equipoId?: number; type: string; audience: 'CHOFER'|'DADOR' }): Promise<boolean> {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const dup = await prisma.notificationLog.findFirst({
      where: {
        documentId: opts.documentId ?? undefined,
        equipoId: opts.equipoId ?? undefined,
        type: opts.type as any,
        audience: opts.audience as any,
        sentAt: { gte: todayStart },
      },
    });
    return Boolean(dup);
  }

  static async send(to: string, text: string, meta: { documentId?: number; equipoId?: number; dadorId?: number; audience: 'CHOFER'|'DADOR'; type: string; tenantId: number; templateKey: string }): Promise<void> {
    try {
      const dup = await this.shouldDeduplicate({ documentId: meta.documentId, equipoId: meta.equipoId, type: meta.type, audience: meta.audience });
      if (dup) return;
      const resp = await EvolutionClient.sendText(to, text);
      await prisma.notificationLog.create({
        data: {
          tenantEmpresaId: meta.tenantId,
          dadorCargaId: meta.dadorId ?? null,
          documentId: meta.documentId ?? null,
          equipoId: meta.equipoId ?? null,
          type: meta.type as any,
          audience: meta.audience as any,
          target: to,
          templateKey: meta.templateKey,
          payload: { text },
          status: resp.ok ? 'SENT' : 'FAILED',
          error: resp.ok ? null : resp.message || String(resp.status || ''),
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error enviando notificación:', error);
    }
  }

  /**
   * Job: revisar vencimientos y enviar notificaciones según ventanas
   */
  static async checkExpirations(tenantId: number): Promise<number> {
    const enabled = await this.getGlobalEnabled(tenantId);
    if (!enabled) return 0;
    
    const windows = await this.getWindows(tenantId);
    const templates = await this.getTemplates(tenantId);

    // Calcular horizonte máximo
    const horizon = Math.max(
      toDays(windows.aviso.unit, windows.aviso.value),
      toDays(windows.alerta.unit, windows.alerta.value),
      toDays(windows.alarma.unit, windows.alarma.value)
    );
    const now = new Date();
    const horizonDate = new Date();
    horizonDate.setDate(horizonDate.getDate() + horizon);

    const docs = await prisma.document.findMany({
      where: { tenantEmpresaId: tenantId, expiresAt: { not: null, lte: horizonDate } },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, entityType: true, entityId: true, expiresAt: true, template: { select: { name: true } } },
    });

    let sent = 0;
    for (const d of docs) {
      sent += await this.processDocumentNotifications(d, windows, templates, now);
    }
    return sent;
  }

  /** Procesa notificaciones para un documento específico */
  private static async processDocumentNotifications(
    d: { id: number; tenantEmpresaId: number; dadorCargaId: number; entityType: string; entityId: number; expiresAt: Date | null; template: { name: string } | null },
    windows: WindowsConfig,
    templates: NotificationTemplates,
    now: Date
  ): Promise<number> {
    const exp = d.expiresAt as Date;
    
    // Cargar datos relacionados
    const dador = await prisma.dadorCarga.findUnique({ 
      where: { id: d.dadorCargaId }, 
      select: { razonSocial: true, phones: true, notifyDadorEnabled: true, notifyDriverEnabled: true } 
    });
    const choferData = await loadChoferData(d.entityType, d.entityId);

    const params = {
      nombre_chofer: choferData.nombre,
      dni_chofer: choferData.dni || (d.entityType === 'CHOFER' ? String(d.entityId) : ''),
      patente_camion: d.entityType === 'CAMION' ? String(d.entityId) : '',
      nombre_dador: dador?.razonSocial || '',
      documento: d.template?.name || 'documento',
      vence_el: exp.toLocaleDateString('es-AR'),
      dias_restantes: Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000*60*60*24))),
      link_portal: '',
    };

    let sent = 0;
    const steps: Array<{key: 'aviso'|'alerta'|'alarma'; win: WindowConfig}> = [
      { key: 'aviso', win: windows.aviso },
      { key: 'alerta', win: windows.alerta },
      { key: 'alarma', win: windows.alarma },
    ];

    for (const st of steps) {
      if (!st.win.enabled) continue;
      const windowStart = this.subtractDuration(exp, st.win.unit, st.win.value);
      if (now < windowStart) continue;

      const tpl = templates[st.key];
      const meta = { tenantId: d.tenantEmpresaId, dadorId: d.dadorCargaId, documentId: d.id };

      // Notificar chofer
      if (tpl.chofer.enabled && dador?.notifyDriverEnabled && choferData.phones.length > 0) {
        const text = this.render(tpl.chofer.text || 'Tu {{documento}} vence el {{vence_el}}', params);
        sent += await sendToPhones(this, choferData.phones, text, { ...meta, audience: 'CHOFER', type: st.key, templateKey: `templates.${st.key}.chofer` }, 3);
      }

      // Notificar dador
      if (tpl.dador.enabled && dador?.notifyDadorEnabled && (dador.phones?.length || 0) > 0) {
        const text = this.render(tpl.dador.text || '{{documento}} vence el {{vence_el}}', params);
        sent += await sendToPhones(this, dador.phones || [], text, { ...meta, audience: 'DADOR', type: st.key, templateKey: `templates.${st.key}.dador` }, 5);
      }
    }
    return sent;
  }

  /**
   * Job: revisar faltantes por requisitos y notificar
   */
  static async checkMissingDocs(tenantId: number): Promise<number> {
    const enabled = await this.getGlobalEnabled(tenantId);
    if (!enabled) return 0;
    // Por simplicidad: buscar equipos y clientes asociados y usar ComplianceService
    const equipos = await prisma.equipo.findMany({ where: { tenantEmpresaId: tenantId }, select: { id: true, dadorCargaId: true, tenantEmpresaId: true } });
    let sent = 0;
    for (const eq of equipos) {
      const clientes = await prisma.equipoCliente.findMany({ where: { equipoId: eq.id, asignadoHasta: null }, select: { clienteId: true } });
      for (const c of clientes) {
        const results = await ComplianceService.evaluateEquipoCliente(eq.id, c.clienteId);
        const faltantes = results.filter(r => r.state === 'FALTANTE');
        if (faltantes.length === 0) continue;
        const dador = await prisma.dadorCarga.findUnique({ where: { id: eq.dadorCargaId }, select: { phones: true, notifyDriverEnabled: true, notifyDadorEnabled: true } });
        const msg = `Faltan documentos requeridos para el equipo #${eq.id}.`;
        if (dador?.notifyDadorEnabled) {
          for (const ms of (dador.phones || []).slice(0,5)) {
            await this.send(ms, msg, { tenantId: eq.tenantEmpresaId, dadorId: eq.dadorCargaId, equipoId: eq.id, audience: 'DADOR', type: 'faltante', templateKey: 'faltante.dador' });
            sent++;
          }
        }
      }
    }
    return sent;
  }

  /**
   * Revisar faltantes para un equipo específico (todas sus vinculaciones vigentes)
   */
  static async checkMissingForEquipo(tenantId: number, equipoId: number): Promise<number> {
    const enabled = await this.getGlobalEnabled(tenantId);
    if (!enabled) return 0;
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, dadorCargaId: true, tenantEmpresaId: true },
    });
    if (!equipo) return 0;
    let sent = 0;
    const clientes = await prisma.equipoCliente.findMany({ where: { equipoId: equipo.id, asignadoHasta: null }, select: { clienteId: true } });
    for (const c of clientes) {
      const results = await ComplianceService.evaluateEquipoCliente(equipo.id, c.clienteId);
      const faltantes = results.filter(r => r.state === 'FALTANTE');
      if (faltantes.length === 0) continue;
      const dador = await prisma.dadorCarga.findUnique({ where: { id: equipo.dadorCargaId }, select: { phones: true, notifyDriverEnabled: true, notifyDadorEnabled: true } });
      const msg = `Faltan documentos requeridos para el equipo #${equipo.id}.`;
      if (dador?.notifyDadorEnabled) {
        for (const ms of (dador.phones || []).slice(0,5)) {
          await this.send(ms, msg, { tenantId: equipo.tenantEmpresaId, dadorId: equipo.dadorCargaId, equipoId: equipo.id, audience: 'DADOR', type: 'faltante', templateKey: 'faltante.dador' });
          sent++;
        }
      }
    }
    return sent;
  }
}


