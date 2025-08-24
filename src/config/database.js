const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 确定应用根目录
const isProduction = process.pkg !== undefined;
const appRootDir = isProduction ? path.dirname(process.execPath) : path.join(__dirname, '..', '..');
console.log('应用根目录:', appRootDir);

// 确定数据库路径 (保持与原版本一致)
const dbPath = path.join(appRootDir, 'database.sqlite');
console.log('数据库路径:', dbPath);

// 数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
});

module.exports = db;