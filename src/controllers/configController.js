const db = require('../config/database');
const CONFIG = require('../config/config');

// 从数据库获取配置值
async function getConfigValue(name, defaultValue) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE name = ?', [name], (err, row) => {
      if (err) {
        console.error(`获取配置 ${name} 失败:`, err);
        resolve(defaultValue);
        return;
      }
      resolve(row ? row.value : defaultValue);
    });
  });
}

// 获取配置
async function getConfiguration() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM config', [], (err, rows) => {
      if (err) {
        console.error("获取配置失败:", err);
        resolve(CONFIG);
        return;
      }

      const config = {};
      rows.forEach(row => {
        config[row.name] = row.value;
      });

      resolve({
        adminUsername: config.admin_username || CONFIG.ADMIN_USERNAME,
        adminPassword: config.admin_password || CONFIG.ADMIN_PASSWORD,
        authApiKey: config.auth_api_key || CONFIG.AUTH_API_KEY,
        pageSize: parseInt(config.page_size || CONFIG.PAGE_SIZE),
        accessControl: config.access_control || CONFIG.ACCESS_CONTROL,
        guestPassword: config.guest_password || CONFIG.GUEST_PASSWORD
      });
    });
  });
}

// 更新配置
async function updateConfiguration(config) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)');
    let success = true;

    Object.entries(config).forEach(([key, value]) => {
      stmt.run(key, value, (err) => {
        if (err) {
          console.error("更新配置失败:", err);
          success = false;
        }
      });
    });

    stmt.finalize(() => {
      resolve(success);
    });
  });
}

module.exports = {
  getConfigValue,
  getConfiguration,
  updateConfiguration
};