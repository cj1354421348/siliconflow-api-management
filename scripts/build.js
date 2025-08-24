const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 创建构建目录
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
const buildPublicDir = path.join(buildDir, 'public');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

if (!fs.existsSync(buildPublicDir)) {
  fs.mkdirSync(buildPublicDir);
}

// 复制HTML文件
console.log('Copying HTML files...');
fs.copyFileSync(path.join(publicDir, 'index.html'), path.join(buildPublicDir, 'index.html'));
fs.copyFileSync(path.join(publicDir, 'admin.html'), path.join(buildPublicDir, 'admin.html'));

// 复制图像和其他静态资源
console.log('Copying static assets...');
const assetsDir = path.join(publicDir, 'images');
if (fs.existsSync(assetsDir)) {
  const buildAssetsDir = path.join(buildPublicDir, 'images');
  if (!fs.existsSync(buildAssetsDir)) {
    fs.mkdirSync(buildAssetsDir);
  }
  
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    fs.copyFileSync(path.join(assetsDir, file), path.join(buildAssetsDir, file));
  });
}

// 压缩CSS文件
console.log('Minifying CSS files...');
execSync(`npx cleancss -o ${path.join(buildPublicDir, 'css', 'admin.css')} ${path.join(publicDir, 'css', 'admin.css')}`, { stdio: 'inherit' });
execSync(`npx cleancss -o ${path.join(buildPublicDir, 'css', 'index.css')} ${path.join(publicDir, 'css', 'index.css')}`, { stdio: 'inherit' });

// 压缩JavaScript文件
console.log('Minifying JavaScript files...');
execSync(`npx terser ${path.join(publicDir, 'js', 'admin.js')} -o ${path.join(buildPublicDir, 'js', 'admin.js')} --compress --mangle`, { stdio: 'inherit' });
execSync(`npx terser ${path.join(publicDir, 'js', 'index.js')} -o ${path.join(buildPublicDir, 'js', 'index.js')} --compress --mangle`, { stdio: 'inherit' });

// 复制库文件（这些已经是压缩的）
console.log('Copying library files...');
const libDir = path.join(publicDir, 'js', 'lib');
const buildLibDir = path.join(buildPublicDir, 'js', 'lib');
if (!fs.existsSync(buildLibDir)) {
  fs.mkdirSync(buildLibDir, { recursive: true });
}

const libFiles = fs.readdirSync(libDir);
libFiles.forEach(file => {
  fs.copyFileSync(path.join(libDir, file), path.join(buildLibDir, file));
});

// 复制服务器文件
console.log('Copying server files...');
const srcDir = path.join(__dirname, '..', 'src');
const buildSrcDir = path.join(buildDir, 'src');
copyDir(srcDir, buildSrcDir);

// 复制其他重要文件
console.log('Copying other files...');
fs.copyFileSync(path.join(__dirname, '..', 'server.js'), path.join(buildDir, 'server.js'));
fs.copyFileSync(path.join(__dirname, '..', 'package.json'), path.join(buildDir, 'package.json'));
fs.copyFileSync(path.join(__dirname, '..', '.env.example'), path.join(buildDir, '.env.example'));

// 复制文档目录
console.log('Copying documentation...');
copyDir(path.join(__dirname, '..', 'docs'), path.join(buildDir, 'docs'));

// 复制语言文件
console.log('Copying language files...');
copyDir(path.join(__dirname, '..', 'locales'), path.join(buildDir, 'locales'));

console.log('Build completed successfully!');

// 递归复制目录的辅助函数
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}