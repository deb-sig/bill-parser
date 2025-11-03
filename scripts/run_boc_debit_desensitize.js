// 引入文件系统模块
import fs from 'fs'; // ✅ ES 模块语法
import path from 'path';
// 引入脱敏函数（假设 boc_debit_desensitize.js 在相同目录）
import { desensitize, replaceAllOccurrences } from './boc_debit_desensitize.js';


// 处理单个文件
function processFile(filePath) {
  try {
    // 读取 JSON 文件
    var data = fs.readFileSync(filePath, 'utf8');
    const records = JSON.parse(data);
    // data = replaceAllOccurrences(data, '上海市 xx 大厦', '海上');

    // 遍历并脱敏每个记录的 str 字段
    records.forEach((record, index) => {
      if (record.str) {
        record.str = desensitize(record.str, index % 365);
      }
    });

    // 保存脱敏后的文件
    const newFilePath = filePath.replace('.json', '_desensitized.json');
    fs.writeFileSync(newFilePath, JSON.stringify(records, null, 2));
    console.log(`脱敏完成：${path.basename(newFilePath)}`);

  } catch (error) {
    console.error(`❌ 处理 ${filePath} 失败:`, error.message);
  }
}

// 处理所有文件
const filesToProcess = [
  '/workspace/tests/adapters/boc-debit/p1.json',
  '/workspace/tests/adapters/boc-debit/p2.json'
];

filesToProcess.forEach(processFile);