'use client';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import React,  { ChangeEvent } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type PromiseValue<T> = T extends Promise<infer U> ? U : T;

/**
 * 招行储蓄卡的账单特点与解析思路：
 * - 标题列宽度固定、交易记录行高度固定，交易摘要部分超出后会自动截断不会换行，基于表头列分析横轴范围、基于每行的卡号分析每行纵轴范围（卡号是每行固定都会有、容易被识别的列）
 * - 只有第一页有表头，记录第一页表头，全局使用
 * - 每条交易记录只有月日没有年，需要记录账单日来为后续的分析提供上下文，故保留账单标题行
 */

const AllHeaders = ["交易日", "记账日", "交易摘要", "人民币金额", "卡号末四位", "交易地金额"];

const extractHeaderInfoFromDoc = async (doc: pdfjsLib.PDFDocumentProxy) => {
  const firstPage = await doc.getPage(1);
  const textContent = await firstPage.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  const titleItem = allItems.find((item) => /招商银行信用卡对账单/.test(item.str));

  // 不同的导出格式可能只有部分列
  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  const headerCardItem = headerItems.find((item) => item.str === '卡号末四位');
  
  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4],
      xRight: (headerItems[index + 1]?.transform[4] ?? 999) - 0.01, // 最后一栏兜底 999
    }
  });

  console.log('allItems', allItems);

  if (!headerCardItem) {
    throw Error('未找到卡号末四位标题列')
  }

  return {
    titleItem,
    headerItems,
    headerXRanges,
  };
}

const extractInfoFromPage = async (page: pdfjsLib.PDFPageProxy, { headerXRanges }: PromiseValue<ReturnType<typeof extractHeaderInfoFromDoc>>) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  const getItemXIndex = (item: TextItem) => {
    const x = item.transform[4];
    const xRange = headerXRanges.find((r) => r.xLeft <= x && r.xRight >= x);
    return xRange?.colIdx;
  }

  const table: TextItem[][] = [];
  const ignoreItems: TextItem[] = [];

  // 在卡号列 && 四位数字
  const isCardNoCol = (item: TextItem) => {
    return getItemXIndex(item) === 4 && /^\d{4}$/.test(item?.str);
  };

  const cardNoItems = allItems.filter(isCardNoCol)

  const rowYRanges = cardNoItems.map((item, index) => {
    return {
      rowIdx: index,
      yBottom: item.transform[5] - 1,
      yTop: item.transform[5] + item.height + 1,
    }
  })

  const getItemYIndex = (item: TextItem) => {
    const y = item.transform[5];
    const yRange = rowYRanges.find((r) => r.yBottom <= y && r.yTop >= y);
    return yRange?.rowIdx;
  }

  allItems.forEach(item => {
    const xIndex = getItemXIndex(item);
    const yIndex = getItemYIndex(item);
    if (typeof xIndex !== 'undefined' && typeof yIndex !== 'undefined') {
      if (!table[yIndex]) {
        table[yIndex] = Array(6).fill(null);
      }
      table[yIndex][xIndex] = item;
    } else {
      ignoreItems.push(item);
    }
  })

  return {
    ignoreItems,
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
          const allTable: (TextItem | null)[][] = [];

          const headerInfo = await extractHeaderInfoFromDoc(pdf);

          for (let i = 1; i <= pdf.numPages; i++) {
          // for (let i = 1; i <= 1; i++) {
            const page = await pdf.getPage(i);
            const info = await extractInfoFromPage(page, headerInfo);
            allIgnoreItems.push(...info.ignoreItems)
            allTable.push(...info.table)
          }

          const csvTitle = headerInfo.titleItem?.str || "招商银行信用卡对账单";
          const csvHeader = headerInfo.headerItems.map((item) => item.str).join(',');

          const csvBody = allTable
            // 合并单元格内容
            .map((row) => row.map((item) => `${item?.str || ''}`.trim())
            // 如果单元格内容包含逗号，则用双引号包裹
            .map((row) => row.includes(',') ? `"${row.replace(/"/g, '""')}"` : row).join(','))
            .join('\n');
          
          const csv = csvTitle + '\n' + csvHeader + '\n' + csvBody;
          console.log('csv', csv);

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
