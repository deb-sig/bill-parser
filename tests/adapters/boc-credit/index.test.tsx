
import { vi, beforeEach, test, describe, expect } from 'vitest';
import resultCsvText1 from './result1.csv?raw';
import resultCsvText2 from './result2.csv?raw';
import resultCsvText3 from './result3.csv?raw';
import resultCsvText4 from './result4.csv?raw';


const pdf1Modules = import.meta.glob('./pdf1/*.json', { eager: true, import: 'default' });
const pdf2Modules = import.meta.glob('./pdf2/*.json', { eager: true, import: 'default' });
const pdf3Modules = import.meta.glob('./pdf3/*.json', { eager: true, import: 'default' });
const pdf4Modules = import.meta.glob('./pdf4/*.json', { eager: true, import: 'default' });

// 2. 辅助函数，用于排序并提取 JSON 内容
const sortAndMap = (modules: Record<string, any>) => {
  const pageNumberRegex = /p(\d+)\.json$/;
  return Object.keys(modules)
    .sort((a, b) => {
      // 对于 ./pdf*/p*.json, 获取 p 后面的数字
      const matchA = a.match(pageNumberRegex);
      const matchB = b.match(pageNumberRegex);

      const numA = matchA ? parseInt(matchA[1]) : 0;
      const numB = matchB ? parseInt(matchB[1]) : 0;
      
      return numA - numB;
    })
    .map((key) => modules[key]); // 提取 JSON 内容
};

// 3. 重写 pdfs 数组
const pdfs = [
  { pdf: sortAndMap(pdf1Modules), result: resultCsvText1, name: 'pdf1' },
  { pdf: sortAndMap(pdf2Modules), result: resultCsvText2, name: 'pdf2' },
  { pdf: sortAndMap(pdf3Modules), result: resultCsvText3, name: 'pdf3' },
  { pdf: sortAndMap(pdf4Modules), result: resultCsvText4, name: 'pdf4' },
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
