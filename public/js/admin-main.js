import { initI18next, translatePage } from './utils/i18n.js';
import { verifyAdminCredentials, logoutAdmin } from './utils/adminAuth.js';
import { loadConfig, saveConfig } from './utils/config.js';
import { addKey, addBulkKeys, deleteKey } from './utils/keyManagement.js';
import { loadKeys, refreshAllBalances, setAutoRefresh, deleteInvalidKeys, clearAutoRefresh } from './utils/balance.js';

// Make functions globally available for HTML onclick attributes
window.logoutAdmin = logoutAdmin;
window.saveConfig = saveConfig;
window.addKey = addKey;
window.addBulkKeys = addBulkKeys;
window.refreshAllBalances = refreshAllBalances;
window.deleteInvalidKeys = deleteInvalidKeys;
window.setAutoRefresh = setAutoRefresh;
window.deleteKey = deleteKey;

// 页面加载时验证凭据并加载数据
window.onload = async () => {
  initI18next();
  if (await verifyAdminCredentials()) {
    loadConfig();
    loadKeys();
  } else {
    window.location.href = '/';
  }
};

// 页面卸载时清除定时器
window.onunload = () => {
  clearAutoRefresh();
};