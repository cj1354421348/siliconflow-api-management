const db = require('../config/database');
const keyBalanceCache = require('../utils/keyBalanceCache');
const { getKeyBalance } = require('../utils/keyUtils');

// 获取所有密钥
async function getAllKeys() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM keys ORDER BY created_at DESC", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // 获取每个密钥的余额
        const keysWithBalance = await Promise.all(rows.map(async (row) => {
          const balanceInfo = await getKeyBalance(row.key, keyBalanceCache);
          return {
            ...row,
            balance: balanceInfo.balance,
            isValid: balanceInfo.isValid
          };
        }));

        resolve(keysWithBalance);
      } catch (error) {
        console.error("获取余额失败:", error);
        resolve(rows.map(row => ({ ...row, balance: "0.00", isValid: false })));
      }
    });
  });
}

// 更新密钥最后检查时间
async function updateKeyLastCheckTime(key, lastUpdated) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE keys SET last_updated = ? WHERE key = ?',
      [lastUpdated, key],
      function(err) {
        if (err) {
          console.error(`更新密钥 ${key} 时间失败:`, err);
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

// 添加新密钥
async function addKey(key) {
  return new Promise((resolve, reject) => {
    // 首先检查密钥是否已存在
    db.get('SELECT * FROM keys WHERE key = ?', [key], (err, row) => {
      if (err) {
        console.error("检查密钥是否存在时出错:", err);
        resolve({ success: false, message: "数据库操作失败" });
        return;
      }
      
      if (row) {
        // 密钥已存在
        resolve({ success: false, message: "该密钥已存在，请勿重复添加" });
        return;
      }
      
      // 密钥不存在，添加新密钥
      const now = new Date().toISOString();
      db.run(
        'INSERT INTO keys (key, created_at, last_updated) VALUES (?, ?, ?)',
        [key, now, now],
        function(err) {
          if (err) {
            console.error("添加密钥失败:", err);
            resolve({ success: false, message: "添加密钥失败" });
            return;
          }
          resolve({ success: true, message: "密钥添加成功" });
        }
      );
    });
  });
}

// 删除密钥
async function deleteKey(key) {
  return new Promise((resolve, reject) => {
    // 先检查密钥是否存在
    db.get('SELECT * FROM keys WHERE key = ?', [key], (err, row) => {
      if (err) {
        console.error(`检查密钥 ${key} 是否存在时出错:`, err);
        resolve({ success: false, message: "数据库操作失败" });
        return;
      }
      
      if (!row) {
        // 密钥不存在
        resolve({ success: false, message: "该密钥不存在" });
        return;
      }

      // 密钥存在，执行删除
      db.run(
        'DELETE FROM keys WHERE key = ?',
        [key],
        function(err) {
          if (err) {
            console.error(`删除密钥 ${key} 失败:`, err);
            resolve({ success: false, message: "删除密钥失败" });
            return;
          }
          resolve({ success: true, message: "密钥删除成功" });
        }
      );
    });
  });
}

module.exports = {
  getAllKeys,
  updateKeyLastCheckTime,
  addKey,
  deleteKey
};