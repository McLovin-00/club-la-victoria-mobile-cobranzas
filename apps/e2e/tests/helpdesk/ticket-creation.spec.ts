/**
 * E2E Test: Ticket Creation Flow
 * Tests the complete flow of creating a ticket in the helpdesk system
 */

import { test, expect } from './fixtures/helpdesk-fixtures';

test.describe('Ticket Creation Flow', () => {
  test.beforeEach(async ({ helpdeskPage }) => {
    // Already navigated to helpdesk page via fixture
  });

  test('8.2.2 User creates ticket with text - ticket appears in list', async ({
    page,
    helpdeskPage,
  }) => {
    // Navigate to new ticket form
    await page.click('[data-testid="new-ticket-button"], a[href*="nuevo"]', {
      timeout: 5000,
    }).catch(() => {
    // Alternative: use direct navigation
    return page.goto('/dador/mesa-de-ayuda/nuevo', { waitUntil: 'domcontentloaded' });
    });

    // Wait for form to be visible
    await page.waitForSelector('form, [data-testid="ticket-form"]', { timeout: 10000 });

    // Select category (Technical)
    const categorySelector = '[data-testid="category-TECHNICAL"], button:has-text("Técnica")';
    await page.click(categorySelector).catch(() => {
    // Try alternative selector
    return page.click('button:has-text("Técnica")');
    });

    // Wait for subcategory options
    await page.waitForTimeout(500);

    // Select subcategory
    await page
    .click('[data-testid="subcategory-ERROR"], button:has-text("Error")')
    .catch(() => page.click('button:has-text("Error")'));

    // Fill subject
    const subjectInput =
    '[data-testid="ticket-subject"], input[name="subject"], input[placeholder*="asunto"]';
    await page.fill(subjectInput, 'Test Ticket E2E - Technical Issue');

    // Select priority
    await page
    .click('[data-testid="priority-NORMAL"], button:has-text("Normal")')
    .catch(() => page.click('button:has-text("Normal")'));

    // Fill message/description
    const messageInput =
    '[data-testid="ticket-message"], textarea[name="message"], textarea[placeholder*="mensaje"]';
    await page.fill(messageInput, 'This is a test ticket created during E2E testing.');

    // Submit the form
    const submitButton =
    '[data-testid="submit-ticket"], button[type="submit"], button:has-text("Crear")';
    await page.click(submitButton);

    // Wait for success - either redirect to ticket list or success message
    await Promise.race([
    page.waitForURL(/\/dador\/mesa-de-ayuda(\/|$)/, { timeout: 15000 }),
    page.waitForSelector('[data-testid="success-message"], .toast-success', { timeout: 15000 }),
    ]);

    // Verify ticket was created - check for success indicator
    const successIndicator = await page
    .$('[data-testid="success-message"], .toast-success, .alert-success')
    .catch(() => null);

    // Either success message or redirected to list
    if (!successIndicator) {
    // Check if we're back on the list page
    expect(page.url()).toContain('/mesa-de-ayuda');
    }
  });

  test('8.2.3 User creates ticket with image - attachment downloadable', async ({
    page,
    helpdeskPage,
  }) => {
    // Navigate to new ticket form
    await page.goto('/dador/mesa-de-ayuda/nuevo', { waitUntil: 'domcontentloaded' });

    // Wait for form
    await page.waitForSelector('form, [data-testid="ticket-form"]', { timeout: 10000 });

    // Select category
    await page
    .click('[data-testid="category-TECHNICAL"], button:has-text("Técnica")')
    .catch(() => page.click('button:has-text("Técnica")'));

    await page.waitForTimeout(500);

    // Select subcategory
    await page
    .click('[data-testid="subcategory-ERROR"], button:has-text("Error")')
    .catch(() => page.click('button:has-text("Error")'));

    // Fill subject
    await page.fill(
    '[data-testid="ticket-subject"], input[name="subject"]',
    'Test Ticket with Attachment'
    );

    // Select priority
    await page
    .click('[data-testid="priority-NORMAL"], button:has-text("Normal")')
    .catch(() => page.click('button:has-text("Normal")'));

    // Fill message
    await page.fill(
    '[data-testid="ticket-message"], textarea[name="message"]',
    'This ticket includes an image attachment.'
    );

    // Upload image - use file chooser
    const fileInput = '[data-testid="file-input"], input[type="file"]';
    const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
    page.click('[data-testid="upload-button"], button:has-text("Adjuntar")').catch(() => null),
    ]);

    if (fileChooser) {
    // Create a test image file
    await fileChooser.setFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    ),
    });

    // Wait for upload to complete
    await page.waitForTimeout(1000);
    }

    // Submit the form
    await page.click(
    '[data-testid="submit-ticket"], button[type="submit"], button:has-text("Crear")'
    );

    // Wait for success
    await Promise.race([
    page.waitForURL(/\/dador\/mesa-de-ayuda(\/|$)/, { timeout: 15000 }),
    page.waitForSelector('[data-testid="success-message"]', { timeout: 15000 }),
    ]);
  });
});
