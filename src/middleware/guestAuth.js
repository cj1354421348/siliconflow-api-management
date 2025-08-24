const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');

// 访客认证中间件
async function authenticateGuest(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "需要访客认证" });
    }

    const token = auth.split(' ')[1];
    const accessControl = await getConfigValue('access_control', CONFIG.ACCESS_CONTROL);

    // 如果是开放模式，则不需要验证
    if (accessControl === 'open') {
      return next();
    }

    // 验证token (简单实现，使用guest_password作为secret)
    const guestPassword = await getConfigValue('guest_password', CONFIG.GUEST_PASSWORD);
    const payload = validateGuestToken(token, guestPassword);
    
    if (!payload) {
      return res.status(401).json({ success: false, message: "访客认证无效" });
    }

    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({ success: false, message: "认证过程中发生错误" });
  }
}

// 生成访客token
function generateGuestToken(guestPassword) {
  // 简单实现，实际应用中应该使用更安全的方法
  const timestamp = Date.now();
  const payload = { timestamp, guestPassword };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 验证访客token
function validateGuestToken(token, guestPassword) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    // 检查密码是否匹配
    if (decoded.guestPassword !== guestPassword) {
      return null;
    }
    
    // 可以在这里添加token过期检查
    // 例如: if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) { return null; } // 24小时过期
    
    return decoded;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

module.exports = {
  authenticateGuest,
  generateGuestToken,
  validateGuestToken
};