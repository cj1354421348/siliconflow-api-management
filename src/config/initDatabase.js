const db = require('./database');
const CONFIG = require('./config');

// 初始化数据库
function initDatabase() {
  db.serialize(() => {
    // 创建配置表
    db.run(`CREATE TABLE IF NOT EXISTS config (
      name TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 创建密钥表
    db.run(`CREATE TABLE IF NOT EXISTS keys (
      key TEXT PRIMARY KEY,
      balance REAL DEFAULT 0,
      created_at DATETIME,
      last_updated DATETIME
    )`);

    // 插入默认配置
    const defaultConfig = {
      admin_username: process.env.ADMIN_USERNAME || CONFIG.ADMIN_USERNAME,
      admin_password: process.env.ADMIN_PASSWORD || CONFIG.ADMIN_PASSWORD,
      auth_api_key: process.env.AUTH_API_KEY || CONFIG.AUTH_API_KEY,
      page_size: process.env.PAGE_SIZE || CONFIG.PAGE_SIZE,
      access_control: process.env.ACCESS_CONTROL || CONFIG.ACCESS_CONTROL,
      guest_password: process.env.GUEST_PASSWORD || CONFIG.GUEST_PASSWORD
    };

    const stmt = db.prepare('INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)');
    Object.entries(defaultConfig).forEach(([key, value]) => {
      stmt.run(key, value);
    });
    stmt.finalize();
  });
}

module.exports = initDatabase;