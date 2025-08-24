const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// i18next for internationalization
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

const app = express();
const port = process.env.PORT || 3000;

// 确定应用根目录
const isProduction = process.pkg !== undefined;
const appRootDir = isProduction ? path.dirname(process.execPath) : path.join(__dirname, '..');
console.log('应用根目录:', appRootDir);

// 确定静态文件目录（生产环境使用压缩文件）
const staticDir = isProduction && process.env.NODE_ENV === 'production' 
  ? path.join(appRootDir, 'build', 'public') 
  : path.join(appRootDir, 'public');
console.log('静态文件目录:', staticDir);

// 初始化i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'zh-CN',
    lng: 'zh-CN',
    preload: ['zh-CN', 'en'],
    ns: ['common', 'admin'],
    defaultNS: 'common',
    backend: {
      loadPath: path.join(appRootDir, 'locales/{{lng}}/{{ns}}.json')
    }
  });

// 使用i18next中间件
app.use(middleware.handle(i18next));

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static(staticDir));

// 导入数据库和初始化函数
const initDatabase = require('./config/initDatabase');

// 初始化数据库
initDatabase();

// 导入路由
const apiRoutes = require('./routes');
const { handleProxyRequest } = require('./controllers/proxyController');

// 路由配置
app.get('/', (req, res) => {
  const htmlFile = isProduction && process.env.NODE_ENV === 'production' 
    ? path.join(appRootDir, 'build', 'public', 'index.html') 
    : path.join(appRootDir, 'public', 'index.html');
  res.sendFile(htmlFile);
});

app.get('/admin', (req, res) => {
  const htmlFile = isProduction && process.env.NODE_ENV === 'production' 
    ? path.join(appRootDir, 'build', 'public', 'admin.html') 
    : path.join(appRootDir, 'public', 'admin.html');
  res.sendFile(htmlFile);
});

// 使用API路由
app.use('/', apiRoutes);

// API代理路由
app.all('/v1/*', handleProxyRequest);

// 获取翻译资源的路由
app.get('/api/translations/:lng/:ns', (req, res) => {
  const { lng, ns } = req.params;
  const translation = i18next.getResourceBundle(lng, ns);
  if (translation) {
    res.json(translation);
  } else {
    res.status(404).json({ error: 'Translations not found' });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});