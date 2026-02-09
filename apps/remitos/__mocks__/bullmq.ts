// Mock global de bullmq para evitar conexiones reales en tests.
// Exponemos helpers para inspección desde tests.

let lastProcessor: any = null;

export function __getLastProcessor() {
  return lastProcessor;
}

export class Queue<_T = any> {
  public add = jest.fn(async () => ({ id: 'job-mock' }));
  public close = jest.fn(async () => undefined);
  constructor(_name: string, _opts: any) { }
}

export class Worker<_T = any> {
  public close = jest.fn(async () => undefined);
  public on = jest.fn();
  constructor(_name: string, processor: any, _opts: any) {
    lastProcessor = processor;
  }
}

export type Job<T = any> = { id: string; data: T };


