const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');

// 管理员认证中间件
async function authenticateAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      return res.status(401).json({ success: false, message: "需要管理员认证" });
    }

    const base64Credentials = auth.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const adminUsername = await getConfigValue('admin_username', CONFIG.ADMIN_USERNAME);
    const adminPassword = await getConfigValue('admin_password', CONFIG.ADMIN_PASSWORD);

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ success: false, message: "管理员用户名或密码错误" });
    }

    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({ success: false, message: "认证过程中发生错误" });
  }
}

module.exports = authenticateAdmin;