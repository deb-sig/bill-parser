// generate YYYY-MM-DD
function generateDateStr(year, index) {
  const date = new Date(year, 0, index);
  const yearStr = String(date.getFullYear());
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

// generate HH:MM:SS
function generateTimeStr() {
  const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  const seconds = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// generate x,xxx.xx from origin str
function generateRandomNumberString(originStr) {
  const cleanInput = originStr.replace(/[,.]/g, '');
  const inputLength = cleanInput.length;

  if (inputLength < 3) {
    console.log('originStr', originStr);
    throw new Error('输入的字符串长度至少为 3，以保证有非零整数部分和两位小数：');
  }

  let integerPart = Math.floor(Math.pow(10, inputLength - 3) + Math.random() * (Math.pow(10, inputLength - 2) - Math.pow(10, inputLength - 3)));

  const decimalPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');

  const combinedNumber = parseFloat(`${integerPart}.${decimalPart}`);

  const formattedNumber = combinedNumber.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formattedNumber;
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


function replaceAllOccurrences(str, searchStr, replaceStr) {
  return str.split(searchStr).join(replaceStr);
}

function desensitize(str, index) {
  const isDateCol = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(str);
  if (isDateCol) {
    return generateDateStr(2024, index);
  }

  const isTimeCol = /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(str);
  if (isTimeCol) {
    return generateTimeStr();
  }

  if (str.includes('姓名')) {
    return str.split('姓名').join('老交');
  }

  const isAmount = /^(0|[1-9]\d{0,2}(,\d{3})*)\.\d{2}$/.test(str);
  if (isAmount) {
    return generateRandomNumberString(str);
  }

  return shuffleNumbersInString(str);
}

