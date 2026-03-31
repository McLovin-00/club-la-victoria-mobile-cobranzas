/**
 * Helpdesk E2E Test Fixtures
 * Provides test utilities and helpers specific to helpdesk tests
 */

import { test as base, expect, Page } from '@playwright/test';

export interface HelpdeskTicket {
  id: string;
  number: number;
  category: 'TECHNICAL' | 'OPERATIONAL';
  subcategory: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface HelpdeskMessage {
  id: string;
  ticketId: string;
  content: string;
  senderId: number;
  senderName: string;
}

type HelpdeskFixtures = {
  helpdeskPage: Page;
  createTicket: (data: Partial<HelpdeskTicket>) => Promise<HelpdeskTicket>;
};

/**
 * Extended test with helpdesk-specific fixtures
 */
export const test = base.extend<HelpdeskFixtures>({
  helpdeskPage: async ({ page }, use) => {
    // Navigate to helpdesk section
    await page.goto('/dador/mesa-de-ayuda', { waitUntil: 'domcontentloaded' });
    await use(page);
  },

  createTicket: async ({ page }, use) => {
    const create = async (data: Partial<HelpdeskTicket>): Promise<HelpdeskTicket> => {
    // Navigate to create ticket form
    await page.goto('/dador/mesa-de-ayuda/nuevo', { waitUntil: 'domcontentloaded' });

    // Fill ticket form
    if (data.category) {
    await page.click(`[data-testid="category-${data.category}"]`);
    }
    if (data.subject) {
    await page.fill('[data-testid="ticket-subject"]', data.subject);
    }
    if (data.subcategory) {
    await page.click(`[data-testid="subcategory-${data.subcategory}"]`);
    }
    if (data.priority) {
    await page.click(`[data-testid="priority-${data.priority}"]`);
    }

    // Submit form
    await page.click('[data-testid="submit-ticket"]');

    // Wait for success
    await page.waitForURL(/\/dador\/mesa-de-ayuda\/\d+/, { timeout: 10000 });

    // Extract ticket data from URL
    const url = page.url();
    const ticketId = url.split('/').pop() || '';

    return {
    id: ticketId,
    number: 0,
    category: data.category || 'TECHNICAL',
    subcategory: data.subcategory || 'ERROR',
    subject: data.subject || '',
    status: 'OPEN',
    priority: data.priority || 'NORMAL',
    };
    };

    await use(create);
  },
});

export { expect };

/**
 * Helper to wait for ticket list to load
 */
export async function waitForTicketList(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="ticket-list"]', { timeout: 10000 });
}

/**
 * Helper to get ticket count from list
 */
export async function getTicketCount(page: Page): Promise<number> {
  const tickets = await page.$$('[data-testid="ticket-item"]');
  return tickets.length;
}

/**
 * Helper to check if ticket exists in list
 */
export async function ticketExistsInList(page: Page, ticketNumber: number): Promise<boolean> {
  const ticket = await page.$(`[data-testid="ticket-${ticketNumber}"]`);
  return ticket !== null;
}
