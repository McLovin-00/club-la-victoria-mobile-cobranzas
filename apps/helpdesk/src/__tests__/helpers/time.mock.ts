/**
 * Time/Date Mocking Utilities for Unit Tests
 * Provides helpers for controlling time in tests
 */

import { jest } from '@jest/globals';

/**
 * Mock the system time to a specific date/time
 * @param timeString - ISO date string or Date object
 */
export function mockTime(timeString: string | Date): void {
  jest.useFakeTimers().setSystemTime(new Date(timeString).getTime());
}

/**
 * Reset time mocking back to real timers
 */
export function resetTime(): void {
  jest.useRealTimers();
}

/**
 * Create a date that is N days in the past from now
 */
export function createPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Create a date that is N days in the future from now
 */
export function createFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * Create a date that is N hours in the past from now
 */
export function createPastHours(hoursAgo: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date;
}

/**
 * Create a date that is N hours in the future from now
 */
export function createFutureHours(hoursFromNow: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

/**
 * Create a date exactly 72 hours ago (auto-close threshold)
 */
export function create72HoursAgo(): Date {
  return createPastHours(72);
}

/**
 * Create a date exactly 71 hours ago (just within auto-close threshold)
 */
export function create71HoursAgo(): Date {
  return createPastHours(71);
}

/**
 * Create a date exactly 73 hours ago (just outside auto-close threshold)
 */
export function create73HoursAgo(): Date {
  return createPastHours(73);
}

/**
 * Create a date at a specific time today
 * @param hours - Hour (0-23)
 * @param minutes - Minutes (0-59)
 * @param seconds - Seconds (0-59)
 */
export function createTodayAt(hours: number, minutes: number = 0, seconds: number = 0): Date {
  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

/**
 * Freeze time at a specific point and return a function to unfreeze
 */
export function freezeTime(at: Date = new Date()): () => void {
  const originalDateNow = Date.now;
  const frozenTime = at.getTime();
  
  Date.now = jest.fn(() => frozenTime);
  
  return () => {
    Date.now = originalDateNow;
  };
}

/**
 * Advance time by a specified number of milliseconds
 * Only works when using fake timers (after calling mockTime)
 */
export function advanceTime(ms: number): void {
  jest.advanceTimersByTime(ms);
}

/**
 * Advance time by a specified number of hours
 * Only works when using fake timers (after calling mockTime)
 */
export function advanceHours(hours: number): void {
  jest.advanceTimersByTime(hours * 60 * 60 * 1000);
}

/**
 * Advance time by a specified number of days
 * Only works when using fake timers (after calling mockTime)
 */
export function advanceDays(days: number): void {
  jest.advanceTimersByTime(days * 24 * 60 * 60 * 1000);
}

/**
 * Run all pending timers
 * Only works when using fake timers (after calling mockTime)
 */
export function runAllTimers(): void {
  jest.runAllTimers();
}

/**
 * Run only pending timers that are currently scheduled
 * Only works when using fake timers (after calling mockTime)
 */
export function runOnlyPendingTimers(): void {
  jest.runOnlyPendingTimers();
}

/**
 * Clear all pending timers
 * Only works when using fake timers (after calling mockTime)
 */
export function clearAllTimers(): void {
  jest.clearAllTimers();
}

/**
 * Get a formatted ISO string for a date (useful for snapshots)
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Common test dates
 */
export const TEST_DATES = {
  /** A fixed date for consistent test results: 2024-01-15 10:30:00 UTC */
  fixed: new Date('2024-01-15T10:30:00.000Z'),
  
  /** Start of year 2024 UTC */
  yearStart: new Date('2024-01-01T00:00:00.000Z'),
  
  /** Mid-year 2024 UTC */
  yearMid: new Date('2024-07-01T12:00:00.000Z'),
  
  /** End of year 2024 UTC */
  yearEnd: new Date('2024-12-31T23:59:59.000Z'),
};
