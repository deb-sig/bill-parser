import { vi, beforeEach, test, describe, expect } from 'vitest';

import { BocomDebitAdapter } from '../../../src/adapters/bocom-debit';

import p1TextItems from './p1.json';
import p2TextItems from './p2.json';
import resultCsvText from './result.csv?raw';

const pages = [p1TextItems, p2TextItems];

describe('adapter for bocom debit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('converter', async () => {
    vi.mock('pdfjs-dist', () => ({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: pages.length,
          getPage: (pageNum: number) => ({
            getTextContent: () => Promise.resolve({
              items: pages[pageNum - 1] || null,
            })
          })
        })
      }))
    }));

    const mockFile = new File([], 'bocom_debit.pdf');
    const csvText = await BocomDebitAdapter.converter(mockFile);

    expect(csvText).toEqual(resultCsvText);
  });
});
