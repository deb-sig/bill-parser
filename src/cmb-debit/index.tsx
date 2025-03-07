'use client';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import React,  { ChangeEvent } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * 招行信用卡的账单特点与解析思路：
 * - 标题列宽度不定、交易记录行高度不定，用户可以自己选择导出列、交易记录行高由交易摘要的文字数量决定
 * - 每行每列的元素一定会有，且都对齐，日期是每行记录的第一个元素
 * - 先识别一共有哪些列，然后根据每行的日期来判断是否是新的一条记录
 */

const AllHeaders = ["记账日期", "货币", "交易金额", "联机余额", "交易摘要", "对手信息", "客户摘要"];

const extractInfoFromPage = async (page: pdfjsLib.PDFPageProxy) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  // 不同的导出格式可能只有部分列
  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  const headerDateItem = headerItems.find((item) => item.str === '记账日期');
  if (!headerDateItem) {
    throw Error('未找到记账日期标题列')
  }
  
  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4],
      xRight: (headerItems[index + 1]?.transform[4] ?? 999) - 0.01, // 最后一栏兜底 999
    }
  });

  const table: TextItem[][][] = [];
  const ignoreItems: TextItem[] = [];
  const curRow: TextItem[][] = [];

  // x 轴和日期列对齐 && YYYY-MM-DD
  const isDateCol = (item: TextItem) =>
    item.transform[4] === headerDateItem.transform[4] &&
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(item?.str);

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
  })

  return {
    ignoreItems,
    headerItems,
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

          const csvHeader = headerItems.map((item) => item.str).join(',');

          const csvBody = allTable
            // 合并单元格内容
            .map((row) => row.map((cell) => (cell || []).map((item) => `${item.str || ''}`.trim()).join('')))
            // 如果单元格内容包含逗号，则用双引号包裹
            .map((row) => row.map((cell) => cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
            .join('\n');
          
          const csv = csvHeader + '\n' + csvBody;

          // 创建 Blob 对象
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'output.csv';
          a.click();
          URL.revokeObjectURL(url);
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
