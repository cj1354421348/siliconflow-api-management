const { getConfigValue } = require('../controllers/configController');
const CONFIG = require('../config/config');
const keyBalanceCache = require('../utils/keyBalanceCache');
const { selectValidKey } = require('../utils/keySelector');
const { forwardRequest, handleStreamResponse, handleJsonResponse } = require('../utils/requestForwarder');

// API代理请求处理函数
async function handleProxyRequest(req, res) {
  try {
    // 1. 获取验证密钥（用于验证用户是否可以访问接口）
    const authApiKey = await getConfigValue('auth_api_key', CONFIG.AUTH_API_KEY);
    
    // 2. 获取请求中的用户提供的密钥
    const authHeader = req.headers.authorization;
    const userApiKey = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    // 3. 验证用户提供的密钥是否与验证密钥匹配
    if (!userApiKey) {
      return res.status(401).json({
        code: 40100,
        message: "缺少API密钥",
        status: false
      });
    }
    
    // 如果需要严格验证用户密钥，取消注释下面的代码
    if (userApiKey !== authApiKey) {
      return res.status(401).json({
        code: 40100,
        message: "无效的API密钥",
        status: false
      });
    }
    
    // 记录请求信息
    console.log(`收到API请求: ${req.method} ${req.path}`);
    console.log('查询参数:', req.query);
    
    // 检查是否为流式请求
    let isStreamRequest = false;
    if (req.path.includes('/chat/completions') && req.body && req.body.stream === true) {
      isStreamRequest = true;
      console.log('检测到流式请求');
    }
    
    // 4. 从数据库中获取有效且有余额的密钥
    const { key: randomKey } = await selectValidKey(3);
    
    // 5. 使用选中的密钥转发请求到siliconflow API
    const targetUrl = "https://api.siliconflow.cn" + req.path;
    
    // 替换Authorization头，使用从数据库获取的密钥
    const headers = { ...req.headers };
    headers.authorization = `Bearer ${randomKey}`;
    
    // 添加查询参数到URL
    let fullUrl = targetUrl;
    if (Object.keys(req.query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        searchParams.append(key, value);
      }
      fullUrl = `${targetUrl}?${searchParams.toString()}`;
    }
    
    // 获取原始请求体
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
      }
    }
    
    // 发起请求
    const response = await forwardRequest(fullUrl, req.method, headers, body, isStreamRequest);
    
    // 检查响应状态码，如果是密钥错误，清除该密钥的缓存并重试
    if (response.status === 401) {
      console.error(`密钥 ${randomKey.substring(0, 5)}... 认证失败，清除缓存并尝试另一个密钥`);
      keyBalanceCache.clear(randomKey);
      // 这里应该重新选择密钥并重试，但在当前实现中我们直接返回错误
    }
    
    // 处理流式响应
    const isStreamHandled = handleStreamResponse(response, res, isStreamRequest);
    if (isStreamHandled) {
      return;
    }
    
    // 处理JSON响应
    await handleJsonResponse(response, res);
  } catch (error) {
    console.error("处理API代理请求时出错:", error);
    console.error("错误堆栈:", error.stack);
    
    if (error.code === 50301) {
      return res.status(503).json({
        code: 50301,
        message: "没有可用的API密钥，所有密钥均无余额或无效",
        status: false,
        details: error.details || []
      });
    } else {
      return res.status(503).json({
        code: 50300,
        message: "API服务暂时不可用: " + error.message,
        status: false
      });
    }
  }
}

module.exports = {
  handleProxyRequest
};