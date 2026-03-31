import {
  unwrapHelpdeskData,
  parsePaginatedTicketsResponse,
  parseMessagesResponse,
} from '../helpdeskResponseParsers';
import type { HelpdeskStats } from '../../types';

describe('helpdeskResponseParsers', () => {
  it('unwrapHelpdeskData extrae data del envelope', () => {
    const stats: HelpdeskStats = {
      open: 1,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      total: 1,
      byCategory: { technical: 1, operational: 0 },
      byPriority: { low: 0, normal: 1, high: 0 },
    };
    expect(unwrapHelpdeskData<HelpdeskStats>({ success: true, data: stats })).toEqual(stats);
  });

  it('parsePaginatedTicketsResponse lee data y pagination', () => {
    const parsed = parsePaginatedTicketsResponse({
      success: true,
      data: [{ id: 't1' }],
      pagination: { page: 2, limit: 10, total: 15, totalPages: 2 },
    });
    expect(parsed.data).toHaveLength(1);
    expect(parsed.page).toBe(2);
    expect(parsed.total).toBe(15);
    expect(parsed.totalPages).toBe(2);
  });

  it('parseMessagesResponse lee total desde pagination', () => {
    const parsed = parseMessagesResponse({
      success: true,
      data: [{ id: 'm1' }],
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    });
    expect(parsed.data).toHaveLength(1);
    expect(parsed.total).toBe(3);
  });
});
