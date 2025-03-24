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
