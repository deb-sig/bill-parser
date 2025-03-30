// generate YYYY-MM-DD
function generateDateStr(year, index) {
  const date = new Date(year, 0, index);
  const yearStr = String(date.getFullYear());
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

// generate `CNY xxxx.xx` from origin str
function generateRandomNumberString(originStr) {
  const spaceIndex = example.search(/\s/);
  const currency = example.slice(0, spaceIndex);
  const amountPart = example.slice(spaceIndex).trim();
  const dotIndex = amountPart.indexOf('.');
  const integerPartLength = dotIndex;
  const decimalPartLength = amountPart.length - dotIndex - 1;

  if (integerPartLength < 1) {
    throw new Error('输入的金额整数部分长度至少为 1，以保证不以 0 开头。');
  }

  // 生成随机整数部分，确保不以 0 开头
  const minInteger = Math.pow(10, integerPartLength - 1);
  const maxInteger = Math.pow(10, integerPartLength) - 1;
  const randomInteger = Math.floor(Math.random() * (maxInteger - minInteger + 1)) + minInteger;

  // 生成随机小数部分
  const minDecimal = 0;
  const maxDecimal = Math.pow(10, decimalPartLength) - 1;
  const randomDecimal = Math.floor(Math.random() * (maxDecimal - minDecimal + 1)) + minDecimal;
  const paddedDecimal = String(randomDecimal).padStart(decimalPartLength, '0');

  const newAmount = `${randomInteger}.${paddedDecimal}`;
  const spaces = example.slice(spaceIndex, example.indexOf(amountPart));
  return `${currency}${spaces}${newAmount}`;
}

// shuffle all number chars
function shuffleNumbersInString(str) {
  const numbers = [];
  for (let i = 0; i < str.length; i++) {
    if (/[0-9]/.test(str[i])) {
      numbers.push(str[i]);
    }
  }

  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  let numberIndex = 0;
  let result = '';
  for (let i = 0; i < str.length; i++) {
    if (/[0-9]/.test(str[i])) {
      result += numbers[numberIndex++];
    } else {
      result += str[i];
    }
  }

  return result;
}

function desensitizeLinks() {
  const $imgList = [...document.querySelectorAll('img')];
  $imgList.forEach(($img) => $img.src = '');

  const $aList = [...document.querySelectorAll('a'), ...document.querySelectorAll('area')];
  $aList.forEach(($a) => $a.href = '');

  const $tableList = [...document.querySelectorAll('table')];
  $tableList.forEach(t => t.setAttribute('background', ''))

}

function desensitizeStr(str, idx) {
  const isDateCol = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(str);
  if (isDateCol) {
    return generateDateStr(2024, idx);
  }

  // if (str.includes('姓名')) {
  //   return str.split('姓名').join('老交');
  // }

  const isAmount = /^[A-Z]{3}\s+\d+(\.\d{2})$/.test(str);
  if (isAmount) {
    return generateRandomNumberString(str);
  }

  return shuffleNumbersInString(str);
}

function desensitize() {
  desensitizeLinks();

  const Headers = ['交易日期', '记账日期', '交易说明', '交易币种/金额', '入账币种/金额'];
  const $tableList = [...document.querySelectorAll('table#table3')];

  $tableList.forEach(($table) => {
    const $headThList = $table.querySelector('thead')?.querySelector('tr')?.querySelectorAll('th');
    const matched = [...$headThList || []].every(($th, idx) => $th.innerHTML === Headers[idx]);
    if (!matched) {
      return;
    }

    const $bodyTrList = $table.querySelector('tbody')?.querySelectorAll('tr');
    [...($bodyTrList || [])].forEach(($tr, idx) => {
      const $tdList = [...$tr.querySelectorAll('td')];

      if ($tdList.length !== Headers.length) {
        return;
      }

      $tdList.forEach(($td) => {
        $td.innerHTML = desensitizeStr($td.innerHTML, idx)
      });
    })
  });

  copy(document.querySelector('html').innerHTML)
}

