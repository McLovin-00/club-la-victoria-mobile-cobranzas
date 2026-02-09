// Setup global para tests del backend: evita fallos por env JWT faltante y side-effects de Prisma.
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar env desde la raíz para consistencia en tests
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Para que src/config/environment.ts no tire error al importarse en tests.
process.env.JWT_LEGACY_SECRET = process.env.JWT_LEGACY_SECRET || 'test-legacy-secret';
process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || 'test-public-key';
process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'test-private-key';

// En este repo hay imports a `bcrypt` (native) que no tiene build para el runtime actual de Windows/Node.
// Para tests, lo reemplazamos por `bcryptjs` (pure JS).
jest.mock('bcrypt', () => require('bcryptjs'));


