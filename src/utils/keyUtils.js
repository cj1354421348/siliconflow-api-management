const fetch = require('node-fetch');

// 获取密钥余额和状态
async function getKeyBalance(key, keyBalanceCache) {
  // 首先检查缓存
  const cachedInfo = keyBalanceCache.get(key);
  if (cachedInfo) {
    console.log(`使用缓存的密钥余额: ${key.substring(0, 5)}...`);
    return cachedInfo;
  }
  
  try {
    const response = await fetch("https://api.siliconflow.cn/v1/user/info", {
      headers: {
        "Authorization": `Bearer ${key}`
      }
    });
    
    const data = await response.json();
    const result = { timestamp: Date.now() };
    
    if (data.code === 20000 && data.status) {
      const balance = data.data.totalBalance || "0.00";
      const isValid = parseFloat(balance) > 0;
      
      result.balance = balance;
      result.isValid = isValid;
      result.success = true;
    } else {
      result.balance = "0.00";
      result.isValid = false;
      result.success = false;
      result.message = data.message || "获取余额失败";
    }
    
    // 保存到缓存
    keyBalanceCache.set(key, result);
    
    return result;
  } catch (error) {
    console.error(`获取密钥 ${key} 余额失败:`, error);
    const result = { 
      balance: "0.00", 
      isValid: false,
      success: false,
      message: "API请求失败",
      timestamp: Date.now()
    };
    
    // 即使失败也缓存结果，但缓存时间较短
    keyBalanceCache.set(key, result);
    
    return result;
  }
}

module.exports = {
  getKeyBalance
};