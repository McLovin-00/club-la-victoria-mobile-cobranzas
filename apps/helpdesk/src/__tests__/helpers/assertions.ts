/**
 * Custom Assertion Helpers for Unit Tests
 * Provides custom matchers and assertion utilities for helpdesk tests
 */

import { TicketStatus, TicketPriority, TicketCategory } from '@helpdesk/prisma-client';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Assert that a response has the expected success structure
 */
export function assertSuccessResponse(response: any, expectData: boolean = true): void {
  expect(response).toBeDefined();
  expect(response.body).toBeDefined();
  expect(response.body.success).toBe(true);
  
  if (expectData) {
    expect(response.body.data).toBeDefined();
  }
}

/**
 * Assert that a response has the expected error structure
 */
export function assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string): void {
  expect(response).toBeDefined();
  expect(response.body).toBeDefined();
  expect(response.body.success).toBe(false);
  expect(response.status).toBe(expectedStatus);
  
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
}

/**
 * Assert that a ticket has the expected status
 */
export function assertTicketStatus(ticket: any, expectedStatus: TicketStatus): void {
  expect(ticket).toBeDefined();
  expect(ticket.status).toBe(expectedStatus);
}

/**
 * Assert that a ticket has the expected priority
 */
export function assertTicketPriority(ticket: any, expectedPriority: TicketPriority): void {
  expect(ticket).toBeDefined();
  expect(ticket.priority).toBe(expectedPriority);
}

/**
 * Assert that a ticket has the expected category
 */
export function assertTicketCategory(ticket: any, expectedCategory: TicketCategory): void {
  expect(ticket).toBeDefined();
  expect(ticket.category).toBe(expectedCategory);
}

/**
 * Assert that a pagination response has the correct structure
 */
export function assertPaginationResponse(
  response: any, 
  expectedPage: number, 
  expectedLimit: number,
  expectedTotal?: number
): void {
  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.page).toBe(expectedPage);
  expect(response.body.limit).toBe(expectedLimit);
  expect(typeof response.body.total).toBe('number');
  expect(typeof response.body.totalPages).toBe('number');
  
  if (expectedTotal !== undefined) {
    expect(response.body.total).toBe(expectedTotal);
  }
}

/**
 * Assert that a message has the expected sender type
 */
export function assertMessageSenderType(message: any, expectedType: 'USER' | 'RESOLVER' | 'SYSTEM'): void {
  expect(message).toBeDefined();
  expect(message.senderType).toBe(expectedType);
}

/**
 * Assert that a message has attachments
 */
export function assertMessageHasAttachments(message: any, expectedCount?: number): void {
  expect(message).toBeDefined();
  expect(message.attachments).toBeDefined();
  expect(Array.isArray(message.attachments)).toBe(true);
  
  if (expectedCount !== undefined) {
    expect(message.attachments.length).toBe(expectedCount);
  } else {
    expect(message.attachments.length).toBeGreaterThan(0);
  }
}

/**
 * Assert that an object has a valid CUID
 */
export function assertValidCuid(id: any): void {
  expect(typeof id).toBe('string');
  expect(id).toMatch(/^c[a-z0-9]{24}$/);
}

/**
 * Assert that a date is recent (within last N seconds)
 */
export function assertRecentDate(date: any, withinSeconds: number = 10): void {
  expect(date).toBeDefined();
  const parsedDate = new Date(date);
  expect(parsedDate).toBeInstanceOf(Date);
  expect(parsedDate.getTime()).toBeGreaterThan(Date.now() - withinSeconds * 1000);
}

/**
 * Assert that a user owns a resource (by comparing empresaId)
 */
export function assertUserOwnsResource(user: any, resource: any): void {
  expect(user.empresaId).toBe(resource.empresaId);
}

/**
 * Assert that a response contains validation errors
 */
export function assertValidationErrors(response: any, expectedFields?: string[]): void {
  assertErrorResponse(response, 400);
  expect(response.body.errors).toBeDefined();
  
  if (expectedFields) {
    const errorFields = response.body.errors.map((e: any) => e.field || e.path);
    expectedFields.forEach(field => {
      expect(errorFields).toContain(field);
    });
  }
}

/**
 * Assert that a mock function was called with specific user context
 */
export function assertCalledWithUser(mockFn: any, user: any): void {
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: user.id,
      role: user.role,
      empresaId: user.empresaId,
    })
  );
}

/**
 * Assert that two arrays have the same IDs (regardless of order)
 */
export function assertSameIds(actual: any[], expected: any[]): void {
  const actualIds = actual.map(item => item.id).sort();
  const expectedIds = expected.map(item => item.id).sort();
  expect(actualIds).toEqual(expectedIds);
}

/**
 * Assert that a ticket is open (OPEN or IN_PROGRESS)
 */
export function assertTicketIsOpen(ticket: any): void {
  expect(['OPEN', 'IN_PROGRESS']).toContain(ticket.status);
}

/**
 * Assert that a ticket is closed (RESOLVED or CLOSED)
 */
export function assertTicketIsClosed(ticket: any): void {
  expect(['RESOLVED', 'CLOSED']).toContain(ticket.status);
}

/**
 * Create a custom matcher for Jest
 */
export function createCustomMatcher<T>(
  name: string,
  check: (received: T, ...expected: any[]) => boolean,
  passMessage: (received: T, ...expected: any[]) => string,
  failMessage: (received: T, ...expected: any[]) => string
) {
  return {
    [name]: (received: T, ...expected: any[]) => {
      const pass = check(received, ...expected);
      return {
        pass,
        message: () => pass ? passMessage(received, ...expected) : failMessage(received, ...expected),
      };
    },
  };
}
