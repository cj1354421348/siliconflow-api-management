const { exec } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('欢迎使用Siliconflow API管理系统安装工具！');
console.log('=======================================');
console.log('该脚本将帮助您安装依赖并启动应用。');

// 检查.env文件是否存在
if (!fs.existsSync('.env')) {
  console.log('未找到.env文件，将创建默认的.env文件...');
  
  const defaultEnv = `# Siliconflow API管理系统环境配置
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
AUTH_API_KEY=your-api-key
PAGE_SIZE=12
ACCESS_CONTROL=open
GUEST_PASSWORD=guest_password
`;
  
  fs.writeFileSync('.env', defaultEnv);
  console.log('.env文件已创建。');
}

console.log('\n请选择操作：');
console.log('1. 安装依赖');
console.log('2. 启动应用');
console.log('3. 安装依赖并启动应用');
console.log('4. 运行打包工具');
console.log('5. 退出');

rl.question('请输入选择 (1-5): ', (choice) => {
  switch (choice) {
    case '1':
      installDependencies();
      break;
    case '2':
      startApplication();
      break;
    case '3':
      installDependencies(() => {
        startApplication();
      });
      break;
    case '4':
      runPackageTool();
      break;
    case '5':
      console.log('退出安装程序。');
      rl.close();
      break;
    default:
      console.log('无效的选择，退出安装程序。');
      rl.close();
  }
});

function installDependencies(callback) {
  console.log('\n正在安装依赖...');
  
  const installProcess = exec('npm install');
  
  installProcess.stdout.on('data', (data) => {
    console.log(data);
  });
  
  installProcess.stderr.on('data', (data) => {
    console.error(data);
  });
  
  installProcess.on('close', (code) => {
    if (code === 0) {
      console.log('依赖安装成功！');
      if (callback) callback();
      else rl.close();
    } else {
      console.error(`安装依赖失败，退出代码: ${code}`);
      rl.close();
    }
  });
}

function startApplication() {
  console.log('\n正在启动应用...');
  console.log('应用将在http://localhost:3000上运行');
  console.log('按Ctrl+C可以停止应用');
  
  // 使用spawn而不是exec以便继承stdio
  const { spawn } = require('child_process');
  const child = spawn('node', ['server.js'], { stdio: 'inherit' });
  
  child.on('error', (error) => {
    console.error('启动应用失败:', error);
    rl.close();
  });
  
  // 这里不需要关闭rl，因为应用会持续运行
}

function runPackageTool() {
  console.log('\n正在启动打包工具...');
  
  // 使用spawn而不是exec以便继承stdio
  const { spawn } = require('child_process');
  const child = spawn('node', ['build.js'], { stdio: 'inherit' });
  
  child.on('error', (error) => {
    console.error('启动打包工具失败:', error);
    rl.close();
  });
  
  child.on('close', (code) => {
    rl.close();
  });
} 