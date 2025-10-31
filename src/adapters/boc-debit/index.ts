import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { Adapter, PromiseValue } from '../types';

/**
 * 中国银行储蓄卡的账单特点与解析思路
 * 导出账单时需要勾选“展示交易对方信息”，不勾选时，缺少对方账户信息与卡号，不利于后期 beancount 的自动生成；
 * 导出账单时可以不勾选“展示完整卡号/账号”，根据对方账户名与卡号后四位，应该足够用于生成 beancount 的账单；
 * 每行行高与列宽固定的，存在行内换行的情况；
 * 行高均一致，不同列列宽不一致；
 * 表格内的文字为向上对齐，水平方向则是居中对齐；
 */

const AllHeaders = ["记账日期", "记账时间", "币别", "金额", "余额", "交易名称", "渠道", "网点名称", "附言", "对方账户名", "对方卡号/账号", "对方开户行"]

const extractHeaderInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  )

  // 过滤出所有的表头
  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  console.log('headerItems', headerItems)

  // 将当前卡号后四位添加到表头中，用于后续账单生成
  const cardIdItem = allItems.find((item) => /借记卡号：\s*\d{4,}/.test(item.str)); // 银联发行的借记卡，卡号均以 62 开头
  const titleItem = allItems.find((item) => /中国银行交易流水明细单/.test(item.str));


  // 根据表头列的横坐标范围，计算出每列的横坐标范围
  // 后续代码中可以根据 getItemXIndex(item) 来判断 item 在哪一列
  // 取到列占据的大致横坐标范围，用于后续判断 item 在哪一列
  const headerXRanges = headerItems.map((item, index) => {
    const a = item.str === "金额" || item.str === "余额"
    const xRight = a ? item.transform[4] + item.width + 12 : item.transform[4] + item.width + 1;
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4],
      xRight: xRight,
    }
  });

  console.log('headerXRanges', headerXRanges);
  console.log('cardIdItem', cardIdItem)

  if (!cardIdItem) {
    throw Error('未找到对方卡号/账号标题列')
  }

  return {
    titleItem,
    cardIdItem,
    headerItems,
    headerXRanges
  };
}

const extractInfoFromPage = async (page: pdfjs.PDFPageProxy, { cardIdItem, headerXRanges }: PromiseValue<ReturnType<typeof extractHeaderInfoFromDoc>>) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  const getItemXIndex = (item: TextItem) => {
    // 判断内容行与哪个列横坐标范围有重叠，从而判断在哪一列
    const x1 = item.transform[4]; // 根据 PDF.js 的坐标系统，提取文本项的 X 坐标
    const x2 = item.transform[4] + item.width;
    const xRange = headerXRanges.find((r) => (x1 >= r.xLeft && x1 <= r.xRight) || (x1 <= r.xLeft && x2 >= r.xLeft));
    return xRange?.colIdx;
  }
  const table: string[][] = [];
  const ignoreItems: TextItem[] = [];

  // 获取记账日期列 YYYY-MM-DD，后续会根据记账日期定位每行的纵坐标
  const isPostedDateCol = (item: TextItem) => {
    return getItemXIndex(item) === 0 &&
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(item?.str);
  };
  const postedDateItems = allItems.filter(isPostedDateCol);
  console.log('postedDateItems', postedDateItems); // Y 轴坐标范围应该也正确

  const rowYRanges = postedDateItems.map((item, index) => {
    return {
      rowIdx: index,
      yBottom: item.transform[5] - item.height - 1,
      yTop: item.transform[5] + item.height + 1,
    }
  });
  console.log('rowYRanges', rowYRanges);

  const getItemYIndex = (item: TextItem) => {
    const y = item.transform[5];
    const yRange = rowYRanges.find((r) => r.yBottom <= y && r.yTop >= y);
    return yRange?.rowIdx;
  }
  console.log('allItems', allItems);

  // Todo：处理表格内换行的情况
  allItems.forEach(item => {
    const xIndex = getItemXIndex(item);
    const yIndex = getItemYIndex(item);
    if (typeof xIndex !== 'undefined' && typeof yIndex !== 'undefined') {
      if (!table[yIndex]) {
        table[yIndex] = Array(12).fill(null); // 12 是列的数量
      }
      if (table[yIndex][xIndex] === null) {
        table[yIndex][xIndex] = item.str;
      } else {
        table[yIndex][xIndex] = table[yIndex][xIndex] + item.str;
      }
    } else {
      ignoreItems.push(item);
    }
  });
  const extractCardNumber = (str?: string) => {
    if (!str) return '未知卡号';
    const digits = str.replace(/\D/g, ''); // 移除所有非数字字符
    return digits.slice(-4) || '未知卡号'; // 确保至少返回后 4 位
  };

  table.forEach((row) => {
    row.push(extractCardNumber(cardIdItem?.str));
  });

  return { ignoreItems, table };
}

const convertFromPdf = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      const arrayBuffer = event.target?.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        reject(new Error('读取文件失败'));
        return;
      }
      const typedArray = new Uint8Array(arrayBuffer);
      try {
        // 加载 PDF 文件
        console.log("try to load pdf")
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const allIgnoreItems: TextItem[] = [];
        const allTable: (string | null)[][] = [];


        const headerInfo = await extractHeaderInfoFromDoc(pdf);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const info = await extractInfoFromPage(page, headerInfo);
          allIgnoreItems.push(...info.ignoreItems);
          allTable.push(...info.table);
        }
        const csvTitle = headerInfo.titleItem?.str || "中国银行交易流水明细单";
        const csvHeader = headerInfo.headerItems.map((item) => item.str).join(',') + ',' + '借记卡号';
        const csvBody = allTable
          .map((row) => row.map((item) => `${item || ''}`.trim())
            .map((row) => row.includes(',') ? `"${row.replace(/"/g, '""')}"` : row).join(','))
          .join('\n');
        const csv = csvTitle + '\n' + csvHeader + '\n' + csvBody;
        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export const BocDebitAdapter: Adapter = {
  key: 'boc_debit',
  name: '中国银行储蓄卡',
  sourceFileFormat: ['pdf'],
  converter: convertFromPdf,
}