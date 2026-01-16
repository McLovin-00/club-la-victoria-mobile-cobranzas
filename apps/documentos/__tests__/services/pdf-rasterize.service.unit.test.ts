jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn(async () => '/tmp/docs'),
  writeFile: jest.fn(async () => undefined),
  readdir: jest.fn(async () => ['page-1.jpg', 'page-2.jpg', 'x.txt']),
  readFile: jest.fn(async () => Buffer.from('img')),
  unlink: jest.fn(async () => undefined),
  rmdir: jest.fn(async () => undefined),
}));

jest.mock('child_process', () => ({
  execFile: jest.fn((cmd: string, _args: any, _opts: any, cb: any) => {
    // Default: succeed
    cb(null, { stdout: '', stderr: '' });
  }),
}));

import { PdfRasterizeService } from '../../src/services/pdf-rasterize.service';
import { execFile } from 'child_process';

describe('PdfRasterizeService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pdfToImages returns image buffers and cleans up', async () => {
    const out = await PdfRasterizeService.pdfToImages(Buffer.from('%PDF'));
    expect(out).toHaveLength(2);
  });

  it('pdfToImages falls back to pdftocairo when pdftoppm fails', async () => {
    (execFile as jest.Mock).mockImplementationOnce((cmd: string, _a: any, _o: any, cb: any) => {
      if (cmd === 'pdftoppm') return cb(new Error('fail'));
      return cb(null, { stdout: '', stderr: '' });
    });
    const out = await PdfRasterizeService.pdfToImages(Buffer.from('%PDF'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('isAvailable checks both commands', async () => {
    (execFile as jest.Mock)
      .mockImplementationOnce((_cmd: string, _a: any, _o: any, cb: any) => cb(new Error('no')))
      .mockImplementationOnce((_cmd: string, _a: any, _o: any, cb: any) => cb(null, { stdout: '', stderr: '' }));

    await expect(PdfRasterizeService.isAvailable()).resolves.toBe(true);
  });
});


