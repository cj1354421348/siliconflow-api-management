const express = require('express');
const router = express.Router();
const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');

// 获取访问控制设置
router.get('/access-control', async (req, res) => {
  try {
    const accessControl = await getConfigValue('access_control', CONFIG.ACCESS_CONTROL);
    res.json({ success: true, data: { accessControl } });
  } catch (error) {
    console.error('获取访问控制设置失败:', error);
    res.status(500).json({ success: false, message: "获取访问控制设置失败" });
  }
});

module.exports = router;