import { getAdminCredentials } from './adminAuth.js';
import { showToast } from './ui.js';

let autoRefreshIntervalId = null;

// 加载密钥列表
export async function loadKeys() {
  try {
    const credentials = getAdminCredentials();
    if (!credentials) {
      showToast(i18next.t('toasts.invalidCredentials'));
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
      showToast(data.message);
    }
  } catch (error) {
    console.error('加载密钥列表失败:', error);
    showToast('加载密钥列表失败');
  }
}

// 刷新单个密钥余额 (静默刷新，不弹窗)
export async function refreshKeyBalance(key) {
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
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
export async function refreshAllBalances() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
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
export function setAutoRefresh() {
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

// 删除所有失效的密钥
export async function deleteInvalidKeys() {
  if (!confirm(i18next.t('confirmations.deleteInvalidKeys'))) {
    return;
  }
  
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
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
      showToast('获取密钥列表失败');
      return;
    }

    // 找出所有失效的密钥
    const invalidKeys = keysData.data.filter(key => !key.isValid || parseFloat(key.balance) <= 0)
      .map(key => key.key);
    
    if (invalidKeys.length === 0) {
      showToast(i18next.t('toasts.noInvalidKeys'));
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

// 页面卸载时清除定时器
export function clearAutoRefresh() {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
  }
}