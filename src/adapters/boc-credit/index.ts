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

const extractAllItemFromPage = async (page: pdfjs.PDFPageProxy) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );
  return allItems;
}

// 读取积分奖励计划、外币交易明细所在页面和坐标
// 从而可以区分人民币与外币交易
// 不包含积分奖励计划
const extractSpecialInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  const pageNum = doc.numPages;
  let foreignCurrency: TextItem | undefined;
  let pageIdxOfForeignCurrency: number | undefined;
  let rmbDetail: TextItem | undefined;
  let pageIdxOfrmbDetail: number = 0;
  const foreignRegex = /(美元账户|外币)交易明细/;
  const rmbDetailRegex = /(人民币账户交易明细|人民币交易明细)/;

  for (let i = pageNum; i >= 1; --i) {
    const page = await doc.getPage(i);
    const allItems = await extractAllItemFromPage(page);
    const tmpForeignCurrency = allItems.find(item => foreignRegex.test(item.str));
    if (tmpForeignCurrency) {
      foreignCurrency = tmpForeignCurrency;
      pageIdxOfForeignCurrency = i;
    }
    rmbDetail = allItems.find(item => rmbDetailRegex.test(item.str));
    if (rmbDetail) {
      pageIdxOfrmbDetail = i;
      break;
    }

  }
  console.log('foreignCurrency', foreignCurrency, 'pageIdxOfForeignCurrency', pageIdxOfForeignCurrency, 'rmbDetail', rmbDetail, 'pageIdxOfrmbDetail', pageIdxOfrmbDetail)
  return { foreignCurrency, pageIdxOfForeignCurrency, rmbDetail, pageIdxOfrmbDetail };
}

const extractHeaderInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  const secondPage = await doc.getPage(2);
  const allSeconPageItems = await extractAllItemFromPage(secondPage);

  // 提取第二页所有文本，过滤出所有的表头
  let headerItems = AllHeaders
    .map((header) => allSeconPageItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  console.log('headerItems', headerItems)

  // 提取第一页的所有文本项，用于提取标题和年份
  const firstPage = await doc.getPage(1);
  const allFirstPageItems = await extractAllItemFromPage(firstPage);
  const titleItem = allFirstPageItems.find((item) => /中国银行信用卡账单/.test(item.str));
  // 从标题中提取年份信息
  let billYear: string | undefined;
  if (titleItem) {
    billYear = titleItem.str.match(/(\d{4})年/)?.[1];
  }
  // 对于普通账单第一页是总览，表头位于第二页；对于补制账单，表头位于第一页
  if (headerItems.length === 0) {
    headerItems = AllHeaders
      .map((header) => allFirstPageItems.find((item) => item.str === header))
      .filter((item): item is TextItem => Boolean(item));
  }

  // 根据表头列的横坐标范围，计算出每列的横坐标范围
  // 后续代码中可以根据 getItemXIndex(item) 来判断 item 在哪一列
  // 取到列占据的大致横坐标范围，用于后续判断 item 在哪一列
  const headerXRanges = headerItems.map((item, index) => {
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4] - 5,
      xRight: item.transform[4] + item.width + 5,
    }
  });

  console.log('headerXRanges', headerXRanges, 'billYear', billYear, 'titleItem', titleItem);

  return {
    titleItem,
    headerItems,
    headerXRanges,
    billYear
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
  const { foreignCurrency, pageIdxOfForeignCurrency, rmbDetail, pageIdxOfrmbDetail } = specialInfo;
  const allItems = await extractAllItemFromPage(page);

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
    // 明细是出现在 "人民币账户交易明细" 或者 "人民币交易明细" 之后
    if (typeof xIndex !== 'undefined' && typeof yIndex !== 'undefined' && (pageNum > pageIdxOfrmbDetail || (pageNum == pageIdxOfrmbDetail && item.transform[5] <= rmbDetail?.transform[5]))) {
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
        const specialInfo = await extractSpecialInfoFromDoc(pdf);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const info = await extractInfoFromPage(page, headerInfo, i, specialInfo);
          allIgnoreItems.push(...info.ignoreItems);
          allTable.push(...info.table);
          allTable.push(...info.foreignTable);
        }
        const csvTitle = headerInfo.titleItem?.str || "中国银行信用卡帐单";
        const csvHeader = headerInfo.headerItems.map((item) => item.str).join(',') + ',' + '币种';

        // 处理日期格式，特别是 MM/DD 格式
        const processDateInCsv = (row: (string | null)[]) => {
          if (!row || row.length === 0 || !headerInfo.billYear) return row;

          // 第一列是交易日期
          const dateStr = row[0];
          if (dateStr && /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(dateStr)) {
            const [month, day] = dateStr.split('/');
            // 如果是 12 月，年份应该是账单年份的上一年
            const year = parseInt(month) === 12 ? (parseInt(headerInfo.billYear) - 1).toString() : headerInfo.billYear;
            row[0] = `${year}-${month}-${day}`;
          }
          return row;
        };

        const csvBody = allTable
          .filter(row => row && row.length > 0) // 过滤掉空行
          .filter(row => {
            // 过滤掉包含"已为您减免本年度年费"的行
            const transactionDesc = row[3]; // 交易描述在第 4 列（索引为 3）
            return !(transactionDesc && typeof transactionDesc === 'string' && transactionDesc.includes('已为您减免本年度年费'));
          })
          .map(processDateInCsv) // 处理日期格式
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
