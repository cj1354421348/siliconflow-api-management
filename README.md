# 硅基流动API管理系统

此系统用于管理硅基流动API密钥，提供密钥管理、余额检测和API请求转发功能。

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

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-new-feature`
3. 提交更改：`git commit -am '添加新特性'`
4. 推送到分支：`git push origin feature/my-new-feature`
5. 提交 Pull Request
