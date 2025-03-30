import PostalMime from 'postal-mime';
import { Adapter } from '../types';
import { createCsvTextFromTable } from '../../utils';

const Headers = ['交易日期', '记账日期', '交易说明', '交易币种/金额', '入账币种/金额'];

const extractInfoFromHtml = (html: string) => {
  const parser = new DOMParser();
  const $doc = parser.parseFromString(html, 'text/html');
  const $tableList = $doc.querySelectorAll('table#table3');

  const resultTable: string[][] = [Headers];

  $tableList.forEach(($table) => {
    const $headThList = $table.querySelector('thead')?.querySelector('tr')?.querySelectorAll('th');
    // use `innerHTML` instead of `innerText`, see https://github.com/jsdom/jsdom/issues/1245
    const matched = [...$headThList || []].every(($th, idx) => $th.innerHTML === Headers[idx]);
    if (!matched) {
      return;
    }

    const $bodyTrList = $table.querySelector('tbody')?.querySelectorAll('tr');
    [...($bodyTrList || [])].forEach(($tr) => {
      const $tdList = $tr.querySelectorAll('td');
      
      if ($tdList.length !== Headers.length) {
        return;
      }

      // 去掉头尾空格，以及中间多余的空格
      const row = [...$tdList].map(($td) => $td.innerHTML.trim().replace(/\s+/g, ' '));
      resultTable.push(row);
    })
  });

  return resultTable;
}

const convertFromEml = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        const email = await PostalMime.parse(typedArray);
        const table = extractInfoFromHtml(email.html || "");
        const csv = createCsvTextFromTable(table);
        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const BocomCreditAdapter: Adapter = {
  key: 'bocom_credit',
  name: '交通银行信用卡',
  sourceFileFormat: ['eml'],
  converter: convertFromEml,
}
