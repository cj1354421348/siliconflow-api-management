/**
 * 硅基流动API管理系统启动脚本 - 直接启动版
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('欢迎使用硅基流动API管理系统！');
console.log('============================');

// 检查环境配置
if (!fs.existsSync('.env')) {
  console.log('未找到.env文件，将创建默认配置...');
  const defaultEnv = `# 硅基流动API管理系统环境配置
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
AUTH_API_KEY=your-api-key
PAGE_SIZE=12
ACCESS_CONTROL=open
GUEST_PASSWORD=guest_password
`;
  fs.writeFileSync('.env', defaultEnv);
  console.log('.env文件已创建');
}

// 读取端口设置
const envContent = fs.readFileSync('.env', 'utf8');
const portMatch = envContent.match(/PORT=(\d+)/);
const port = portMatch ? portMatch[1] : 3000;

console.log(`启动服务器，访问地址:`);
console.log(`- 用户界面: http://localhost:${port}`);
console.log(`- 管理界面: http://localhost:${port}/admin`);
console.log('按Ctrl+C停止服务器');

// 尝试打开浏览器（如果在Windows环境下）
if (process.platform === 'win32') {
  const { exec } = require('child_process');
  exec(`start http://localhost:${port}`);
}

// 启动服务器
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

server.on('error', (error) => {
  console.error('启动服务器失败:', error);
}); 