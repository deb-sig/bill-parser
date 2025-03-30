// generate YYYY-MM-DD
function generateDateStr(year, index) {
  const date = new Date(year, 0, index);
  const yearStr = String(date.getFullYear());
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

// generate HHMMSS
function generateTimeStr() {
  const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  const seconds = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

// generate x,xxx.xx
function generateRandomNumberString(str) {
  let isNegative = str.startsWith('-');
  if (isNegative) {
    str = str.slice(1);
  }
  let cleanInput = str.replace(/,/g, '');
  let [integerPart, decimalPart] = cleanInput.split('.');
  let integerLength = integerPart.length;
  let decimalLength = decimalPart.length;

  // 生成随机整数部分
  let min = Math.pow(10, integerLength - 1);
  let max = Math.pow(10, integerLength) - 1;
  let randomInteger = Math.floor(Math.random() * (max - min + 1)) + min;
  let formattedInteger = randomInteger.toLocaleString('en-US');

  // 生成随机小数部分
  let randomDecimal = Math.floor(Math.random() * (Math.pow(10, decimalLength))).toString().padStart(decimalLength, '0');

  let result = `${formattedInteger}.${randomDecimal}`;
  if (isNegative) {
    result = `-${result}`;
  }
  return result;
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

function checkHHMMSSFormat(str) {
  if (str.length!== 6) {
      return false;
  }
  if (!/^\d+$/.test(str)) {
      return false;
  }
  const hours = parseInt(str.slice(0, 2), 10);
  const minutes = parseInt(str.slice(2, 4), 10);
  const seconds = parseInt(str.slice(4, 6), 10);

  return hours >= 0 && hours < 24 &&
      minutes >= 0 && minutes < 60 &&
      seconds >= 0 && seconds < 60;
}
  

function desensitize(str, index) {
  const isDateCol = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(str);
  if (isDateCol) {
    return generateDateStr(2024, index);
  }

  const isAmount = /^-?(0|[1-9]\d{0,2}(,\d{3})*)\.\d{2}$/.test(str);
  if (isAmount) {
    return generateRandomNumberString(str);
  }

  return shuffleNumbersInString(str);
}

