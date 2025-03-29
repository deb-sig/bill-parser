import * as pdfjs from 'pdfjs-dist';
import { Adapter } from '../types';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { createCsvTextFromTable } from '../../utils';

/**
 * 交行储蓄卡的账单特点与解析思路：
 * - 导出账单时“展示对方账户信息”是否开启对账单文件影响很大，不开启的格式完全是另一套且丢失了太多了信息，不兼容这种模式
 * - 标题列宽度是否固定存疑（不重要）， x 轴上每行记录的单元格的起始位置和列的起始位置不完全对应，最多要留 5px 偏差
 * - 交易记录行高度不定，算行高会比较麻烦
 * - 每行之间的序号都是第一个元素，且序号是递增的，但后面列的元素是乱序
 * - 每次识别到序号元素后，创建一个新的行记录，接下来的元素根据 x 轴位置计算所属列放入行记录中
 */

const AllHeaders = ["序号", "交易日期", "交易时间", "交易类型", "借贷", "交易金额", "余额", "对方账号", "对方户名", "交易地点", "摘要"];

const extractInfoFromPage = async (page: pdfjs.PDFPageProxy) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  const headerSerialNumItem = headerItems.find((item) => item.str === AllHeaders[0]);
  
  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4] - 5,
      xRight: (headerItems[index + 1]?.transform[4] ?? 999), // 最后一栏兜底 999
    }
  });

  if (!headerSerialNumItem) {
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
  // const curRow: TextItem[][] = [];

  // 在第一列序号列 && 纯数字
  const isSerialNumCol = (item: TextItem) => {
    return getItemXIndex(item) === 0 && /^\d+$/.test(item.str);
  };

  let hasEnded = false;

  allItems.forEach(item => {
    if (hasEnded) {
      return;
    }

    if (item.str === '打印完毕') {
      hasEnded = true;
      return;
    }

    if (isSerialNumCol(item)) {
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

  console.log('ignoreItems', ignoreItems);

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

        const csv = createCsvTextFromTable([headerInStr, ...allTableInStr]);

        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const BocomDebitAdapter: Adapter = {
  key: 'bocom_debit',
  name: '交通银行储蓄卡',
  sourceFileFormat: ['pdf'],
  converter: convertFromPdf,
}
