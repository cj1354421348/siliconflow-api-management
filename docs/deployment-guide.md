# 部署指南

本文档详细说明了如何部署硅基流动API管理系统。

## 部署选项

系统支持多种部署方式：
1. 直接部署到服务器
2. 使用 Docker 容器化部署
3. 使用云服务平台部署

## 环境要求

- Node.js 14.x 或更高版本
- npm 6.x 或更高版本
- 服务器权限（用于生产环境部署）

## 本地部署

### 1. 克隆代码库

```bash
git clone [仓库地址]
cd siliconflow-api-management
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：
- PORT: 服务器端口号（默认3000）
- ADMIN_USERNAME: 管理员用户名
- ADMIN_PASSWORD: 管理员密码
- AUTH_API_KEY: API验证密钥
- PAGE_SIZE: 每页显示的密钥数量
- ACCESS_CONTROL: 访问控制模式（open/restricted/private）
- GUEST_PASSWORD: 访客密码（用于restricted模式）

### 4. 启动应用

```bash
npm start
```

### 5. 访问应用

- 用户界面：http://localhost:3000
- 管理员界面：http://localhost:3000/admin

## 生产环境部署

### 使用 PM2 进程管理器

PM2 是一个 Node.js 应用的进程管理器，可以确保应用在崩溃后自动重启。

1. 安装 PM2：
   ```bash
   npm install -g pm2
   ```

2. 启动应用：
   ```bash
   pm2 start server.js --name "siliconflow-api"
   ```

3. 设置开机自启：
   ```bash
   pm2 startup
   pm2 save
   ```

4. 管理应用：
   ```bash
   # 查看应用状态
   pm2 status
   
   # 查看应用日志
   pm2 logs
   
   # 重启应用
   pm2 restart siliconflow-api
   
   # 停止应用
   pm2 stop siliconflow-api
   ```

### 反向代理配置（推荐）

建议使用 Nginx 作为反向代理服务器：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL 证书配置

推荐使用 Let's Encrypt 免费 SSL 证书：

1. 安装 Certbot：
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. 获取证书：
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Docker 部署

项目包含 Dockerfile，可以使用 Docker 部署：

### 1. 构建镜像

```bash
docker build -t siliconflow-api .
```

### 2. 运行容器

```bash
docker run -d -p 3000:3000 --name siliconflow-api siliconflow-api
```

### 3. 使用环境变量

可以通过 -e 参数传递环境变量：

```bash
docker run -d -p 3000:3000 \
  -e PORT=3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-password \
  --name siliconflow-api siliconflow-api
```

## 云平台部署

### Heroku

1. 安装 Heroku CLI
2. 登录：
   ```bash
   heroku login
   ```
3. 创建应用：
   ```bash
   heroku create your-app-name
   ```
4. 部署：
   ```bash
   git push heroku main
   ```

### Vercel

1. 安装 Vercel CLI
2. 登录：
   ```bash
   vercel login
   ```
3. 部署：
   ```bash
   vercel
   ```

## 更新部署

### 1. 拉取最新代码

```bash
git pull origin main
```

### 2. 安装新依赖

```bash
npm install
```

### 3. 重启应用

```bash
# 如果使用 PM2
pm2 restart siliconflow-api

# 如果使用其他方式启动
# 先停止应用，然后重新启动
```

## 故障排除

### 应用无法启动

1. 检查端口是否被占用
2. 检查环境变量配置
3. 查看应用日志：
   ```bash
   # 如果使用 PM2
   pm2 logs
   
   # 如果直接运行
   node server.js
   ```

### 数据库问题

1. 检查数据库文件权限
2. 确认数据库文件存在且可写
3. 检查磁盘空间是否充足

### 性能问题

1. 检查服务器资源使用情况
2. 调整 PM2 进程数
3. 考虑使用反向代理缓存静态资源