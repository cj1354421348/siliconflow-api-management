import { initI18next } from './utils/index/i18n.js';
import { verifyGuest, logoutGuest } from './utils/index/auth.js';
import { loadKeys, goToPrevPage, goToNextPage, copyAllKeysWithNewline, copyAllKeysWithComma } from './utils/index/keyDisplay.js';
import { checkAccessControl } from './utils/index/accessControl.js';

// Make functions globally available for HTML onclick attributes
window.verifyGuest = verifyGuest;
window.logoutGuest = logoutGuest;
window.goToPrevPage = goToPrevPage;
window.goToNextPage = goToNextPage;
window.copyAllKeysWithNewline = copyAllKeysWithNewline;
window.copyAllKeysWithComma = copyAllKeysWithComma;

// 页面加载时检查访问控制
window.onload = () => {
  initI18next();
  checkAccessControl();
};

// 每10分钟自动刷新一次
let autoRefreshIntervalId = setInterval(loadKeys, 600000);

// 页面卸载时清除定时器
window.onunload = () => {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
  }
};