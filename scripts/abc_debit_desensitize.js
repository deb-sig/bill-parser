// generate YYYYMMDD
function generateDateStr(year, index) {
  const date = new Date(year, 0, index);
  const yearStr = String(date.getFullYear());
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${yearStr}${monthStr}${dayStr}`;
}

// generate HHMMSS
function generateTimeStr() {
  const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  const seconds = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

// generate xxxx.xx
function generateRandomNumberString(length) {
  if (length < 4) {
      throw new Error('长度不能小于 4，因为至少需要包含整数部分、小数点和两位小数。');
  }
  const integerPartLength = length - 3;
  const min = Math.pow(10, integerPartLength - 1);
  const max = Math.pow(10, integerPartLength) - 1;
  const integerPart = Math.floor(Math.random() * (max - min + 1)) + min;
  const decimalPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${integerPart}.${decimalPart}`;
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
  const isDateCol = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(str);
  if (isDateCol) {
    return generateDateStr(2024, index);
  }

  const isTimeCol = checkHHMMSSFormat(str);
  if (isTimeCol) {
    return generateTimeStr();
  }

  if (str.includes('名字')) {
    return str.split('名字').join('老农');
  }

  const isTransAmount = /^[+-]\d+\.\d{2}$/.test(str);
  if (isTransAmount) {
    const sign = str[0];
    const fakeAmount = generateRandomNumberString(str.length - 1);
    return `${sign}${fakeAmount}`;
  }

  const isBalance = /^\d+\.\d{2}$/.test(str);
  if (isBalance) {
    return generateRandomNumberString(str.length);
  }

  return shuffleNumbersInString(str);
}

