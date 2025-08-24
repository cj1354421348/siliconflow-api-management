const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middleware/adminAuth');
const keyBalanceCache = require('../utils/keyBalanceCache');
const { getKeyBalance } = require('../utils/keyUtils');
const { 
  updateKeyLastCheckTime,
  getAllKeys
} = require('../controllers/keyController');

// 刷新密钥余额路由
router.post('/refresh-key-balance', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: "密钥不能为空" });
    }

    // 清除缓存
    keyBalanceCache.clear(key);
    
    const balanceInfo = await getKeyBalance(key, keyBalanceCache);
    await updateKeyLastCheckTime(key, new Date().toISOString());
    
    res.json({ 
      success: true, 
      message: "余额刷新成功", 
      data: { key, balance: balanceInfo.balance, isValid: balanceInfo.isValid } 
    });
  } catch (error) {
    console.error('刷新余额失败:', error);
    res.status(500).json({ success: false, message: "刷新余额失败" });
  }
});

// 刷新所有密钥余额路由
router.post('/refresh-all-balances', authenticateAdmin, async (req, res) => {
  try {
    // 清除所有缓存
    keyBalanceCache.clear();
    
    const keys = await getAllKeys();
    
    for (const key of keys) {
      try {
        const balanceInfo = await getKeyBalance(key.key, keyBalanceCache);
        await updateKeyLastCheckTime(key.key, new Date().toISOString());
      } catch (error) {
        console.error(`刷新密钥 ${key.key} 余额失败:`, error);
      }
    }
    
    res.json({ success: true, message: "所有余额刷新成功" });
  } catch (error) {
    console.error('刷新所有余额失败:', error);
    res.status(500).json({ success: false, message: "刷新所有余额失败" });
  }
});

module.exports = router;