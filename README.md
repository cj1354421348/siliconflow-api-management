# 硅基流动API管理系统

此系统用于管理硅基流动API密钥，提供密钥管理、余额检测和API请求转发功能。

## 项目结构

有关项目的详细结构说明，请参阅 [项目结构文档](docs/project-structure.md)。

## 系统要求

- Node.js 14.x 或更高版本
- NPM 6.x 或更高版本

## 快速开始

1. 克隆仓库：
   ```
   git clone [仓库地址]
   cd siliconflow-api-management
   ```

2. 安装依赖:
   ```
   npm install
   ```

3. 创建环境配置文件:
   ```
   cp .env.example .env
   ```
   根据需要编辑.env文件

4. 启动系统:
   ```
   npm start
   ```
   或开发模式启动：
   ```
   npm run dev
   ```

5. 访问系统:
   - 用户界面: http://localhost:3000
   - 管理界面: http://localhost:3000/admin

## 管理员登录信息

默认管理员账号: admin  
默认管理员密码: admin

## API代理使用说明

本系统提供API代理功能，可以自动转发请求到硅基流动API并智能管理密钥。

### 代理工作原理

1. 系统维护一个API密钥池，用于转发请求
2. 用户使用验证密钥(`AUTH_API_KEY`)访问系统API
3. 系统验证用户提供的密钥后，从数据库中选择一个有效且有余额的密钥转发请求
4. 如果所有密钥都无效或无余额，系统会返回错误码(50301)

### 使用方法

1. 在管理界面添加硅基流动API密钥到系统
2. 设置访问控制模式和验证密钥(`AUTH_API_KEY`)
3. 使用以下格式发送API请求:

   ```
   curl -X POST "http://localhost:3000/v1/chat/completions" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-auth-api-key" \
     -d '{
       "model": "gpt-3.5-turbo",
       "messages": [
         {
           "role": "user",
           "content": "你好，请用中文回答，你是谁？"
         }
       ]
     }'
   ```

   将`your-auth-api-key`替换为您设置的`AUTH_API_KEY`值

### 支持的端点

系统支持所有硅基流动API端点，只需将请求发送到相同的路径，但主机名改为您的系统地址：

- 聊天补全: `/v1/chat/completions`
- 其他所有硅基流动API端点

### 流式响应

系统完全支持流式响应，使用方式与标准API相同：

```
curl -X POST "http://localhost:3000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-auth-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "你好，请用中文回答，你是谁？"
      }
    ],
    "stream": true
  }'
```

## 打包部署

1. 打包系统（不需要可执行文件）：
   ```
   npm run package:simple
   ```

2. 打包文件位于 `dist/siliconflow-api-management` 目录

3. 使用打包文件：
   - 复制整个目录到目标服务器
   - 进入该目录并安装依赖：`npm install`
   - 启动系统：`node scripts/start-direct.js` 或 Windows下双击 `start.bat`

## 配置说明

所有配置位于.env文件中:

- PORT: 服务器端口号
- ADMIN_USERNAME: 管理员用户名
- ADMIN_PASSWORD: 管理员密码
- AUTH_API_KEY: API验证密钥
- PAGE_SIZE: 每页显示的密钥数量
- ACCESS_CONTROL: 访问控制模式(open/restricted/private)
- GUEST_PASSWORD: 访客密码(用于restricted模式)

## 开发指南

### 项目结构

项目采用模块化结构，主要分为以下几个部分：

1. **配置层 (src/config/)**: 处理数据库连接和应用配置
2. **控制器层 (src/controllers/)**: 包含业务逻辑处理
3. **中间件层 (src/middleware/)**: 处理认证等横切关注点
4. **路由层 (src/routes/)**: 定义API路由
5. **工具层 (src/utils/)**: 提供通用工具函数

### 前端优化

为了提高前端代码的可维护性，我们对HTML文件进行了重构，将样式和脚本分离到独立的文件中。详细信息请参阅 [前端优化文档](docs/frontend-optimization.md)。

为了进一步提高代码质量，我们将大型JavaScript文件拆分为模块化结构。详细信息请参阅 [前端模块化重构指南](docs/frontend-modularization.md)。

### 静态资源本地化

为了提高应用的可靠性和安全性，我们将原本通过CDN引用的JavaScript库改为本地托管。详细信息请参阅 [静态资源本地化文档](docs/local-static-assets.md)。

### 数据库路径问题

在重构过程中，我们遇到了数据库路径变更导致数据无法访问的问题。详细信息请参阅 [数据库路径问题说明](docs/database-path-issue.md)。

### 添加新功能

1. 在`src/controllers/`中创建新的控制器文件
2. 在`src/routes/`中创建对应的路由文件
3. 在`src/routes/index.js`中注册新路由
4. 如果需要认证，在`src/middleware/`中添加相应的中间件

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-new-feature`
3. 提交更改：`git commit -am '添加新特性'`
4. 推送到分支：`git push origin feature/my-new-feature`
5. 提交 Pull Request

## 部署指南

### 本地部署

1. 克隆仓库：
   ```bash
   git clone [仓库地址]
   cd siliconflow-api-management
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件填写配置信息
   ```

4. 启动服务：
   ```bash
   npm start
   ```

5. 访问应用：
   - 用户界面：http://localhost:3000
   - 管理员界面：http://localhost:3000/admin

详细部署说明请参阅 [完整部署指南](docs/deployment-guide.md)。

### 构建和优化

项目支持构建和优化以减小文件大小并提高性能。详细信息请参阅 [构建和优化指南](docs/build-optimization.md)。
