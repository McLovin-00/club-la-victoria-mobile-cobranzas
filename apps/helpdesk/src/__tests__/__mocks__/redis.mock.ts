/**
 * Redis Client Mock for Unit Tests
 * Provides mock implementations of ioredis methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockRedisClient {
  get: any;
  set: any;
  del: any;
  exists: any;
  expire: any;
  ttl: any;
  incr: any;
  decr: any;
  incrby: any;
  hset: any;
  hget: any;
  hgetall: any;
  hdel: any;
  hexists: any;
  lpush: any;
  rpush: any;
  lpop: any;
  rpop: any;
  lrange: any;
  llen: any;
  sadd: any;
  srem: any;
  smembers: any;
  sismember: any;
  zadd: any;
  zrem: any;
  zrange: any;
  zscore: any;
  publish: any;
  subscribe: any;
  unsubscribe: any;
  on: any;
  quit: any;
  disconnect: any;
  ping: any;
  status: string;
}

/**
 * Create a mock Redis client instance
 */
export function createRedisMock(): MockRedisClient {
  const mockFn = (): any => jest.fn();
  const store: Record<string, any> = {};
  const hashStore: Record<string, Record<string, any>> = {};
  const listStore: Record<string, any[]> = {};
  const setStore: Record<string, Set<any>> = {};

  return {
    get: mockFn().mockImplementation((key: string) => Promise.resolve(store[key] ?? null)),
    
    set: mockFn().mockImplementation((key: string, value: any) => {
      store[key] = value;
      return Promise.resolve('OK');
    }),
    
    del: mockFn().mockImplementation((key: string) => {
      const existed = key in store;
      delete store[key];
      return Promise.resolve(existed ? 1 : 0);
    }),
    
    exists: mockFn().mockImplementation((key: string) => 
      Promise.resolve(key in store ? 1 : 0)
    ),
    
    expire: mockFn().mockResolvedValue(1),
    
    ttl: mockFn().mockResolvedValue(-1),
    
    incr: mockFn().mockImplementation((key: string) => {
      store[key] = (parseInt(store[key]) || 0) + 1;
      return Promise.resolve(store[key]);
    }),
    
    decr: mockFn().mockImplementation((key: string) => {
      store[key] = (parseInt(store[key]) || 0) - 1;
      return Promise.resolve(store[key]);
    }),
    
    incrby: mockFn().mockImplementation((key: string, amount: number) => {
      store[key] = (parseInt(store[key]) || 0) + amount;
      return Promise.resolve(store[key]);
    }),
    
    hset: mockFn().mockImplementation((key: string, field: string, value: any) => {
      if (!hashStore[key]) {
        hashStore[key] = {};
      }
      const isNew = !(field in hashStore[key]);
      hashStore[key][field] = value;
      return Promise.resolve(isNew ? 1 : 0);
    }),
    
    hget: mockFn().mockImplementation((key: string, field: string) => 
      Promise.resolve(hashStore[key]?.[field] ?? null)
    ),
    
    hgetall: mockFn().mockImplementation((key: string) => 
      Promise.resolve(hashStore[key] ?? {})
    ),
    
    hdel: mockFn().mockImplementation((key: string, field: string) => {
      if (hashStore[key] && field in hashStore[key]) {
        delete hashStore[key][field];
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),
    
    hexists: mockFn().mockImplementation((key: string, field: string) => 
      Promise.resolve(hashStore[key]?.[field] !== undefined ? 1 : 0)
    ),
    
    lpush: mockFn().mockImplementation((key: string, value: any) => {
      if (!listStore[key]) {
        listStore[key] = [];
      }
      listStore[key].unshift(value);
      return Promise.resolve(listStore[key].length);
    }),
    
    rpush: mockFn().mockImplementation((key: string, value: any) => {
      if (!listStore[key]) {
        listStore[key] = [];
      }
      listStore[key].push(value);
      return Promise.resolve(listStore[key].length);
    }),
    
    lpop: mockFn().mockImplementation((key: string) => {
      if (listStore[key] && listStore[key].length > 0) {
        return Promise.resolve(listStore[key].shift());
      }
      return Promise.resolve(null);
    }),
    
    rpop: mockFn().mockImplementation((key: string) => {
      if (listStore[key] && listStore[key].length > 0) {
        return Promise.resolve(listStore[key].pop());
      }
      return Promise.resolve(null);
    }),
    
    lrange: mockFn().mockImplementation((key: string, start: number, stop: number) => {
      if (!listStore[key]) {
        return Promise.resolve([]);
      }
      const end = stop === -1 ? listStore[key].length : stop + 1;
      return Promise.resolve(listStore[key].slice(start, end));
    }),
    
    llen: mockFn().mockImplementation((key: string) => 
      Promise.resolve(listStore[key]?.length ?? 0)
    ),
    
    sadd: mockFn().mockImplementation((key: string, member: any) => {
      if (!setStore[key]) {
        setStore[key] = new Set();
      }
      const sizeBefore = setStore[key].size;
      setStore[key].add(member);
      return Promise.resolve(setStore[key].size > sizeBefore ? 1 : 0);
    }),
    
    srem: mockFn().mockImplementation((key: string, member: any) => {
      if (!setStore[key]) {
        return Promise.resolve(0);
      }
      const sizeBefore = setStore[key].size;
      setStore[key].delete(member);
      return Promise.resolve(setStore[key].size < sizeBefore ? 1 : 0);
    }),
    
    smembers: mockFn().mockImplementation((key: string) => 
      Promise.resolve(setStore[key] ? Array.from(setStore[key]) : [])
    ),
    
    sismember: mockFn().mockImplementation((key: string, member: any) => 
      Promise.resolve(setStore[key]?.has(member) ? 1 : 0)
    ),
    
    zadd: mockFn().mockResolvedValue(1),
    
    zrem: mockFn().mockResolvedValue(1),
    
    zrange: mockFn().mockResolvedValue([]),
    
    zscore: mockFn().mockResolvedValue(null),
    
    publish: mockFn().mockResolvedValue(1),
    
    subscribe: mockFn().mockResolvedValue(undefined),
    
    unsubscribe: mockFn().mockResolvedValue(undefined),
    
    on: mockFn().mockReturnThis(),
    
    quit: mockFn().mockResolvedValue('OK'),
    
    disconnect: mockFn().mockReturnValue(undefined),
    
    ping: mockFn().mockResolvedValue('PONG'),
    
    status: 'ready',
  };
}

/**
 * Mock for Redis errors
 */
export class MockRedisError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'RedisError';
    this.code = code;
  }
}

/**
 * Common Redis error factories
 */
export const RedisErrors = {
  ConnectionError: () => 
    new MockRedisError('Connection refused', 'ECONNREFUSED'),
  
  TimeoutError: () => 
    new MockRedisError('Command timed out', 'ETIMEDOUT'),
  
  NoScriptError: () => 
    new MockRedisError('No matching script. Please use EVAL.', 'NOSCRIPT'),
};
