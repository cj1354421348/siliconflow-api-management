# 项目结构说明

## 目录结构

```
.
├── src/                    # 源代码目录
│   ├── config/            # 配置文件
│   │   ├── database.js    # 数据库连接配置
│   │   ├── config.js      # 应用配置
│   │   └── initDatabase.js# 数据库初始化
│   ├── controllers/       # 控制器层
│   │   ├── configController.js     # 配置相关控制器
│   │   ├── keyController.js        # 密钥相关控制器
│   │   └── proxyController.js      # API代理控制器
│   ├── middleware/        # 中间件
│   │   ├── adminAuth.js   # 管理员认证中间件
│   │   └── guestAuth.js   # 访客认证中间件
│   ├── routes/            # 路由定义
│   │   ├── index.js       # 路由入口文件
│   │   ├── configRoutes.js     # 配置相关路由
│   │   ├── keyRoutes.js        # 密钥相关路由
│   │   ├── balanceRoutes.js    # 余额相关路由
│   │   ├── authRoutes.js       # 认证相关路由
│   │   └── accessControlRoutes.js # 访问控制相关路由
│   ├── utils/             # 工具函数
│   │   ├── keyBalanceCache.js  # 密钥余额缓存
│   │   ├── keyUtils.js         # 密钥工具函数
│   │   ├── keySelector.js      # 密钥选择器
│   │   └── requestForwarder.js # 请求转发器
│   └── server.js          # 服务器主文件
├── public/                # 静态资源目录
├── locales/               # 国际化资源文件
├── scripts/               # 脚本文件
├── dist/                  # 打包输出目录
├── node_modules/          # 依赖包目录
├── .env                   # 环境配置文件
├── .env.example           # 环境配置示例文件
├── .gitignore             # Git忽略文件配置
├── package.json           # 项目配置文件
├── README.md              # 项目说明文档
└── server.js              # 服务器入口文件（指向src/server.js）
```

## 模块说明

### 配置层 (src/config/)

1. **database.js**: 负责数据库连接的初始化和配置
2. **config.js**: 存储应用的基本配置信息
3. **initDatabase.js**: 负责数据库表的初始化和默认数据插入

### 控制器层 (src/controllers/)

1. **configController.js**: 处理所有与配置相关的业务逻辑，包括：
   - 获取和更新配置
   - 获取配置值

2. **keyController.js**: 处理所有与密钥相关的业务逻辑，包括：
   - 获取所有密钥
   - 添加和删除密钥
   - 更新密钥检查时间

3. **proxyController.js**: 处理API代理请求，包括：
   - 验证用户API密钥
   - 从数据库中选择有效的API密钥
   - 转发请求到目标API
   - 处理流式响应

### 中间件层 (src/middleware/)

1. **adminAuth.js**: 管理员认证中间件，验证管理员的用户名和密码
2. **guestAuth.js**: 访客认证中间件，处理访客的认证逻辑

### 路由层 (src/routes/)

1. **index.js**: 路由的入口文件，整合所有路由模块
2. **configRoutes.js**: 处理配置相关的API路由
3. **keyRoutes.js**: 处理密钥相关的API路由
4. **balanceRoutes.js**: 处理余额刷新相关的API路由
5. **authRoutes.js**: 处理认证相关的API路由
6. **accessControlRoutes.js**: 处理访问控制相关的API路由

### 工具层 (src/utils/)

1. **keyBalanceCache.js**: 密钥余额缓存，减少API调用频率
2. **keyUtils.js**: 密钥相关的工具函数，如获取密钥余额
3. **keySelector.js**: 密钥选择器，负责从数据库中选择有效的API密钥
4. **requestForwarder.js**: 请求转发器，负责将请求转发到目标API并处理响应

## 工作流程

1. 应用启动时，首先加载环境配置和初始化数据库
2. 通过i18next配置国际化支持
3. 设置中间件处理跨域、JSON解析等
4. 挂载路由处理各种API请求
5. 对于/v1/*的请求，通过代理控制器转发到目标API
6. 所有响应通过i18next进行国际化处理

## 开发指南

### 添加新功能

1. 在`src/controllers/`中创建新的控制器文件
2. 在`src/routes/`中创建对应的路由文件
3. 在`src/routes/index.js`中注册新路由
4. 如果需要认证，在`src/middleware/`中添加相应的中间件

### 数据库操作

所有数据库操作都应该在`src/controllers/`中的控制器文件中进行，避免在路由文件中直接操作数据库。

### 错误处理

统一使用try-catch处理异步操作，并返回标准的JSON格式错误响应。

## 部署说明

1. 确保Node.js环境已安装
2. 运行`npm install`安装依赖
3. 复制`.env.example`为`.env`并根据需要修改配置
4. 运行`npm start`启动应用