
import { vi, beforeEach, test, describe, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import resultCsvText1 from './result1.csv?raw';
import resultCsvText2 from './result2.csv?raw';
import resultCsvText3 from './result3.csv?raw';
import resultCsvText4 from './result4.csv?raw';

const mockPdfDir = (pdfName: string) => {
  const pdfPath = path.join(__dirname, pdfName);
  const files = fs.readdirSync(pdfPath);

  // 根据文件名中的数字对文件进行排序，确保页面顺序正确
  files.sort((a, b) => {
    const numA = parseInt(a.replace('p', '').replace('.json', ''));
    const numB = parseInt(b.replace('p', '').replace('.json', ''));
    return numA - numB;
  });

  return files
    .map((file) => path.join(pdfPath, file))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf-8')));
};

const pdfs = [
  { pdf: mockPdfDir('pdf1'), result: resultCsvText1, name: 'pdf1' },
  { pdf: mockPdfDir('pdf2'), result: resultCsvText2, name: 'pdf2' },
  { pdf: mockPdfDir('pdf3'), result: resultCsvText3, name: 'pdf3' },
  { pdf: mockPdfDir('pdf4'), result: resultCsvText4, name: 'pdf4' },
];

const mockGetDocument = (pdf: any) => {
  vi.doMock('pdfjs-dist', () => ({
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: pdf.length,
        getPage: (pageNum: number) => ({
          getTextContent: () => Promise.resolve({
            items: pdf[pageNum - 1] || null,
          }),
        }),
      }),
    })),
  }));
};

describe('adapter for boc debit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test.each(pdfs)('converter with $name', async ({ pdf, result }) => {
    mockGetDocument(pdf);

    const { BocCreditAdapter } = await import('../../../src/adapters/boc-credit');

    const mockFile = new File([], 'boc_credit.pdf');
    const csvText = await BocCreditAdapter.converter(mockFile);

    expect(csvText).toEqual(result);
  });
});
