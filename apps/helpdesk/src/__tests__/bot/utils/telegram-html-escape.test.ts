/**
 * Tests de escape HTML para Telegram.
 */

import { escapeTelegramHtml } from '../../../bot/utils/telegram-html-escape';

describe('escapeTelegramHtml', () => {
  it('escapa caracteres especiales HTML', () => {
    expect(escapeTelegramHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('trunca entrada muy larga', () => {
    const long = 'x'.repeat(6000);
    expect(escapeTelegramHtml(long).length).toBeLessThanOrEqual(5000);
  });
});
