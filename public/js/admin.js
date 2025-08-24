let adminCredentials = null;
let autoRefreshIntervalId = null;
const CRED_STORAGE_KEY = 'siliconflow_admin_cred';
const ENC_SECRET = 'sf_admin_secure_key'; // 简单加密密钥

// 初始化i18next
function initI18next() {
  // 获取语言选择器
  const languageSwitcher = document.getElementById('languageSwitcher');
  
  // 从localStorage获取保存的语言设置
  const savedLanguage = localStorage.getItem('language') || 'zh-CN';
  languageSwitcher.value = savedLanguage;
  
  // 初始化i18next
  i18next
    .use(i18nextHttpBackend)
    .init({
      lng: savedLanguage,
      fallbackLng: 'zh-CN',
      ns: ['admin'],
      defaultNS: 'admin',
      backend: {
        loadPath: '/api/translations/{{lng}}/{{ns}}'
      }
    }, function(err, t) {
      // 初始化完成后翻译页面
      translatePage();
    });

  // 绑定语言切换事件
  languageSwitcher.addEventListener('change', function() {
    const selectedLanguage = this.value;
    i18next.changeLanguage(selectedLanguage, () => {
      localStorage.setItem('language', selectedLanguage);
      translatePage(); // 重新翻译页面
    });
  });
}

// 翻译页面元素
function translatePage() {
  // 翻译带有data-i18n属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = i18next.t(key);
    if (translation !== key) { // 只有当翻译存在时才更新
      element.textContent = translation;
    }
  });
}

// 简单的加密函数
function encrypt(text, secret) {
  // 一个简单的异或加密
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return btoa(result); // Base64编码
}

// 简单的解密函数
function decrypt(encoded, secret) {
  try {
    const text = atob(encoded); // Base64解码
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
    }
    return result;
  } catch (e) {
    console.error('解密失败', e);
    return null;
  }
}

// 保存凭据到本地存储
function saveCredentialsToStorage(credentials) {
  if (!credentials) return;
  
  try {
    const encrypted = encrypt(credentials, ENC_SECRET);
    localStorage.setItem(CRED_STORAGE_KEY, encrypted);
  } catch (e) {
    console.error('保存凭据失败:', e);
  }
}

// 从本地存储加载凭据
function loadCredentialsFromStorage() {
  try {
    const encrypted = localStorage.getItem(CRED_STORAGE_KEY);
    if (encrypted) {
      return decrypt(encrypted, ENC_SECRET);
    }
  } catch (e) {
    console.error('加载凭据失败:', e);
  }
  return null;
}

// 清除存储的凭据
function clearStoredCredentials() {
  try {
    localStorage.removeItem(CRED_STORAGE_KEY);
  } catch (e) {
    console.error('清除凭据失败:', e);
  }
}

// 获取管理员凭据
function getAdminCredentials() {
  if (!adminCredentials) {
    // 先尝试从存储中获取
    adminCredentials = loadCredentialsFromStorage();
    
    // 如果没有存储的凭据，则请求用户输入
    if (!adminCredentials) {
      const username = prompt(i18next.t('prompts.adminUsername'));
      const password = prompt(i18next.t('prompts.adminPassword'));
      if (username && password) {
        adminCredentials = btoa(username + ':' + password);
        // 暂时不保存，等验证成功后再保存
      }
    }
  }
  return adminCredentials;
}

// 验证管理员凭据
async function verifyAdminCredentials() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return false;
  }

  try {
    const response = await fetch('/api/config', {
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    
    const data = await response.json();
    if (!data.success) {
      alert(data.message);
      adminCredentials = null;
      clearStoredCredentials(); // 清除无效的凭据
      return false;
    }
    
    // 凭据验证成功，保存到本地存储
    saveCredentialsToStorage(credentials);
    return true;
  } catch (error) {
    console.error('验证管理员凭据失败:', error);
    alert('验证管理员凭据失败');
    adminCredentials = null;
    clearStoredCredentials(); // 清除无效的凭据
    return false;
  }
}

// 加载配置
async function loadConfig() {
  try {
    const credentials = getAdminCredentials();
    if (!credentials) {
      alert(i18next.t('toasts.invalidCredentials'));
      return;
    }

    const response = await fetch('/api/config', {
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    
    const data = await response.json();
    if (data.success) {
      document.getElementById('adminUsername').value = data.data.adminUsername;
      document.getElementById('adminPassword').value = data.data.adminPassword;
      document.getElementById('authApiKey').value = data.data.authApiKey;
      document.getElementById('pageSize').value = data.data.pageSize;
      document.getElementById('accessControl').value = data.data.accessControl;
      document.getElementById('guestPassword').value = data.data.guestPassword;
    } else {
      alert(data.message);
      adminCredentials = null;
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    alert('加载配置失败');
    adminCredentials = null;
  }
}

// 修改保存配置函数
async function saveConfig() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  const originalUsername = document.getElementById('adminUsername').value;
  const originalPassword = document.getElementById('adminPassword').value;
  
  const config = {
    admin_username: originalUsername,
    admin_password: originalPassword,
    auth_api_key: document.getElementById('authApiKey').value,
    page_size: document.getElementById('pageSize').value,
    access_control: document.getElementById('accessControl').value,
    guest_password: document.getElementById('guestPassword').value
  };

  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + credentials
      },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    if (data.success) {
      showToast(i18next.t('toasts.configSaved'), 2000);
      
      // 检查管理员凭据是否已变更
      const [username, password] = atob(credentials).split(':');
      if (username !== originalUsername || password !== originalPassword) {
        // 凭据已变更，更新存储的凭据
        const newCredentials = btoa(originalUsername + ':' + originalPassword);
        adminCredentials = newCredentials;
        saveCredentialsToStorage(newCredentials);
        showToast(i18next.t('toasts.credentialsUpdated'), 3000);
      }
      
      loadKeys();
    } else {
      showToast(data.message || i18next.t('toasts.saveFailed'), 3000, true);
      if (data.message && data.message.includes('未授权')) {
        adminCredentials = null;
        clearStoredCredentials(); // 清除无效的凭据
      }
    }
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast('保存配置失败: ' + (error.message || '未知错误'), 3000, true);
    adminCredentials = null;
    clearStoredCredentials(); // 清除无效的凭据
  }
}

// 添加密钥
async function addKey() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  const key = document.getElementById('newKey').value;
  if (!key) {
    alert('请输入密钥');
    return;
  }

  try {
    const response = await fetch('/api/add-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + credentials
      },
      body: JSON.stringify({ key })
    });
    
    const data = await response.json();
    if (data.success) {
      alert(data.message || i18next.t('toasts.keyAdded'));
      document.getElementById('newKey').value = '';
      loadKeys();
    } else {
      alert(data.message || i18next.t('toasts.keyAddFailed'));
      if (data.message && data.message.includes('已存在')) {
        document.getElementById('newKey').value = '';
      }
    }
  } catch (error) {
    console.error('添加密钥失败:', error);
    alert('添加密钥失败: ' + (error.message || '未知错误'));
  }
}

// 批量添加密钥
async function addBulkKeys() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  const bulkKeysText = document.getElementById('bulkKeys').value.trim();
  if (!bulkKeysText) {
    alert('请输入要添加的密钥');
    return;
  }

  // 处理密钥，支持换行和逗号分隔
  const keys = bulkKeysText.split(/[\\n,]+/).map(key => key.trim()).filter(key => key.length > 0);
  
  if (keys.length === 0) {
    alert('未找到有效的密钥');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let existsCount = 0;

  for (const key of keys) {
    try {
      const response = await fetch('/api/add-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + credentials
        },
        body: JSON.stringify({ key })
      });
      
      const data = await response.json();
      if (data.success) {
        successCount++;
      } else if (data.message && data.message.includes('已存在')) {
        existsCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`添加密钥 ${key} 失败:`, error);
      failCount++;
    }
  }

  alert(i18next.t('toasts.bulkAddResult', { success: successCount, fail: failCount, exists: existsCount }));
  document.getElementById('bulkKeys').value = '';
  loadKeys();
}

// 加载密钥列表
async function loadKeys() {
  try {
    const credentials = getAdminCredentials();
    if (!credentials) {
      alert(i18next.t('toasts.invalidCredentials'));
      return;
    }

    const response = await fetch('/api/keys', {
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    
    const data = await response.json();
    if (data.success) {
      const keysList = document.getElementById('keyList');
      keysList.innerHTML = '';
      
      data.data.forEach(key => {
        const keyElement = document.createElement('div');
        keyElement.className = 'key-item';
        keyElement.innerHTML = `
          <div class="key-info">
            <div class="key-value">${key.key}</div>
            <div class="key-balance">¥${key.balance}</div>
            <div class="key-status ${key.isValid ? 'status-valid' : 'status-invalid'}">
              ${key.isValid ? i18next.t('keyItem.valid') : i18next.t('keyItem.invalid')}
            </div>
            <div class="key-time">${i18next.t('keyItem.createdAt')} ${new Date(key.created_at).toLocaleString()}</div>
            <div class="key-time">${i18next.t('keyItem.updatedAt')} ${new Date(key.last_updated).toLocaleString()}</div>
          </div>
          <div class="key-controls">
            <button onclick="refreshKeyBalance('${key.key}')" class="btn-icon btn-refresh" title="${i18next.t('keyItem.refreshBalance')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
              </svg>
            </button>
            <button onclick="deleteKey('${key.key}')" class="btn-icon btn-delete" title="${i18next.t('keyItem.deleteKey')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
        keysList.appendChild(keyElement);
      });
    } else {
      alert(data.message);
      adminCredentials = null;
    }
  } catch (error) {
    console.error('加载密钥列表失败:', error);
    alert('加载密钥列表失败');
    adminCredentials = null;
  }
}

// 刷新单个密钥余额 (静默刷新，不弹窗)
async function refreshKeyBalance(key) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  try {
    const response = await fetch('/api/refresh-key-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + credentials
      },
      body: JSON.stringify({ key })
    });
    
    const data = await response.json();
    if (data.success) {
      // 不弹窗，静默刷新
      loadKeys();
    }
  } catch (error) {
    console.error('刷新余额失败:', error);
  }
}

// 刷新所有密钥余额 (静默刷新，不弹窗)
async function refreshAllBalances() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  try {
    const response = await fetch('/api/refresh-all-balances', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    
    const data = await response.json();
    if (data.success) {
      // 不弹窗，静默刷新
      loadKeys();
    }
  } catch (error) {
    console.error('刷新所有余额失败:', error);
  }
}

// 设置自动刷新
function setAutoRefresh() {
  const interval = parseInt(document.getElementById('autoRefreshInterval').value);
  
  // 清除现有的定时器
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
  
  // 如果选择了有效的时间间隔，设置新的定时器
  if (interval > 0) {
    autoRefreshIntervalId = setInterval(refreshAllBalances, interval);
    console.log(`已设置自动刷新，间隔: ${interval}毫秒`);
  }
}

// 删除密钥
async function deleteKey(key) {
  if (!confirm(i18next.t('confirmations.deleteKey', { key: key }))) {
    return;
  }
  
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  try {
    const response = await fetch(`/api/delete-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + credentials
      },
      body: JSON.stringify({ key })
    });
    
    const data = await response.json();
    if (data.success) {
      alert(data.message || i18next.t('toasts.keyDeleted'));
      loadKeys();
    } else {
      alert(data.message || i18next.t('toasts.keyDeleteFailed'));
    }
  } catch (error) {
    console.error('删除密钥失败:', error);
    alert('删除密钥失败: ' + (error.message || '未知错误'));
  }
}

// 删除所有失效的密钥
async function deleteInvalidKeys() {
  if (!confirm(i18next.t('confirmations.deleteInvalidKeys'))) {
    return;
  }
  
  const credentials = getAdminCredentials();
  if (!credentials) {
    alert(i18next.t('toasts.invalidCredentials'));
    return;
  }

  try {
    const response = await fetch('/api/keys', {
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    
    const keysData = await response.json();
    if (!keysData.success) {
      alert('获取密钥列表失败');
      return;
    }

    // 找出所有失效的密钥
    const invalidKeys = keysData.data.filter(key => !key.isValid || parseFloat(key.balance) <= 0)
      .map(key => key.key);
    
    if (invalidKeys.length === 0) {
      alert(i18next.t('toasts.noInvalidKeys'));
      return;
    }

    // 显示确认对话框，显示将要删除的密钥数量
    if (!confirm(i18next.t('confirmations.deleteInvalidKeysCount', { count: invalidKeys.length }))) {
      return;
    }

    // 创建toast通知
    showToast(`正在删除 ${invalidKeys.length} 个失效密钥...`);

    // 逐个删除失效密钥
    let successCount = 0;
    let failCount = 0;

    for (const key of invalidKeys) {
      try {
        const deleteResponse = await fetch(`/api/delete-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + credentials
          },
          body: JSON.stringify({ key })
        });
        
        const deleteData = await deleteResponse.json();
        if (deleteData.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`删除密钥 ${key} 失败:`, error);
        failCount++;
      }
    }

    // 显示删除结果
    showToast(i18next.t('toasts.deleteInvalidComplete', { success: successCount, fail: failCount }), 3000);
    
    // 重新加载密钥列表
    loadKeys();
  } catch (error) {
    console.error('删除失效密钥失败:', error);
    showToast(i18next.t('toasts.deleteInvalidFailed') + ': ' + (error.message || '未知错误'), 3000, true);
  }
}

// 显示toast通知
function showToast(message, duration = 2000, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  
  if (isError) {
    toast.classList.add('toast-error');
  } else {
    toast.classList.remove('toast-error');
  }
  
  // 清除之前的定时器
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  // 设置自动关闭
  if (duration > 0) {
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
}

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
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
  }
};

// 添加登出功能
function logoutAdmin() {
  if (confirm('确定要退出登录吗？')) {
    adminCredentials = null;
    clearStoredCredentials();
    window.location.href = '/';
  }
}