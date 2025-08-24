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
      ns: ['common'],
      defaultNS: 'common',
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
      // 特殊处理title元素
      if (element.tagName === 'TITLE') {
        document.title = translation;
      } else {
        element.textContent = translation;
      }
    }
  });
}

let allKeys = [];
let currentPage = 1;
let keysPerPage = 12;
let guestToken = null;
const GUEST_TOKEN_KEY = 'siliconflow_guest_token';
const ENC_SECRET = 'sf_guest_secure_key'; // 简单加密密钥

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

// 保存token到本地存储
function saveTokenToStorage(token) {
  if (!token) return;
  
  try {
    const encrypted = encrypt(token, ENC_SECRET);
    localStorage.setItem(GUEST_TOKEN_KEY, encrypted);
  } catch (e) {
    console.error('保存token失败:', e);
  }
}

// 从本地存储加载token
function loadTokenFromStorage() {
  try {
    const encrypted = localStorage.getItem(GUEST_TOKEN_KEY);
    if (encrypted) {
      return decrypt(encrypted, ENC_SECRET);
    }
  } catch (e) {
    console.error('加载token失败:', e);
  }
  return null;
}

// 清除存储的token
function clearStoredToken() {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch (e) {
    console.error('清除token失败:', e);
  }
}

// 展示toast通知
function showToast(message, duration = 2000) {
  // 创建toast元素
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast'; // 添加类名以应用CSS样式
    document.body.appendChild(toast);
  }
  
  // 使用i18next翻译消息（如果存在对应的键）
  const translatedMessage = i18next.t(message) !== message ? i18next.t(message) : message;
  toast.textContent = translatedMessage;
  toast.className = 'toast show'; // 添加show类以显示toast
  
  // 清除之前的定时器
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  // 设置自动消失
  toast.timeoutId = setTimeout(() => {
    toast.className = 'toast'; // 移除show类以隐藏toast
  }, duration);
}

// 登出访客
function logoutGuest() {
  guestToken = null;
  clearStoredToken();
  currentPage = 1;
  allKeys = [];
  
  // 重置UI
  document.getElementById('keysContainer').innerHTML = '';
  document.getElementById('totalKeys').textContent = '0';
  document.getElementById('validKeys').textContent = '0';
  document.getElementById('totalBalance').textContent = '¥0.00';
  document.getElementById('copyControls').style.display = 'none';
  document.getElementById('pagination').style.display = 'none';
  document.getElementById('stats').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  
  // 检查访问控制重新开始
  checkAccessControl();
  
  showToast('toasts.logoutSuccess');
}

// 检查访问控制
async function checkAccessControl() {
  try {
    const response = await fetch('/api/access-control');
    const data = await response.json();
    
    if (data.success) {
      const accessControl = data.data.accessControl;
      
      if (accessControl === 'open') {
        // 完全开放模式，直接加载密钥
        loadKeys();
      } else if (accessControl === 'restricted') {
        // 部分开放模式，检查是否有存储的token
        guestToken = loadTokenFromStorage();
        
        if (guestToken) {
          // 验证token有效性
          try {
            const verifyResponse = await fetch('/api/verify-token', {
              headers: { 'Authorization': `Bearer ${guestToken}` }
            });
            
            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              // token有效，加载密钥
              document.getElementById('authForm').style.display = 'none';
              loadKeys();
              return;
            } else {
              // token无效，清除存储
              guestToken = null;
              clearStoredToken();
            }
          } catch (error) {
            console.error('验证token失败:', error);
            guestToken = null;
            clearStoredToken();
          }
        }
        
        // 显示认证表单
        document.getElementById('authForm').style.display = 'block';
      } else if (accessControl === 'private') {
        // 完全私有模式，显示管理员链接
        window.location.href = '/admin';
      }
    }
  } catch (error) {
    console.error('检查访问控制失败:', error);
    showToast('toasts.accessCheckFailed', 3000);
  }
}

// 验证访客
async function verifyGuest() {
  const password = document.getElementById('guestPassword').value;
  try {
    const response = await fetch('/api/verify-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    if (data.success) {
      guestToken = data.token;
      // 保存token到本地存储
      saveTokenToStorage(guestToken);
      document.getElementById('authForm').style.display = 'none';
      loadKeys();
    } else {
      showToast(data.message || '验证失败', 3000);
    }
  } catch (error) {
    console.error('验证访客失败:', error);
    showToast('toasts.verifyFailed', 3000);
  }
}

// 加载密钥列表
async function loadKeys() {
  try {
    const headers = {};
    if (guestToken) {
      headers['Authorization'] = `Bearer ${guestToken}`;
    }
    
    const response = await fetch('/api/keys', { headers });
    const data = await response.json();
    
    if (data.success) {
      allKeys = data.data;
      
      // 显示控制面板和统计
      document.getElementById('copyControls').style.display = 'flex';
      document.getElementById('pagination').style.display = 'flex';
      document.getElementById('stats').style.display = 'flex';
      document.getElementById('logoutBtn').style.display = 'block';
      
      // 更新统计信息
      updateStats();
      
      // 显示当前页面的密钥
      displayCurrentPage();
    } else {
      showToast(data.message || '加载失败', 3000);
    }
  } catch (error) {
    console.error('加载密钥列表失败:', error);
    showToast('toasts.loadFailed', 3000);
  }
}

// 更新统计信息
function updateStats() {
  const totalKeys = allKeys.length;
  const validKeys = allKeys.filter(key => key.isValid !== false && parseFloat(key.balance || 0) > 0).length;
  const totalBalance = allKeys.reduce((sum, key) => sum + parseFloat(key.balance || 0), 0).toFixed(2);
  
  document.getElementById('totalKeys').textContent = totalKeys;
  document.getElementById('validKeys').textContent = validKeys;
  document.getElementById('totalBalance').textContent = `¥${totalBalance}`;
}

// 显示当前页面的密钥
function displayCurrentPage() {
  const startIndex = (currentPage - 1) * keysPerPage;
  const endIndex = Math.min(startIndex + keysPerPage, allKeys.length);
  
  const keysContainer = document.getElementById('keysContainer');
  keysContainer.innerHTML = '';
  
  // 首先按余额从高到低排序
  let keysToDisplay = [...allKeys];
  keysToDisplay.sort((a, b) => {
    // 如果密钥无效或余额为零，排在最后面
    const balanceA = (!a.isValid || parseFloat(a.balance || 0) <= 0) ? -1 : parseFloat(a.balance || 0);
    const balanceB = (!b.isValid || parseFloat(b.balance || 0) <= 0) ? -1 : parseFloat(b.balance || 0);
    return balanceB - balanceA; // 降序排列
  });
  
  // 使用排序后的数组获取当前页的密钥
  keysToDisplay = keysToDisplay.slice(startIndex, endIndex);
  
  // 显示每个密钥
  keysToDisplay.forEach(key => {
    const keyElement = document.createElement('div');
    keyElement.className = 'key-card';
    
    // 检查密钥是否有效
    const isValid = key.isValid && parseFloat(key.balance || 0) > 0;
    
    // 计算余额颜色类
    let balanceClass = 'balance-zero';
    const balance = parseFloat(key.balance || 0);
    
    if (!isValid) {
      balanceClass = 'balance-invalid';
    } else if (balance > 1000) {
      balanceClass = 'balance-ultrahigh';
    } else if (balance >= 500) {
      balanceClass = 'balance-veryhigh';
    } else if (balance >= 100) {
      balanceClass = 'balance-high';
    } else if (balance >= 50) {
      balanceClass = 'balance-mediumhigh';
    } else if (balance >= 10) {
      balanceClass = 'balance-medium';
    } else if (balance >= 5) {
      balanceClass = 'balance-mediumlow';
    } else if (balance > 0) {
      balanceClass = 'balance-low';
    }
    
    // 处理密钥显示格式 (隐藏中间部分)
    const truncatedKey = truncateKey(key.key);
    
    // 格式化更新时间
    const updateTime = key.last_updated ? new Date(key.last_updated).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : '未知';
    
    // 显示余额或失效状态
    const balanceDisplay = isValid ? key.balance : i18next.t('keyCard.invalid');
    
    keyElement.innerHTML = `
      <div class="key-card-top">
        <div class="key-text">${truncatedKey}</div>
        <button class="copy-button" data-i18n="keyCard.copyButton">复制</button>
      </div>
      <div class="key-card-middle">
        <div class="balance ${balanceClass}">
          ${balanceDisplay}
        </div>
      </div>
      <div class="key-card-bottom">
        <span data-i18n="keyCard.updatedAt">更新于</span> ${updateTime}
      </div>
    `;
    
    // 添加hover效果提示
    keyElement.setAttribute('title', '点击查看完整密钥');
    
    // 为每个密钥卡片添加点击事件
    keyElement.addEventListener('click', function(e) {
      if (!e.target.closest('.copy-button')) {
        showToast(`密钥: ${key.key}`, 3000);
      }
    });
    
    // 为复制按钮添加点击事件
    const copyButton = keyElement.querySelector('.copy-button');
    copyButton.addEventListener('click', function(e) {
      e.stopPropagation();
      copyToClipboard(key.key);
      showToast('toasts.copied', 2000);
    });
    
    keysContainer.appendChild(keyElement);
  });
  
  // 更新分页信息
  const totalPages = Math.ceil(allKeys.length / keysPerPage);
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
  
  // 更新分页按钮状态
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// 处理密钥显示格式，隐藏中间部分
function truncateKey(key) {
  if (key.length <= 15) return key;
  const start = key.substring(0, 10);
  const end = key.substring(key.length - 5);
  return start + '...' + end;
}

// 切换到上一页
function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    displayCurrentPage();
  }
}

// 切换到下一页
function goToNextPage() {
  const totalPages = Math.ceil(allKeys.length / keysPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayCurrentPage();
  }
}

// 复制单个密钥到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('toasts.copied');
  }).catch(err => {
    console.error('复制失败:', err);
    showToast('toasts.copyFailed', true);
  });
}

// 批量复制所有密钥(以换行分隔)
function copyAllKeysWithNewline() {
  const keys = allKeys.map(item => item.key);
  if (keys.length === 0) {
    return;
  }
  
  navigator.clipboard.writeText(keys.join('\n')).then(() => {
    showToast('toasts.batchCopyNewline');
  }).catch(err => {
    console.error('批量复制失败:', err);
    showToast('toasts.batchCopyFailed', true);
  });
}

// 批量复制所有密钥(以逗号分隔)
function copyAllKeysWithComma() {
  const keys = allKeys.map(item => item.key);
  if (keys.length === 0) {
    return;
  }
  
  navigator.clipboard.writeText(keys.join(',')).then(() => {
    showToast('toasts.batchCopyComma');
  }).catch(err => {
    console.error('批量复制失败:', err);
    showToast('toasts.batchCopyFailed', true);
  });
}

// 刷新所有密钥余额 (静默刷新，不弹窗)
async function refreshAllBalances() {
  try {
    const headers = {};
    if (guestToken) {
      headers['Authorization'] = `Bearer ${guestToken}`;
    }
    
    const response = await fetch('/api/refresh-all-balances', {
      method: 'POST',
      headers: headers
    });
    
    const data = await response.json();
    if (data.success) {
      loadKeys();
    }
  } catch (error) {
    console.error('刷新所有余额失败:', error);
  }
}

// 绑定分页按钮事件
document.getElementById('prevBtn').addEventListener('click', goToPrevPage);
document.getElementById('nextBtn').addEventListener('click', goToNextPage);

// 页面加载时检查访问控制
window.onload = () => {
  initI18next();
  checkAccessControl();
};

// 每10分钟自动刷新一次
autoRefreshIntervalId = setInterval(refreshAllBalances, 600000);

// 页面卸载时清除定时器
window.onunload = () => {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
  }
};

// 删除流式响应测试功能代码及相关函数
document.addEventListener('DOMContentLoaded', function() {
  // 这个事件监听器可能与window.onload冲突，所以我们只在需要时调用loadKeys
  // loadKeys(); 
});