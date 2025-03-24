/**
 * 硅基流动API管理系统 - Node版本打包脚本
 * 此脚本将创建一个包含应用所需所有文件的zip包
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 创建dist目录（如果不存在）
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

console.log('硅基流动API管理系统 - Node版本打包工具');
console.log('==================================');
console.log('此工具会将应用打包成在Node环境下运行的版本。');
console.log('');

// 检查是否已安装必要的依赖
try {
  console.log('检查项目依赖...');
  
  // 尝试读取package.json中的依赖
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('项目依赖检查完成，开始打包...');
  
  // 创建文件列表
  const filesToPackage = [
    'server.js',
    'package.json',
    'package-lock.json',
    '.env',
    'public',
    'README.md',
    'LICENSE',
    'scripts/start.js'
  ];
  
  // 确保启动脚本存在
  createStartScript();
  
  // 确保.env文件存在
  ensureEnvFile();
  
  // 确保README文件存在
  createReadmeFile();
  
  // 打包文件
  packageFiles(filesToPackage);
  
} catch (error) {
  console.error('打包过程中出错:', error);
  rl.close();
}

// 创建启动脚本
function createStartScript() {
  const startScriptPath = 'scripts/start.js';
  const startScriptContent = `/**
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

// 提供菜单选项
console.log('\\n请选择操作:');
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
  console.log('\\n正在启动硅基流动API管理系统...');
  
  // 读取端口设置
  const envContent = fs.readFileSync('.env', 'utf8');
  const portMatch = envContent.match(/PORT=(\\d+)/);
  const port = portMatch ? portMatch[1] : 3000;
  
  console.log(\`服务器将在 http://localhost:\${port} 上运行\`);
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
  
  console.log('\\n当前系统配置:');
  const config = fs.readFileSync('.env', 'utf8');
  console.log(config);
  
  console.log('\\n要修改配置，请编辑.env文件。');
  rl.close();
}
`;

  fs.writeFileSync(startScriptPath, startScriptContent);
  console.log('启动脚本已创建:', startScriptPath);
}

// 确保.env文件存在
function ensureEnvFile() {
  if (!fs.existsSync('.env')) {
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
    console.log('默认.env文件已创建');
  } else {
    console.log('.env文件已存在，将包含在打包文件中');
  }
}

// 创建README文件
function createReadmeFile() {
  const readmeContent = `# 硅基流动API管理系统 (Node版本)

一个用于管理硅基流动API密钥的系统，提供密钥管理、余额检测和API请求转发功能。

## 系统要求

- Node.js 14.x 或更高版本
- NPM 6.x 或更高版本

## 快速开始

1. 安装依赖:
   \`\`\`
   npm install
   \`\`\`

2. 启动系统:
   \`\`\`
   node scripts/start.js
   \`\`\`
   或直接启动:
   \`\`\`
   node server.js
   \`\`\`

3. 访问系统:
   - 前台页面: http://localhost:3000
   - 管理页面: http://localhost:3000/admin

## 默认登录信息

管理员账号: admin  
管理员密码: admin

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

  fs.writeFileSync('README.md', readmeContent);
  console.log('README.md文件已创建');
}

// 打包文件
function packageFiles(files) {
  console.log('\n开始打包文件...');
  
  // Windows环境下直接使用Node.js进行文件复制
  if (process.platform === 'win32') {
    try {
      console.log('在Windows环境下使用文件复制方式打包...');
      
      // 创建目标目录
      const distDir = path.resolve('dist', 'siliconflow-api-management');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // 复制文件
      console.log('复制文件到打包目录...');
      
      // server.js
      fs.copyFileSync('server.js', path.join(distDir, 'server.js'));
      console.log('- 复制 server.js');
      
      // package.json
      fs.copyFileSync('package.json', path.join(distDir, 'package.json'));
      console.log('- 复制 package.json');
      
      // package-lock.json (如果存在)
      if (fs.existsSync('package-lock.json')) {
        fs.copyFileSync('package-lock.json', path.join(distDir, 'package-lock.json'));
        console.log('- 复制 package-lock.json');
      }
      
      // .env
      if (fs.existsSync('.env')) {
        fs.copyFileSync('.env', path.join(distDir, '.env'));
        console.log('- 复制 .env');
      }
      
      // README.md
      fs.copyFileSync('README.md', path.join(distDir, 'README.md'));
      console.log('- 复制 README.md');
      
      // LICENSE (如果存在)
      if (fs.existsSync('LICENSE')) {
        fs.copyFileSync('LICENSE', path.join(distDir, 'LICENSE'));
        console.log('- 复制 LICENSE');
      }
      
      // 确保scripts目录存在
      const scriptsDir = path.join(distDir, 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      
      // 复制start.js
      fs.copyFileSync('scripts/start.js', path.join(scriptsDir, 'start.js'));
      console.log('- 复制 scripts/start.js');
      
      // 复制public目录
      copyDir('public', path.join(distDir, 'public'));
      console.log('- 复制 public 目录');
      
      console.log('\n文件复制完成！');
      console.log(`打包文件位于: ${distDir}`);
      console.log('\n使用方法:');
      console.log('1. 复制整个文件夹到目标位置');
      console.log('2. 进入文件夹');
      console.log('3. 运行 npm install 安装依赖');
      console.log('4. 运行 node scripts/start.js 启动系统');
      
      rl.close();
      return;
    } catch (copyError) {
      console.error('文件复制失败:', copyError);
      // 继续尝试其他打包方式
    }
  }
  
  // 非Windows环境或Windows复制失败后，使用命令行工具打包
  console.log('使用命令行工具打包...');
  
  // 打包命令
  let packageCmd;
  
  // 根据操作系统选择命令
  if (process.platform === 'win32') {
    console.log('尝试使用系统命令打包...');
    packageCmd = `powershell -Command "Compress-Archive -Path server.js,package.json,.env,public,README.md,scripts/start.js -DestinationPath dist/siliconflow-api-management.zip -Force"`;
  } else {
    // 在Linux/macOS上使用tar
    packageCmd = 'tar -czf dist/siliconflow-api-management.tar.gz server.js package.json package-lock.json .env public README.md LICENSE scripts/start.js';
  }
  
  // 执行命令
  console.log('执行打包命令:', packageCmd);
  const packProcess = exec(packageCmd);
  
  packProcess.stdout.on('data', (data) => {
    console.log(data);
  });
  
  packProcess.stderr.on('data', (data) => {
    console.error('打包错误:', data);
  });
  
  packProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n打包成功!');
      
      // 根据系统创建适当的输出信息
      let packageFile = '';
      if (process.platform === 'win32') {
        if (fs.existsSync('dist/siliconflow-api-management.zip')) {
          packageFile = 'dist/siliconflow-api-management.zip';
        } else {
          packageFile = 'dist/siliconflow-api-management.tar.gz';
        }
      } else {
        packageFile = 'dist/siliconflow-api-management.tar.gz';
      }
      
      console.log(`打包文件保存在: ${packageFile}`);
      console.log('\n使用方法:');
      console.log('1. 解压文件');
      console.log('2. 进入解压目录');
      console.log('3. 运行 npm install 安装依赖');
      console.log('4. 运行 node scripts/start.js 启动系统');
      console.log('\n感谢使用硅基流动API管理系统!');
    } else {
      console.error(`打包失败，退出代码: ${code}`);
    }
    
    // 清理临时文件
    if (process.platform === 'win32' && fs.existsSync('dist/package.bat')) {
      fs.unlinkSync('dist/package.bat');
    }
    
    rl.close();
  });
}

// 辅助函数：复制整个目录
function copyDir(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // 读取源目录
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // 复制每个条目
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDir(srcPath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 监听关闭事件
rl.on('close', () => {
  console.log('打包工具已关闭。');
}); 