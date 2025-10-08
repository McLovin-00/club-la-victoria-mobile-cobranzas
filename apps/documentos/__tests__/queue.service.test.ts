const { queueService } = require('../dist/services/queue.service');

describe('QueueService', () => {
  it('calculatePriority returns number', () => {
    const p1 = queueService["calculatePriority"]('EMPRESA');
    expect(typeof p1).toBe('number');
  });
});
