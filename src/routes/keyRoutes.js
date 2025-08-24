const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middleware/adminAuth');
const { authenticateGuest, validateGuestToken } = require('../middleware/guestAuth');
const { 
  getAllKeys, 
  addKey, 
  deleteKey
} = require('../controllers/keyController');
const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');

// 获取密钥列表路由
router.get('/keys', async (req, res) => {
  try {
    // 获取访问控制模式
    const accessControl = await getConfigValue('access_control', CONFIG.ACCESS_CONTROL);
    
    // 如果不是开放模式，则需要验证
    if (accessControl !== 'open') {
      // 检查是否是管理员
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Basic ')) {
        // 管理员认证
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        
        const adminUsername = await getConfigValue('admin_username', CONFIG.ADMIN_USERNAME);
        const adminPassword = await getConfigValue('admin_password', CONFIG.ADMIN_PASSWORD);
        
        if (username !== adminUsername || password !== adminPassword) {
          return res.status(401).json({ success: false, message: "管理员认证失败" });
        }
      } else if (accessControl === 'restricted') {
        // 访客认证
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, message: "需要访客认证" });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        const guestPassword = await getConfigValue('guest_password', CONFIG.GUEST_PASSWORD);
        const payload = validateGuestToken(token, guestPassword);
        
        if (!payload) {
          return res.status(401).json({ success: false, message: "访客认证失败" });
        }
      } else if (accessControl === 'private') {
        // 私有模式下，只有管理员可以访问
        return res.status(403).json({ success: false, message: "仅管理员可访问" });
      }
    }
    
    const keys = await getAllKeys();
    res.json({ success: true, data: keys });
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    res.status(500).json({ success: false, message: "获取密钥列表失败" });
  }
});

// 添加密钥路由
router.post('/add-key', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: "密钥不能为空" });
    }

    await addKey(key);
    res.json({ success: true, message: "密钥添加成功" });
  } catch (error) {
    console.error('添加密钥失败:', error);
    
    // 处理密钥已存在的情况
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, message: "密钥已存在" });
    }
    
    res.status(500).json({ success: false, message: "添加密钥失败" });
  }
});

// 删除密钥路由
router.post('/delete-key', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: "密钥不能为空" });
    }

    await deleteKey(key);
    res.json({ success: true, message: "密钥删除成功" });
  } catch (error) {
    console.error('删除密钥失败:', error);
    res.status(500).json({ success: false, message: "删除密钥失败" });
  }
});

module.exports = router;