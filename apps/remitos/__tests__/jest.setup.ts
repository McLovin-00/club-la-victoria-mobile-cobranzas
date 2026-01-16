// Setup global de Jest para el workspace remitos.
// Objetivo: evitar conexiones reales (Redis/BullMQ) durante tests.

jest.mock('ioredis');
jest.mock('bullmq');


