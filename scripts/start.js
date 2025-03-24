/**
 * 硅基流动API管理系统启动脚本
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// 提供菜单选项
console.log('\n请选择操作:');
console.log('1. 启动服务器');
console.log('2. 检查配置');
console.log('3. 退出');

rl.question('请输入选择 (1-3): ', (choice) => {
  switch (choice) {
    case '1':
      startServer();
      break;
    case '2':
      checkConfig();
      break;
    case '3':
      console.log('退出程序');
      rl.close();
      break;
    default:
      console.log('无效的选择，将启动服务器');
      startServer();
  }
});

// 启动服务器
function startServer() {
  console.log('\n正在启动硅基流动API管理系统...');
  
  // 读取端口设置
  const envContent = fs.readFileSync('.env', 'utf8');
  const portMatch = envContent.match(/PORT=(\d+)/);
  const port = portMatch ? portMatch[1] : 3000;
  
  console.log(`服务器将在 http://localhost:${port} 上运行`);
  console.log('按Ctrl+C结束服务器运行');
  
  // 使用spawn启动服务器，保留stdio输出
  const server = spawn('node', ['server.js'], { stdio: 'inherit' });
  
  server.on('error', (error) => {
    console.error('启动服务器失败:', error);
    rl.close();
  });
  
  // 服务器将继续运行，用户可以通过Ctrl+C停止
}

// 检查配置
function checkConfig() {
  if (!fs.existsSync('.env')) {
    console.log('未找到.env文件');
    rl.close();
    return;
  }
  
  console.log('\n当前系统配置:');
  const config = fs.readFileSync('.env', 'utf8');
  console.log(config);
  
  console.log('\n要修改配置，请编辑.env文件。');
  rl.close();
}
