# Design: helpdesk-testing-coverage

## Architecture Overview

### Test Directory Structure

```
apps/helpdesk/src/__tests__/
├── unit/                           # Unit tests (60%)
│   ├── controllers/                # Controllers (0% → ≥80%)
│   ├── services/                   # Services (13% → ≥80%)
│   ├── middlewares/                # Middlewares (0% → ≥80%)
│   ├── bot/                        # Bot handlers (~0% → ≥80%)
│   └── workers/                    # Workers (0% → ≥80%)
├── integration/                     # Integration tests (30%)
│   ├── routes/                     # Route integration tests
│   └── bot/                        # Bot integration tests
├── e2e/                             # E2E tests (10%)
│   └── flows/
├── __mocks__/                       # Mock implementations
├── __fixtures__/                    # Test fixtures
├── factories/                       # Factory functions
└── helpers/                         # Test utilities
```

### Component Coverage Matrix

| Component | Current | Target | Est. Tests |
|-----------|---------|--------|------------|
| Controllers (4) | 0% | ≥80% | 40-50 |
| Services (8) | 13% | ≥80% | 70-90 |
| Middlewares (3) | 0% | ≥80% | 15-20 |
| Routes (3) | 0% | ≥80% | 30-40 |
| Bot Handlers (3) | ~0% | ≥80% | 30-40 |
| Workers (2) | 0% | ≥80% | 20-25 |
| Total Unit | 21% | ≥80% | 174-280 |
| Integration | 0% | ≥80% | 75-100 |
| E2E | 0% | ≥80% | 60-120 |

Testing Mix: 60% Unit, 30% Integration, 10% E2E

---

## Testing Infrastructure

### Jest Configuration

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Test Setup

**File**: `src/__tests__/jest.setup.ts`

```typescript
// Global setup
process.env.NODE_ENV = 'test';
process.env.HELPDESK_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_helpdesk?schema=helpdesk';

// Test database
let prisma: PrismaClient;

beforeEach(async () => {
  const db = await getTestDatabase();
  prisma = db.prisma;
  await clearTestDatabase();
});

afterEach(async () => {
  await prisma.$disconnect();
});

afterAll(async () => {
  await globalPrisma.$disconnect();
});

// Utilities
export { prisma, setupTestDatabase, clearTestDatabase };
```

### Test Database (Integration Tests)

**File**: `src/__tests__/test-database.ts`

```typescript
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getTestDatabase() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  return prisma;
}

export async function clearTestDatabase() {
  const db = getTestDatabase();
  await db.$executeRaw`TRUNCATE TABLE "Ticket", "TicketMessage", "MessageAttachment", "User", "ResolverConfig", "HelpdeskConfig" RESTART IDENTITY CASCADE;`;
}

export async function seedTestDatabase() {
  const db = getTestDatabase();
  
  const users = await Promise.all([
    db.user.create({ data: { id: 'user-1', email: 'user1@test.com', role: 'USER' } }),
    db.user.create({ data: { id: 'user-2', email: 'user2@test.com', role: 'ADMIN' } }),
    db.user.create({ data: { id: 'user-3', email: 'user3@test.com', role: 'SUPERADMIN' } })
  ]);
  
  await db.helpdeskConfig.upsert({
    where: { id: 'config-1' },
    update: {},
    create: { id: 'config-1', autoCloseHours: 72 }
  });
  
  return { prisma: db, users };
}
```

### E2E Test Infrastructure (Playwright)

**File**: `apps/e2e/tests/helpdesk/helpdesk-e2e.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/helpdesk',
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:4803',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4803',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

---

## Mock Strategy

### Telegram Bot Mock

```typescript
import TelegramBot from 'grammy';

export const createTelegramBotMock = (): TelegramBot => {
  const mockBot = new TelegramBot('test-bot-token', {
    polling: false
  }) as any;

  mockBot.api.sendPhoto = jest.fn().mockResolvedValue({
    message_id: 123,
    photo: [{ file_id: 'photo-123' }]
  });
  
  mockBot.api.sendDocument = jest.fn().mockResolvedValue({
    message_id: 124,
    document: { file_id: 'doc-123' }
  });
  
  mockBot.api.sendMessage = jest.fn().mockResolvedValue({
    message_id: 125,
    text: 'Test message'
  });
  
  mockBot.api.getChat = jest.fn().mockResolvedValue({
    id: -1001234567890,
    type: 'supergroup',
    title: 'Test Group'
  });
  
  mockBot.api.getChatMember = jest.fn().mockResolvedValue({
    status: 'member',
    user: { id: 123456789 }
  });
  
  return mockBot;
};
```

### MinIO Mock

```typescript
import { MinioClient } from 'minio';

export const createMinioMock = (): MinioClient => {
  const mockClient = {
    putObject: jest.fn().mockResolvedValue({ etag: 'test-etag' }),
    getObject: jest.fn().mockResolvedValue({ stream: {} as any }),
    statObject: jest.fn().mockResolvedValue({ size: 1024, metaData: {} }),
    removeObject: jest.fn().mockResolvedValue(undefined),
    bucketExists: jest.fn().mockResolvedValue(true)
  } as any;

  return mockClient;
};

export const FILE_LIMITS = {
  image: 10 * 1024 * 1024,      // 10MB
  audio: 25 * 1024 * 1024,      // 25MB
  video: 50 * 1024 * 1024,      // 50MB
  document: 25 * 1024 * 1024    // 25MB
};
```

### Redis Mock

```typescript
import Redis from 'ioredis';

export const createRedisMock = (): Redis => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue('mocked-value'),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    rpop: jest.fn().mockResolvedValue('item'),
    hset: jest.fn().mockResolvedValue('OK'),
    hget: jest.fn().mockResolvedValue('value'),
    hmset: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK')
  } as any;

  return mockRedis;
};
```

### BullMQ Queue Mock

```typescript
import Queue from 'bull';

export const createQueueMock = <T = any>(name: string): Queue<T> => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    process: jest.fn(),
    jobs: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue(0)
  } as any;

  return mockQueue;
};
```

### Database Mocking Strategy

**Unit Tests**: Use mocked Prisma client
```typescript
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    ticket: { create: jest.fn(), findUnique: jest.fn(), // ... other methods }
  }))
}));
```

**Integration Tests**: Use real database with seed/clear

### Time/Date Mocking

```typescript
import { jest } from '@jest/globals';

export const mockTime = (timeString: string) => {
  jest.useFakeTimers().setSystemTime(new Date(timeString).getTime());
};

export const resetTime = () => {
  jest.useRealTimers();
};

export const createPastDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const create72HoursAgo = () => {
  return createPastDate(72);
};
```

---

## Test Utilities Design

### Factory Functions

**File**: `src/__tests__/factories/ticket.factory.ts`

```typescript
import { Ticket } from '@prisma/client';

con
