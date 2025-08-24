const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middleware/adminAuth');
const { 
  getConfiguration, 
  updateConfiguration 
} = require('../controllers/configController');

// 获取配置信息路由
router.get('/config', authenticateAdmin, async (req, res) => {
  try {
    const config = await getConfiguration();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ success: false, message: "获取配置失败" });
  }
});

// 更新配置信息路由
router.post('/config', authenticateAdmin, async (req, res) => {
  try {
    await updateConfiguration(req.body);
    res.json({ success: true, message: "配置更新成功" });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ success: false, message: "更新配置失败" });
  }
});

module.exports = router;