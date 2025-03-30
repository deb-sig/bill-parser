import { vi, beforeEach, test, describe, expect } from 'vitest';

import { BocomCreditAdapter } from '../../../src/adapters/bocom-credit';

import pageHtmlText from './page.html?raw';
import resultCsvText from './result.csv?raw';

describe('adapter for bocom credit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('converter', async () => {
    vi.mock('postal-mime', () => ({
      default: {
        parse: vi.fn(() => ({
          html: pageHtmlText,
        }))
      }
    }));

    const mockFile = new File([], 'bocom_credit.eml');
    const csvText = await BocomCreditAdapter.converter(mockFile);

    expect(csvText).toEqual(resultCsvText);
  });
});
