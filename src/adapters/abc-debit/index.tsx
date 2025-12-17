import * as pdfjs from 'pdfjs-dist';
import { Adapter } from '../types';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { createCsvTextFromTable } from '../../utils';

/**
 * 交行储蓄卡的账单特点与解析思路：
 * - 每行 text 节点顺序和看到的一样，交易日期是第一列一定会有，遇到交易日期则新开一行记录
 */

const AllHeaders = ["交易⽇期", "交易时间", "交易摘要", "交易⾦额", "本次余额", "对⼿信息", "⽇ 志 号", "交易渠道", "交易附⾔"];

const extractInfoFromPage = async (page: pdfjs.PDFPageProxy) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  console.log('allItems', allItems);

  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str.normalize('NFKC') === header.normalize('NFKC')))
    .filter((item): item is TextItem => Boolean(item));
  const headerDateItem = headerItems.find((item) => item.str.normalize('NFKC') === AllHeaders[0].normalize('NFKC'));
  
  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4],
      xRight: (headerItems[index + 1]?.transform[4] ?? 999), // 最后一栏兜底 999
    }
  });

  if (!headerDateItem) {
    throw Error('未找到序号标题列')
  }

  const getItemXIndex = (item: TextItem) => {
    const x = item.transform[4];
    const width = item.width;
    const xRange = headerXRanges.find((r) => r.xLeft <= x && r.xRight >= x + width);
    return xRange?.colIdx;
  }

  const table: TextItem[][][] = [];
  const ignoreItems: TextItem[] = [];

  // 在第一列序号列 && YYYYMMDD
  const isDateCol = (item: TextItem) => {
    return getItemXIndex(item) === 0 && /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(item.str);
  };

  allItems.forEach(item => {
    if (headerItems.indexOf(item) >= 0) return;

    if (isDateCol(item)) {
      // 新的一行初始化，直接放入 table
      const newRow: TextItem[][] = Array(Headers.length).fill(null).map(() => []);
      newRow[0] = [item];
      table.push(newRow);
    } else {
      const curRow = table[table.length - 1];
      if (curRow && curRow.length) {
        // 第二及后续列
        const xIndex = getItemXIndex(item);
        if (typeof xIndex === 'undefined') {
          ignoreItems.push(item);
        } else {
          if (!curRow[xIndex]) curRow[xIndex] = [];
          curRow[xIndex].push(item);
        }
      } else {
        // 数据表格之前的信息文本直接忽略
        ignoreItems.push(item);
      }
    }
  });

  return {
    headerItems,
    ignoreItems,
    table,
  }
}

const convertFromPdf = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
      try {
        // 加载 PDF 文件
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const allIgnoreItems: TextItem[] = [];
        const allTable: TextItem[][][] = [];
        const headerItems: TextItem[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const info = await extractInfoFromPage(page);
          allIgnoreItems.push(...info.ignoreItems)
          allTable.push(...info.table)

          if (i === 1) {
            headerItems.push(...info.headerItems);
          }
        }

        const headerInStr = headerItems.map((item) => item.str);

        const allTableInStr = allTable.map((row) => {
          // 合并单元格内容
          return row.map((cell) => (cell || []).map((item) => `${item.str || ''}`.trim()).join(''));
        });

        const csv = createCsvTextFromTable([headerInStr, ...allTableInStr]).normalize('NFKC');

        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const AbcDebitAdapter: Adapter = {
  key: 'abc_debit',
  name: '农业银行储蓄卡',
  sourceFileFormat: ['pdf'],
  converter: convertFromPdf,
}
