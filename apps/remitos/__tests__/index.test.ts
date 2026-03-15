/**
 * Tests unitarios para src/index.ts
 * Cobertura de main() y gracefulShutdown()
 * 
 * NOTA: Estos tests usan los mocks globales de __tests__/jest.setup.ts
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../src/config/database', () => ({
  db: {
    connect: jest.fn<any>().mockResolvedValue(undefined),
    disconnect: jest.fn<any>().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({
      remitoSystemConfig: {
        findFirst: jest.fn<any>().mockResolvedValue(null),
        create: jest.fn<any>().mockResolvedValue({}),
      },
    }),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('src/index.ts - Signal Handlers', () => {
  it('U18+U19: signalHandlers_registered', () => {
    const onSpy = jest.spyOn(process, 'on');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/index');
    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
});

describe('src/index.ts - main()', () => {
  let exitSpy: any;
  let envSpy: string;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    Object.defineProperty(process.env, 'ENABLE_REMITOS', {
      get: () => envSpy,
      set: (v: string) => { envSpy = v; },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('U1: main_serviceDisabled_returnsEarly', async () => {
    envSpy = 'false';
    const { main } = await import('../src/index');
    await main();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('U3: main_serviceEnabled_failsWithoutDb', async () => {
    envSpy = 'true';
    let threw = false;
    try {
      const { main } = await import('../src/index');
      await main();
    } catch {
      threw = true;
    }
    expect(threw || exitSpy).toBe(true);
  });
});

describe('src/index.ts - gracefulShutdown()', () => {
  let exitSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('U12: gracefulShutdown_closesAllServices', async () => {
    const { gracefulShutdown } = await import('../src/index');
    await gracefulShutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
