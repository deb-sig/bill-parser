'use client';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import React, { ChangeEvent } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const AllHeaders = ["记账日期", "货币", "交易金额", "联机余额", "交易摘要", "对手信息", "客户摘要"];

const extractTableFromPage = async (page: pdfjsLib.PDFPageProxy) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );
  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));

  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4],
      xRight: (headerItems[index + 1]?.transform[4] ?? 999) - 0.01, // 最后一栏兜底 999
    }
  });

  const headerDateItem = headerItems.find((item) => item.str === '记账日期');

  if (!headerDateItem) {
    throw Error('未找到记账日期标题列')
  }

  // x 轴和日期列对齐
  const isDateCol = (item: TextItem) => item.transform[4] === headerDateItem.transform[4] && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(item?.str);

  const table: TextItem[][][] = [];
  const ignoreItems: TextItem[] = [];
  const curRow: TextItem[][] = [];

  const getItemXIndex = (item: TextItem) => {
    const x = item.transform[4];
    const xRange = headerXRanges.find((r) => r.xLeft <= x && r.xRight >= x);
    return xRange?.colIdx;
  }

  allItems.forEach(item => {
    if (isDateCol(item)) {
      // 新的一行，把上一行的先保存下，并重新初始化 curRow
      if (curRow.length) {
        table.push([...curRow]);
        curRow.length = 0;
      }
      curRow.push([item]);
    } else {
      if (curRow.length) {
        const xIndex = getItemXIndex(item);
        if (typeof xIndex === 'undefined') {
          ignoreItems.push(item);
        } else {
          if (!curRow[xIndex]) curRow[xIndex] = [];
          curRow[xIndex].push(item);
        }
        // 真实数据之前的
      } else {
        ignoreItems.push(item);
      }
    }
  })

  const csv = table.map((row) => {
    return row
      .map((cell) => {
        const cellStr = (cell || []).map((item) => `${item.str || ''}`.trim()).join('');
        return cellStr;
      });
  });

  console.log('ignoreItems', ignoreItems);
  console.log('table', table);
  console.log('csv', csv);

  return {
    ignoreItems,
    csv,
    table,
  }
}

const Home: React.FC = () => {
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        try {
          // 加载 PDF 文件
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const numPages = pdf.numPages;
          const allIgnoreItems: TextItem[] = [];
          const allCsv: string[][] = [];

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const table = await extractTableFromPage(page);
            allIgnoreItems.push(...table.ignoreItems)
            allCsv.push(...table.csv)
          }
          console.log('allIgnoreItems', allIgnoreItems);
          console.log('allCsv', allCsv);
        } catch (error) {
          console.error('Error parsing PDF:', error);
        }
      };


      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <input type="file" accept=".pdf" onChange={handleFileChange} />
    </div>
  );
}

export default Home;
