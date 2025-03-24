/**
 * 硅基流动API管理系统 - 简易打包脚本
 * 直接复制文件到目标目录，不依赖外部命令
 */

const fs = require('fs');
const path = require('path');

console.log('硅基流动API管理系统 - 简易打包工具');
console.log('==================================');

// 创建dist目录（如果不存在）
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// 创建目标目录
const distDir = path.resolve('dist', 'siliconflow-api-management');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('开始复制文件到打包目录...');

// 要复制的文件列表
const filesToCopy = [
  'server.js',
  'package.json',
  '.env',
  'LICENSE'
];

// 复制文件
filesToCopy.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(distDir, file));
      console.log(`- 已复制: ${file}`);
    }
  } catch (err) {
    console.error(`复制文件 ${file} 失败:`, err);
  }
});

// 复制package-lock.json（如果存在）
if (fs.existsSync('package-lock.json')) {
  fs.copyFileSync('package-lock.json', path.join(distDir, 'package-lock.json'));
  console.log('- 已复制: package-lock.json');
}

// 确保scripts目录存在
const scriptsDir = path.join(distDir, 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// 创建直接启动脚本
const startDirectScriptContent = `/**
 * 硅基流动API管理系统启动脚本 - 直接启动版
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('欢迎使用硅基流动API管理系统！');
console.log('============================');

// 检查环境配置
if (!fs.existsSync('.env')) {
  console.log('未找到.env文件，将创建默认配置...');
  const defaultEnv = \`# 硅基流动API管理系统环境配置
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
AUTH_API_KEY=your-api-key
PAGE_SIZE=12
ACCESS_CONTROL=open
GUEST_PASSWORD=guest_password
\`;
  fs.writeFileSync('.env', defaultEnv);
  console.log('.env文件已创建');
}

// 读取端口设置
const envContent = fs.readFileSync('.env', 'utf8');
const portMatch = envContent.match(/PORT=(\\d+)/);
const port = portMatch ? portMatch[1] : 3000;

console.log(\`启动服务器，访问地址:\`);
console.log(\`- 用户界面: http://localhost:\${port}\`);
console.log(\`- 管理界面: http://localhost:\${port}/admin\`);
console.log('按Ctrl+C停止服务器');

// 尝试打开浏览器（如果在Windows环境下）
if (process.platform === 'win32') {
  const { exec } = require('child_process');
  exec(\`start http://localhost:\${port}\`);
}

// 启动服务器
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

server.on('error', (error) => {
  console.error('启动服务器失败:', error);
});
`;

// 写入直接启动脚本
fs.writeFileSync(path.join(scriptsDir, 'start-direct.js'), startDirectScriptContent);
console.log('- 已创建: scripts/start-direct.js');

// 复制public目录
copyDirectory('public', path.join(distDir, 'public'));
console.log('- 已复制: public 目录');

// 创建一个简单的批处理启动文件
const batchContent = `@echo off
echo 启动硅基流动API管理系统...
node scripts/start-direct.js
pause
`;
fs.writeFileSync(path.join(distDir, 'start.bat'), batchContent);
console.log('- 已创建: start.bat');

// 创建README文件
const readmeContent = `# 硅基流动API管理系统

此系统用于管理硅基流动API密钥，提供密钥管理、余额检测和API请求转发功能。

## 系统要求

- Node.js 14.x 或更高版本
- NPM 6.x 或更高版本

## 快速开始

1. 安装依赖:
   \`\`\`
   npm install
   \`\`\`

2. 启动系统:
   - Windows: 双击 \`start.bat\` 
   - 所有系统: \`node scripts/start-direct.js\`

3. 访问系统:
   - 用户界面: http://localhost:3000
   - 管理界面: http://localhost:3000/admin

## 管理员登录信息

默认管理员账号: admin  
默认管理员密码: admin

## 配置说明

所有配置位于.env文件中:

- PORT: 服务器端口号
- ADMIN_USERNAME: 管理员用户名
- ADMIN_PASSWORD: 管理员密码
- AUTH_API_KEY: API验证密钥
- PAGE_SIZE: 每页显示的密钥数量
- ACCESS_CONTROL: 访问控制模式(open/restricted/private)
- GUEST_PASSWORD: 访客密码(用于restricted模式)
`;

// 写入README文件
fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('- 已创建: README.md');

console.log('\n打包完成！');
console.log(`打包文件位于: ${distDir}`);
console.log('\n使用方法:');
console.log('1. 复制整个siliconflow-api-management文件夹到目标位置');
console.log('2. 进入该文件夹');
console.log('3. 运行 npm install 安装依赖');
console.log('4. 运行 start.bat 或 node scripts/start-direct.js 启动系统');

// 辅助函数：复制整个目录
function copyDirectory(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // 读取源目录中的文件和子目录
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // 复制每个条目
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(srcPath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
    }
  }
} 