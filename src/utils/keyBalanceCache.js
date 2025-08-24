// 密钥余额缓存，用于减少API调用频率
const keyBalanceCache = {
  cache: {},  // 存储格式: { key: { balance, isValid, timestamp } }
  cacheTime: 5 * 60 * 1000,  // 缓存有效期5分钟
  
  // 获取缓存的余额信息
  get(key) {
    const cacheEntry = this.cache[key];
    if (!cacheEntry) return null;
    
    // 检查缓存是否过期
    if (Date.now() - cacheEntry.timestamp > this.cacheTime) {
      delete this.cache[key];
      return null;
    }
    
    return cacheEntry;
  },
  
  // 设置缓存
  set(key, balanceInfo) {
    this.cache[key] = {
      ...balanceInfo,
      timestamp: Date.now()
    };
  },
  
  // 清除特定密钥的缓存
  clear(key) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }
};

module.exports = keyBalanceCache;