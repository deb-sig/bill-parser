export const compareKey = (a: string, b: string) => {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA < lowerB) {
      return -1;
  }
  if (lowerA > lowerB) {
      return 1;
  }
  return 0;
};

export const createCsvTextFromTable = (table: string[][]) => {
  const csv = table
    // 如果单元格内容包含逗号，则用双引号包裹
    .map((row) => row.map((cell) => cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
    .join('\n');
  return csv;
}

export const downloadCsvFile = (csv: string, name: string = 'output') => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
