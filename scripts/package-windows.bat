@echo off
echo 硅基流动API管理系统 - 打包工具
echo ============================
echo.

if not exist dist mkdir dist

echo 开始打包文件...
echo.

rem 检查是否安装了7-Zip
if exist "%ProgramFiles%\7-Zip\7z.exe" (
  echo 使用7-Zip打包...
  "%ProgramFiles%\7-Zip\7z.exe" a -tzip dist\siliconflow-api-management.zip server.js package.json package-lock.json .env public README.md LICENSE scripts\start.js
) else (
  echo 尝试使用tar命令打包...
  tar -czf dist\siliconflow-api-management.tar.gz server.js package.json package-lock.json .env public README.md LICENSE scripts\start.js
)

echo.
echo 打包完成！
echo 打包文件保存在dist目录下。

echo.
echo 使用方法:
echo 1. 解压文件
echo 2. 进入解压目录
echo 3. 运行 npm install 安装依赖
echo 4. 运行 node scripts/start.js 启动系统

pause 