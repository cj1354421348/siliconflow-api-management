# 使用官方 Node.js 运行时作为基础镜像
FROM node:14-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]