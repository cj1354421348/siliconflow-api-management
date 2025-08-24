const db = require('../config/database');
const keyBalanceCache = require('./keyBalanceCache');
const { getKeyBalance } = require('./keyUtils');

// 从数据库中获取有效且有余额的密钥
async function selectValidKey(maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 如果不是第一次尝试，打印重试信息
      if (attempt > 0) {
        console.log(`尝试使用另一个密钥，第${attempt+1}次尝试`);
      }
      
      // 获取数据库中的所有密钥
      const keys = await new Promise((resolve, reject) => {
        db.all("SELECT key FROM keys", (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) {
            reject(new Error("数据库中没有可用的密钥"));
            return;
          }
          resolve(rows.map(row => row.key));
        });
      });
      
      console.log(`从数据库中找到 ${keys.length} 个密钥`);
      
      // 检查所有密钥余额，只选择有余额的密钥
      let validKeys = [];
      let errorMessages = [];
      
      // 避免每次都检查所有密钥，使用缓存
      for (const key of keys) {
        try {
          const balanceInfo = await getKeyBalance(key, keyBalanceCache);
          if (balanceInfo.success && balanceInfo.isValid && parseFloat(balanceInfo.balance) > 0) {
            validKeys.push({
              key: key,
              balance: parseFloat(balanceInfo.balance)
            });
          } else {
            errorMessages.push(`密钥 ${key.substring(0, 5)}... 无效: ${balanceInfo.message || '余额不足'}`);
          }
        } catch (keyError) {
          console.error(`检查密钥 ${key.substring(0, 5)}... 失败:`, keyError);
          errorMessages.push(`密钥 ${key.substring(0, 5)}... 检查失败: ${keyError.message}`);
        }
      }
      
      console.log(`找到 ${validKeys.length} 个有效密钥`);
      
      // 如果没有有效密钥，返回错误
      if (validKeys.length === 0) {
        const error = new Error("没有可用的API密钥，所有密钥均无余额或无效");
        error.details = errorMessages;
        error.code = 50301;
        throw error;
      }
      
      // 按余额排序，优先使用余额高的密钥
      validKeys.sort((a, b) => b.balance - a.balance);
      
      // 如果不是第一次尝试，从列表中排除上次使用的密钥（如果还有其他可用的）
      if (attempt > 0 && lastError && lastError.usedKey && validKeys.length > 1) {
        validKeys = validKeys.filter(k => k.key !== lastError.usedKey);
      }
      
      // 随机选择前50%的高余额密钥
      let selectedKeyObj;
      if (validKeys.length === 1) {
        selectedKeyObj = validKeys[0];
      } else {
        const topHalfCount = Math.max(1, Math.ceil(validKeys.length / 2));
        const topKeys = validKeys.slice(0, topHalfCount);
        selectedKeyObj = topKeys[Math.floor(Math.random() * topKeys.length)];
      }
      
      const randomKey = selectedKeyObj.key;
      console.log(`选择密钥: ${randomKey.substring(0, 5)}... (余额: ${selectedKeyObj.balance})`);
      
      return { 
        key: randomKey, 
        balance: selectedKeyObj.balance,
        lastError: null
      };
    } catch (error) {
      console.error(`第${attempt+1}次尝试失败:`, error);
      lastError = error;
      
      // 如果已经是最后一次尝试，则抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }
}

module.exports = {
  selectValidKey
};