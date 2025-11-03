// 引入文件系统模块
import fs from 'fs'; // 
import path from 'path';
// 引入脱敏函数（假设 boc_credit_desensitize.js 在相同目录）
import { desensitize, replaceDealDetail } from '../../../scripts/boc_credit_desensitize.js';


// 处理单个文件
function processFile(filePath) {
  try {
    // 读取 JSON 文件
    var data = fs.readFileSync(filePath, 'utf8');
    const records = JSON.parse(data);
    // data = replaceAllOccurrences(data, '上海市xx大厦', '海上');

    // 遍历并脱敏每个记录的 str 字段
    records.forEach((record, index) => {
      if (record.str) {
        record.str = desensitize(record.str, index % 365);
        record.str = replaceDealDetail(record.str);
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

// 处理指定目录下的所有 JSON 文件
function processDirectory(dirPath) {
  try {
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      console.log(`目录不存在: ${dirPath}，跳过处理`);
      return;
    }
    
    // 检查是否是目录
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      console.log(`路径 ${dirPath} 不是目录，跳过处理`);
      return;
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(dirPath);
    
    // 过滤出 JSON 文件并且不包含 _desensitized 的文件
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && !file.includes('_desensitized')
    );
    
    console.log(`在 ${dirPath} 中找到 ${jsonFiles.length} 个 JSON 文件`);
    
    // 处理每个 JSON 文件
    jsonFiles.forEach(file => {
      const filePath = path.join(dirPath, file);
      processFile(filePath);
    });
  } catch (error) {
    console.error(`❌ 处理目录 ${dirPath} 失败:`, error.message);
  }
}

// 要处理的目录列表
const directoriesToProcess = [
  './pdf1',
  './pdf2',
  './pdf3',
  './pdf4'
];

// 处理每个目录
directoriesToProcess.forEach(dir => {
  console.log(`开始处理目录: ${dir}`);
  processDirectory(dir);
});