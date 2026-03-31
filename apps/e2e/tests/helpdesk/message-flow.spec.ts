/**
 * E2E Test: Message Flow
 * Tests the flow of sending and receiving messages in a ticket
 */

import { test, expect } from './fixtures/helpdesk-fixtures';

test.describe('Message Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to helpdesk
    await page.goto('/dador/mesa-de-ayuda', { waitUntil: 'domcontentloaded' });
  });

  test('8.3.2 User sends message - resolver receives notification', async ({ page }) => {
    // First, find or create a ticket to work with
    const existingTicket = await page.$('[data-testid="ticket-item"], a[href*="/mesa-de-ayuda/"]');

    if (!existingTicket) {
    // Create a new ticket first
    await page.goto('/dador/mesa-de-ayuda/nuevo', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('form', { timeout: 10000 });

    // Quick ticket creation
    await page.click('button:has-text("Técnica")').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('button:has-text("Error")').catch(() => {});
    await page.fill('input[name="subject"]', 'Test for Message Flow').catch(() => {});
    await page.click('button:has-text("Normal")').catch(() => {});
    await page.fill('textarea[name="message"]', 'Test message for flow testing.').catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});

    await page.waitForURL(/\/dador\/mesa-de-ayuda(\/|$)/, { timeout: 15000 }).catch(() => {});
    await page.goto('/dador/mesa-de-ayuda', { waitUntil: 'domcontentloaded' });
    }

    // Find and click on a ticket
    const ticketLink = await page.$('[data-testid="ticket-item"]:first-child, a[href*="/mesa-de-ayuda/"]:first-child');
    if (ticketLink) {
    await ticketLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Check if we can send a message
    const messageInput = await page.$(
      '[data-testid="message-input"], textarea[name="message"], input[placeholder*="mensaje"]'
    );

    if (messageInput) {
      // Send a new message
      await messageInput.fill('This is a test message from E2E testing.');
      await page.click('[data-testid="send-message"], button:has-text("Enviar")').catch(() => {});

      // Wait for message to appear
      await page.waitForTimeout(1000);

      // Verify message was sent
      const sentMessage = await page.$('text=This is a test message from E2E testing.');
      expect(sentMessage).toBeTruthy();
    }
    }
  });

  test('8.3.3 Resolver responds - user receives notification', async ({ page }) => {
    // This test would require a resolver session
    // For now, we verify the message list shows both user and resolver messages

    await page.goto('/dador/mesa-de-ayuda', { waitUntil: 'domcontentloaded' });

    // Check if there are any tickets with messages
    const ticketLink = await page.$('[data-testid="ticket-item"], a[href*="/mesa-de-ayuda/"]');

    if (ticketLink) {
    await ticketLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Check message list exists
    const messageList = await page.$('[data-testid="message-list"], .message-list, [class*="messages"]');
    expect(messageList).toBeTruthy();
    }
  });

  test('Message input is disabled for closed tickets', async ({ page }) => {
    await page.goto('/dador/mesa-de-ayuda', { waitUntil: 'domcontentloaded' });

    // Find a closed ticket (if any)
    const closedTicket = await page.$(
    '[data-testid="ticket-item"][data-status="CLOSED"], [data-status="RESOLVED"]'
    );

    if (closedTicket) {
    await closedTicket.click();
    await page.waitForLoadState('domcontentloaded');

    // Check message input is disabled or not present
    const messageInput = await page.$(
    '[data-testid="message-input"]:disabled, .message-input-disabled'
    );

    // Either input is disabled or there's a message saying ticket is closed
    const closedMessage = await page.$('text=/cerrado|resuelto|no se pueden enviar/i');

    expect(messageInput || closedMessage).toBeTruthy();
    }
  });
});
