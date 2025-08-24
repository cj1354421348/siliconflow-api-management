const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 确定应用根目录
const isProduction = process.pkg !== undefined;
const appRootDir = isProduction ? path.dirname(process.execPath) : __dirname;
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
  
  // 添加测试密钥
  const testKey = 'sk-1234567890abcdef1234567890abcdef';
  const now = new Date().toISOString();
  
  db.run(
    'INSERT OR IGNORE INTO keys (key, created_at, last_updated) VALUES (?, ?, ?)',
    [testKey, now, now],
    function(err) {
      if (err) {
        console.error('添加测试密钥失败:', err);
        return;
      }
      
      console.log('测试密钥添加成功');
      
      // 查询所有密钥
      db.all("SELECT * FROM keys", (err, rows) => {
        if (err) {
          console.error('查询密钥失败:', err);
          return;
        }
        
        console.log('密钥数量:', rows.length);
        console.log('密钥列表:', rows);
        db.close();
      });
    }
  );
});