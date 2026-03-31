jest.mock('@helpdesk/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

import { db, prisma } from '../../config/database';

describe('Database Configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('db.connect', () => {
    it('should connect to database', async () => {
      prisma.$connect = jest.fn().mockResolvedValue(undefined);

      await db.connect();

      expect(prisma.$connect).toHaveBeenCalled();
    });

    it('should throw and log error on connection failure', async () => {
      const error = new Error('Connection failed');
      prisma.$connect = jest.fn().mockRejectedValue(error);

      await expect(db.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('db.disconnect', () => {
    it('should disconnect from database', async () => {
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      await db.disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('should throw and log error on disconnect failure', async () => {
      const error = new Error('Disconnect failed');
      prisma.$disconnect = jest.fn().mockRejectedValue(error);

      await expect(db.disconnect()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('db.getClient', () => {
    it('should return the PrismaClient instance', () => {
      const client = db.getClient();
      expect(client).toBe(prisma);
    });
  });
});
