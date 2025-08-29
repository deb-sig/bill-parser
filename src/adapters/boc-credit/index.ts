import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { Adapter, PromiseValue } from '../types';

/**
 * 中国银行信用卡的账单特点与解析思路
 * 不同页列宽固定
 * 行高不固定，存在行内换行的情况；
 * 交易描述字段接近于水平方向居中，垂直方向向上对齐，但与边框留下了不少空隙
 * 其他字段水平与垂直方向居中对齐
 * 按月发送的账单，表格中日期为 YYYY-MM-DD
 * 如果是补制的账单，表格中日期显示为 MM/DD
 * 外币暂时只支持美元
 * 第一页没有账单明细，为账单总结
 */

const AllHeaders = ["交易日", "银行记账日", "卡号后四位", "交易描述", "存入", "支出"]

// 读取积分奖励计划、外币交易明细所在页面和坐标
// 从而可以区分人民币与外币交易
// 不包含积分奖励计划
const extractSpecialInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  const pageNum = doc.numPages;
  let foreignCurrency: TextItem | undefined;
  let pageIdxOfForeignCurrency: number | undefined;

  for (let i = pageNum; i >= 1; --i) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const allItems = textContent.items.filter(
      (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
    );

    if (allItems.find((item) => item.str.includes("美元账户交易明细"))) {
      foreignCurrency = allItems.find((item) => item.str.includes("美元账户交易明细"));
      pageIdxOfForeignCurrency = i;
      break; // 找到外币交易明细，结束
    }
    if (allItems.find((item) => item.str.includes("外币交易明细"))) {
      foreignCurrency = allItems.find((item) => item.str.includes("外币易明细"));
      pageIdxOfForeignCurrency = i;
      break; // 找到外币交易明细，结束
    }

    console.log('foreignCurrency', foreignCurrency, 'pageIdxOfForeignCurrency', pageIdxOfForeignCurrency);
  }
  return { foreignCurrency, pageIdxOfForeignCurrency };
}

const extractHeaderInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  // 先只考虑人民币，后面再考虑外币
  const page = await doc.getPage(2); //
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  )

  // 过滤出所有的表头
  let headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  console.log('headerItems', headerItems)

  const firstPage = await doc.getPage(1);
  const textContent1 = await firstPage.getTextContent();
  const allItems1 = textContent1.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  )
  const titleItem = allItems1.find((item) => /中国银行信用卡帐单/.test(item.str));
  if (headerItems.length === 0) {
    headerItems = AllHeaders
      .map((header) => allItems1.find((item) => item.str === header))
      .filter((item): item is TextItem => Boolean(item));
  }

  // 根据表头列的横坐标范围，计算出每列的横坐标范围
  // 后续代码中可以根据 getItemXIndex(item) 来判断 item 在哪一列
  // 取到列占据的大致横坐标范围，用于后续判断 item 在哪一列
  const headerXRanges = headerItems.map((item, index) => {
    // const a = item.str === "金额" || item.str === "余额"
    // const xRight = a ? item.transform[4] + item.width + 12 : item.transform[4] + item.width + 1;
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4] - 5,
      xRight: item.transform[4] + item.width + 5,
    }
  });

  console.log('headerXRanges', headerXRanges);

  return {
    titleItem,
    headerItems,
    headerXRanges
  };
}

const FillTable = (table: string[][], yIndex: number, xIndex: number, item: TextItem) => {
  if (!table[yIndex]) {
    table[yIndex] = Array(6).fill(null);
  }
  if (table[yIndex][xIndex] === null) {
    table[yIndex][xIndex] = item.str;
  } else {
    table[yIndex][xIndex] = table[yIndex][xIndex] + item.str;
  }
}

type SpeicalInfo = PromiseValue<ReturnType<typeof extractSpecialInfoFromDoc>>
type HeaderInfo = PromiseValue<ReturnType<typeof extractHeaderInfoFromDoc>>

const extractInfoFromPage = async (page: pdfjs.PDFPageProxy, { headerXRanges }: HeaderInfo, pageNum: number, specialInfo: SpeicalInfo) => {
  const { foreignCurrency, pageIdxOfForeignCurrency } = specialInfo;
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
  const foreignTable: string[][] = [];

  // 获取记账日期列（支持 YYYY-MM-DD 和 MM/DD 两种格式），后续会根据记账日期定位每行的纵坐标
  const isPostedDateCol = (item: TextItem) => {
    // 这里就只会取第一列的日期用于后续获取 Y 坐标范围，从而可以排除积分奖励计划
    return getItemXIndex(item) === 0 &&
      (
        // 匹配 YYYY-MM-DD 格式（标准账单）
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(item?.str) ||
        // 匹配 MM/DD 格式（补制账单）
        /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(item?.str)
      );
  };
  const postedDateItems = allItems.filter(isPostedDateCol);
  console.log('postedDateItems', postedDateItems); // Y 轴坐标范围应该也正确

  const rowYRanges = postedDateItems.map((item, index) => {
    return {
      rowIdx: index,
      yBottom: item.transform[5] - 2,
      yTop: item.transform[5] + item.height + 2,
    }
  });
  console.log('rowYRanges', rowYRanges);

  const getItemYIndex = (item: TextItem) => {
    const y1 = item.transform[5];
    const y2 = item.transform[5] + item.height;
    const yRange = rowYRanges.find((r) => (y1 >= r.yBottom && y1 <= r.yTop) || (y1 <= r.yBottom && y2 >= r.yBottom));
    return yRange?.rowIdx;
  }
  console.log('allItems', allItems);

  allItems.forEach(item => {
    const xIndex = getItemXIndex(item);
    const yIndex = getItemYIndex(item);
    if (typeof xIndex !== 'undefined' && typeof yIndex !== 'undefined') {
      if (pageIdxOfForeignCurrency && (pageNum > pageIdxOfForeignCurrency || (pageNum === pageIdxOfForeignCurrency && item.transform[5] <= foreignCurrency?.transform[5]))) {
        // 说明这里是外币交易明细
        FillTable(foreignTable, yIndex, xIndex, item);
      } else {
        FillTable(table, yIndex, xIndex, item);
      }
    } else {
      ignoreItems.push(item);
    }
  });
  table.forEach((row) => {
    row.push('CNY');
  });
  foreignTable.forEach((row) => {
    row.push('USD');
  });

  console.log('foreignTable', foreignTable)
  return { ignoreItems, table, foreignTable };
}

const convertFromPdf = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(event?.target?.result as ArrayBuffer);
      try {
        // 加载 PDF 文件
        console.log("try to load pdf")
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const allIgnoreItems: TextItem[] = [];
        const allTable: (string | null)[][] = [];


        const headerInfo = await extractHeaderInfoFromDoc(pdf);
        const specialInfo = await extractSpecialInfoFromDoc(pdf);

        for (let i = 2; i <= pdf.numPages; i++) { // 中行信用卡第一页没有账单明细
          const page = await pdf.getPage(i);
          const info = await extractInfoFromPage(page, headerInfo, i, specialInfo);
          allIgnoreItems.push(...info.ignoreItems);
          allTable.push(...info.table);
          allTable.push(...info.foreignTable);
        }
        const csvTitle = headerInfo.titleItem?.str || "中国银行信用卡帐单";
        const csvHeader = headerInfo.headerItems.map((item) => item.str).join(',') + ',' + '币种';
        const csvBody = allTable
          .filter(row => row && row.length > 0) // 过滤掉空行
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

export const BocCreditAdapter: Adapter = {
  key: 'boc_credit',
  name: '中国银行信用卡',
  sourceFileFormat: ['pdf'],
  converter: convertFromPdf,
}