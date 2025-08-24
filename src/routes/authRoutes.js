const express = require('express');
const router = express.Router();
const { generateGuestToken, validateGuestToken } = require('../middleware/guestAuth');
const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');

// 验证token有效性路由
router.get('/verify-token', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "需要Token认证" });
    }

    const token = auth.split(' ')[1];
    const accessControl = await getConfigValue('access_control', CONFIG.ACCESS_CONTROL);

    // 如果是开放模式，则直接返回有效
    if (accessControl === 'open') {
      return res.json({ success: true, message: "开放模式，无需验证Token" });
    }

    // 验证token
    const guestPassword = await getConfigValue('guest_password', CONFIG.GUEST_PASSWORD);
    const payload = validateGuestToken(token, guestPassword);
    
    if (!payload) {
      return res.status(401).json({ success: false, message: "Token无效或已过期" });
    }

    res.json({ success: true, message: "Token有效" });
  } catch (error) {
    console.error('验证Token失败:', error);
    res.status(500).json({ success: false, message: "验证Token时发生错误" });
  }
});

// 验证访客路由
router.post('/verify-guest', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "需要访客密码" });
    }

    const guestPassword = await getConfigValue('guest_password', CONFIG.GUEST_PASSWORD);
    
    if (password !== guestPassword) {
      return res.status(401).json({ success: false, message: "访客密码错误" });
    }

    // 生成并返回token
    const token = generateGuestToken(guestPassword);
    res.json({ success: true, token });
  } catch (error) {
    console.error('验证访客失败:', error);
    res.status(500).json({ success: false, message: "验证访客时发生错误" });
  }
});

module.exports = router;