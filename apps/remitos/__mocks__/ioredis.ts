// Mock global de ioredis para evitar conexiones reales en tests.

type RedisLike = {
  quit: jest.Mock<any, any>;
  on: jest.Mock<any, any>;
};

function createRedisMock(): RedisLike {
  return {
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
}

export default function IORedis(): RedisLike {
  return createRedisMock();
}


