const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

// 确定应用根目录
const isProduction = process.pkg !== undefined;
const appRootDir = isProduction ? path.dirname(process.execPath) : __dirname;
console.log('应用根目录:', appRootDir);

const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(appRootDir, 'public')));

// 确定数据库路径
const dbPath = path.join(appRootDir, 'database.sqlite');
console.log('数据库路径:', dbPath);

// 数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
  initDatabase();
});

// 初始化数据库
function initDatabase() {
  db.serialize(() => {
    // 创建配置表
    db.run(`CREATE TABLE IF NOT EXISTS config (
      name TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 创建密钥表
    db.run(`CREATE TABLE IF NOT EXISTS keys (
      key TEXT PRIMARY KEY,
      balance REAL DEFAULT 0,
      created_at DATETIME,
      last_updated DATETIME
    )`);

    // 插入默认配置
    const defaultConfig = {
      admin_username: process.env.ADMIN_USERNAME || "default-admin-username",
      admin_password: process.env.ADMIN_PASSWORD || "default-admin-password",
      auth_api_key: process.env.AUTH_API_KEY || "your-api-key",
      page_size: process.env.PAGE_SIZE || "12",
      access_control: process.env.ACCESS_CONTROL || "open",
      guest_password: process.env.GUEST_PASSWORD || "guest_password"
    };

    const stmt = db.prepare('INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)');
    Object.entries(defaultConfig).forEach(([key, value]) => {
      stmt.run(key, value);
    });
    stmt.finalize();
  });
}

// 配置对象
const CONFIG = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "default-admin-username",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "default-admin-password",
  AUTH_API_KEY: process.env.AUTH_API_KEY || "your-api-key",
  PAGE_SIZE: parseInt(process.env.PAGE_SIZE || "12"),
  ACCESS_CONTROL: process.env.ACCESS_CONTROL || "open",
  GUEST_PASSWORD: process.env.GUEST_PASSWORD || "guest_password"
};

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

// 从数据库获取配置值
async function getConfigValue(name, defaultValue) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE name = ?', [name], (err, row) => {
      if (err) {
        console.error(`获取配置 ${name} 失败:`, err);
        resolve(defaultValue);
        return;
      }
      resolve(row ? row.value : defaultValue);
    });
  });
}

// 获取所有密钥
async function getAllKeys() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM keys ORDER BY created_at DESC", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // 获取每个密钥的余额
        const keysWithBalance = await Promise.all(rows.map(async (row) => {
          const balanceInfo = await getKeyBalance(row.key);
          return {
            ...row,
            balance: balanceInfo.balance,
            isValid: balanceInfo.isValid
          };
        }));

        resolve(keysWithBalance);
      } catch (error) {
        console.error("获取余额失败:", error);
        resolve(rows.map(row => ({ ...row, balance: "0.00", isValid: false })));
      }
    });
  });
}

// 获取密钥余额和状态
async function getKeyBalance(key) {
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
      
      // 更新密钥最后检查时间
      await updateKeyLastCheckTime(key, new Date().toISOString());
      
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

// 更新密钥最后检查时间
async function updateKeyLastCheckTime(key, lastUpdated) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE keys SET last_updated = ? WHERE key = ?',
      [lastUpdated, key],
      function(err) {
        if (err) {
          console.error(`更新密钥 ${key} 时间失败:`, err);
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

// 添加新密钥
async function addKey(key) {
  return new Promise((resolve, reject) => {
    // 首先检查密钥是否已存在
    db.get('SELECT * FROM keys WHERE key = ?', [key], (err, row) => {
      if (err) {
        console.error("检查密钥是否存在时出错:", err);
        resolve({ success: false, message: "数据库操作失败" });
        return;
      }
      
      if (row) {
        // 密钥已存在
        resolve({ success: false, message: "该密钥已存在，请勿重复添加" });
        return;
      }
      
      // 密钥不存在，添加新密钥
      const now = new Date().toISOString();
      db.run(
        'INSERT INTO keys (key, created_at, last_updated) VALUES (?, ?, ?)',
        [key, now, now],
        function(err) {
          if (err) {
            console.error("添加密钥失败:", err);
            resolve({ success: false, message: "添加密钥失败" });
            return;
          }
          resolve({ success: true, message: "密钥添加成功" });
        }
      );
    });
  });
}

// 删除密钥
async function deleteKey(key) {
  return new Promise((resolve, reject) => {
    // 先检查密钥是否存在
    db.get('SELECT * FROM keys WHERE key = ?', [key], (err, row) => {
      if (err) {
        console.error(`检查密钥 ${key} 是否存在时出错:`, err);
        resolve({ success: false, message: "数据库操作失败" });
        return;
      }
      
      if (!row) {
        // 密钥不存在
        resolve({ success: false, message: "该密钥不存在" });
        return;
      }

      // 密钥存在，执行删除
      db.run(
        'DELETE FROM keys WHERE key = ?',
        [key],
        function(err) {
          if (err) {
            console.error(`删除密钥 ${key} 失败:`, err);
            resolve({ success: false, message: "删除密钥失败" });
            return;
          }
          resolve({ success: true, message: "密钥删除成功" });
        }
      );
    });
  });
}

// 获取配置
async function getConfiguration() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM config', [], (err, rows) => {
      if (err) {
        console.error("获取配置失败:", err);
        resolve(CONFIG);
        return;
      }

      const config = {};
      rows.forEach(row => {
        config[row.name] = row.value;
      });

      resolve({
        adminUsername: config.admin_username || CONFIG.ADMIN_USERNAME,
        adminPassword: config.admin_password || CONFIG.ADMIN_PASSWORD,
        authApiKey: config.auth_api_key || CONFIG.AUTH_API_KEY,
        pageSize: parseInt(config.page_size || CONFIG.PAGE_SIZE),
        accessControl: config.access_control || CONFIG.ACCESS_CONTROL,
        guestPassword: config.guest_password || CONFIG.GUEST_PASSWORD
      });
    });
  });
}

// 更新配置
async function updateConfiguration(config) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)');
    let success = true;

    Object.entries(config).forEach(([key, value]) => {
      stmt.run(key, value, (err) => {
        if (err) {
          console.error("更新配置失败:", err);
          success = false;
        }
      });
    });

    stmt.finalize(() => {
      resolve(success);
    });
  });
}

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

// 路由配置
app.get('/', (req, res) => {
  res.sendFile(path.join(appRootDir, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(appRootDir, 'public', 'admin.html'));
});

// 获取配置信息路由
app.get('/api/config', authenticateAdmin, async (req, res) => {
  try {
    const config = await getConfiguration();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ success: false, message: "获取配置失败" });
  }
});

// 更新配置信息路由
app.post('/api/config', authenticateAdmin, async (req, res) => {
  try {
    await updateConfiguration(req.body);
    res.json({ success: true, message: "配置更新成功" });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ success: false, message: "更新配置失败" });
  }
});

// 获取密钥列表路由
app.get('/api/keys', async (req, res) => {
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

// 获取访问控制设置
app.get('/api/access-control', async (req, res) => {
  try {
    const accessControl = await getConfigValue('access_control', CONFIG.ACCESS_CONTROL);
    res.json({ success: true, data: { accessControl } });
  } catch (error) {
    console.error('获取访问控制设置失败:', error);
    res.status(500).json({ success: false, message: "获取访问控制设置失败" });
  }
});

// 添加密钥路由
app.post('/api/add-key', authenticateAdmin, async (req, res) => {
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
app.post('/api/delete-key', authenticateAdmin, async (req, res) => {
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

// 刷新密钥余额路由
app.post('/api/refresh-key-balance', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: "密钥不能为空" });
    }

    // 清除缓存
    keyBalanceCache.clear(key);
    
    const balanceInfo = await getKeyBalance(key);
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
app.post('/api/refresh-all-balances', authenticateAdmin, async (req, res) => {
  try {
    // 清除所有缓存
    keyBalanceCache.clear();
    
    const keys = await getAllKeys();
    
    for (const key of keys) {
      try {
        const balanceInfo = await getKeyBalance(key.key);
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

// API代理路由
app.all('/v1/*', async (req, res) => {
  try {
    // 1. 获取验证密钥（用于验证用户是否可以访问接口）
    const authApiKey = await getConfigValue('auth_api_key', 'your-api-key');
    
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
    const maxRetries = 3; // 最大重试次数
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 如果不是第一次尝试，打印重试信息
        if (attempt > 0) {
          console.log(`尝试使用另一个密钥，第${attempt+1}次尝试`);
        }
        
        // 获取数据库中的所有密钥
        const keys = await new Promise((resolve, reject) => {
          db.all("SELECT key FROM keys", (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            if (!rows || rows.length === 0) {
              reject(new Error("数据库中没有可用的密钥"));
              return;
            }
            resolve(rows.map(row => row.key));
          });
        });
        
        console.log(`从数据库中找到 ${keys.length} 个密钥`);
        
        // 检查所有密钥余额，只选择有余额的密钥
        let validKeys = [];
        let errorMessages = [];
        
        // 避免每次都检查所有密钥，使用缓存
        for (const key of keys) {
          try {
            const balanceInfo = await getKeyBalance(key);
            if (balanceInfo.success && balanceInfo.isValid && parseFloat(balanceInfo.balance) > 0) {
              validKeys.push({
                key: key,
                balance: parseFloat(balanceInfo.balance)
              });
            } else {
              errorMessages.push(`密钥 ${key.substring(0, 5)}... 无效: ${balanceInfo.message || '余额不足'}`);
            }
          } catch (keyError) {
            console.error(`检查密钥 ${key.substring(0, 5)}... 失败:`, keyError);
            errorMessages.push(`密钥 ${key.substring(0, 5)}... 检查失败: ${keyError.message}`);
          }
        }
        
        console.log(`找到 ${validKeys.length} 个有效密钥`);
        
        // 如果没有有效密钥，返回错误
        if (validKeys.length === 0) {
          const error = new Error("没有可用的API密钥，所有密钥均无余额或无效");
          error.details = errorMessages;
          error.code = 50301;
          throw error;
        }
        
        // 按余额排序，优先使用余额高的密钥
        validKeys.sort((a, b) => b.balance - a.balance);
        
        // 如果不是第一次尝试，从列表中排除上次使用的密钥（如果还有其他可用的）
        if (attempt > 0 && lastError && lastError.usedKey && validKeys.length > 1) {
          validKeys = validKeys.filter(k => k.key !== lastError.usedKey);
        }
        
        // 随机选择前50%的高余额密钥
        let selectedKeyObj;
        if (validKeys.length === 1) {
          selectedKeyObj = validKeys[0];
        } else {
          const topHalfCount = Math.max(1, Math.ceil(validKeys.length / 2));
          const topKeys = validKeys.slice(0, topHalfCount);
          selectedKeyObj = topKeys[Math.floor(Math.random() * topKeys.length)];
        }
        
        const randomKey = selectedKeyObj.key;
        console.log(`选择密钥: ${randomKey.substring(0, 5)}... (余额: ${selectedKeyObj.balance})`);
        
        // 5. 使用选中的密钥转发请求到siliconflow API
        const targetUrl = "https://api.siliconflow.cn" + req.path;
        console.log('转发请求到:', targetUrl);
        
        // 准备请求头，保留原始请求的所有头信息
        const headers = { ...req.headers };
        
        // 替换Authorization头，使用从数据库获取的密钥
        headers.authorization = `Bearer ${randomKey}`;
        
        // 删除host头，避免请求转发问题
        delete headers.host;
        delete headers['content-length']; // 删除内容长度头，让fetch自动计算
        
        // 设置content-type(如果没有的话)
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
        
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
        const fetchOptions = {
          method: req.method,
          headers: headers,
          body: body
        };
        
        // 使用更强大的错误处理
        let response;
        try {
          const startTime = Date.now();
          response = await fetch(fullUrl, fetchOptions);
          const requestTime = Date.now() - startTime;
          console.log(`获得响应状态码: ${response.status}，耗时: ${requestTime}ms`);
          
          // 检查响应状态码，如果是密钥错误，清除该密钥的缓存并重试
          if (response.status === 401) {
            console.error(`密钥 ${randomKey.substring(0, 5)}... 认证失败，清除缓存并尝试另一个密钥`);
            keyBalanceCache.clear(randomKey);
            
            // 记录这个密钥以便下次排除
            lastError = new Error("API密钥认证失败");
            lastError.usedKey = randomKey;
            continue; // 进行下一次尝试
          }
        } catch (fetchError) {
          console.error('Fetch请求失败:', fetchError.message);
          if (fetchError.cause) {
            console.error('错误原因:', fetchError.cause);
          }
          
          lastError = fetchError;
          lastError.usedKey = randomKey;
          continue; // 进行下一次尝试
        }
        
        // 从响应中获取内容
        const contentType = response.headers.get('content-type');
        console.log('响应内容类型:', contentType);
        
        // 设置响应状态码和头信息
        res.status(response.status);
        
        // 转发所有响应头
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
          responseHeaders[key] = value;
        });
        
        // 如果是流式响应，进行流式转发
        if (isStreamRequest || (contentType && (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')))) {
          console.log('检测到流式响应，开始流式传输');
          
          // 确保设置正确的响应头
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          
          // 使用管道流式转发响应
          // 针对node-fetch v2的兼容处理
          if (response.body && typeof response.body.pipe === 'function') {
            // 如果body是可管道流的(node-fetch v2)
            console.log('使用管道流式传输');
            response.body.pipe(res);
            return;
          } else if (response.body && typeof response.body.getReader === 'function') {
            // 如果body有getReader方法(fetch)
            console.log('使用getReader流式传输');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            async function streamResponse() {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log('流传输完成');
                    res.end();
                    break;
                  }
                  
                  // 解码接收到的数据并转发
                  const chunk = decoder.decode(value, { stream: true });
                  res.write(chunk);
                }
              } catch (error) {
                console.error('流处理错误:', error);
                if (!res.headersSent) {
                  res.status(500).json({
                    code: 50000,
                    message: "流处理错误: " + error.message,
                    status: false
                  });
                } else {
                  res.end();
                }
              }
            }
            
            streamResponse();
            return;
          } else {
            // 作为文本处理并分块发送
            console.log('使用文本分块传输');
            response.text().then(text => {
              // 按行分割
              const lines = text.split('\n');
              // 逐行发送
              for (const line of lines) {
                if (line.trim() !== '') {
                  res.write(line + '\n');
                }
              }
              res.end();
            }).catch(error => {
              console.error('处理文本响应出错:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  code: 50000,
                  message: "流处理错误: " + error.message,
                  status: false
                });
              } else {
                res.end();
              }
            });
            return;
          }
        }
        
        // 否则返回JSON响应
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('解析JSON响应失败:', jsonError);
          // 尝试读取原始文本
          const text = await response.text();
          
          if (text.trim().length === 0) {
            // 空响应，直接结束
            return res.end();
          }
          
          // 尝试作为文本返回
          res.setHeader('Content-Type', 'text/plain');
          return res.send(text);
        }
        
        res.json(data);
        return; // 成功完成请求，退出函数
      } catch (error) {
        console.error(`第${attempt+1}次尝试失败:`, error);
        lastError = error;
        
        // 如果已经是最后一次尝试，则抛出错误
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
    }
    
    // 如果所有尝试都失败，返回错误
    console.error("所有尝试均失败:", lastError);
    
    if (lastError.code === 50301) {
      return res.status(503).json({
        code: 50301,
        message: "没有可用的API密钥，所有密钥均无余额或无效",
        status: false,
        details: lastError.details || []
      });
    } else {
      return res.status(503).json({
        code: 50300,
        message: "API服务暂时不可用: " + lastError.message,
        status: false
      });
    }
  } catch (error) {
    console.error("处理API代理请求时出错:", error);
    console.error("错误堆栈:", error.stack);
    res.status(500).json({
      code: 50000,
      message: "服务器内部错误: " + error.message,
      status: false
    });
  }
});

// 验证token有效性路由
app.get('/api/verify-token', async (req, res) => {
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
app.post('/api/verify-guest', async (req, res) => {
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

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});