/**
 * Propósito: Page Object del detalle de aprobación (/documentos/aprobacion/:id).
 * Basado en: monorepo-bca/apps/frontend/src/features/documentos/pages/ApprovalDetailPage.tsx
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class AprobacionDetallePage {
  readonly page: Page;

  readonly btnVolver: Locator;
  readonly titulo: Locator;

  readonly btnAprobar: Locator;
  readonly btnRechazar: Locator;
  readonly inputMotivoRechazo: Locator;
  readonly btnConfirmarRechazo: Locator;

  readonly selectEntidad: Locator;
  readonly inputEntidadId: Locator;
  readonly inputVencimiento: Locator;
  readonly selectTemplate: Locator;
  readonly textareaNotas: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnVolver = page.getByRole('button', { name: /Volver/i });
    this.titulo = page.getByRole('heading').first();

    this.btnAprobar = page.getByRole('button', { name: /Aprobar/i });
    this.btnRechazar = page.getByRole('button', { name: /Rechazar/i });

    // Campos editables (heurísticos; la UI exacta puede variar)
    this.selectEntidad = page.locator('select').first();
    this.inputEntidadId = page.locator('input').filter({ hasNotText: '' }).first();
    this.inputVencimiento = page.locator('input[type="text"], input[type="date"]').first();
    this.selectTemplate = page.locator('select').nth(1);
    this.textareaNotas = page.locator('textarea').first();

    // Modal rechazo (si existe)
    this.inputMotivoRechazo = page.getByLabel(/Motivo de rechazo/i).or(page.locator('textarea').first());
    this.btnConfirmarRechazo = page.getByRole('button', { name: /Confirmar Rechazo/i });
  }

  async goto(id: number) {
    await this.page.goto(`/documentos/aprobacion/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(this.btnVolver).toBeVisible();
  }
}


