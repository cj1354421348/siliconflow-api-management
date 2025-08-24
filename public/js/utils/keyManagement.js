import { getAdminCredentials } from './adminAuth.js';
import { showToast } from './ui.js';
import { loadKeys } from './balance.js';

// 添加密钥
export async function addKey() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
    return;
  }

  const key = document.getElementById('newKey').value;
  if (!key) {
    showToast('请输入密钥');
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
      showToast(data.message || i18next.t('toasts.keyAdded'));
      document.getElementById('newKey').value = '';
      loadKeys();
    } else {
      showToast(data.message || i18next.t('toasts.keyAddFailed'));
      if (data.message && data.message.includes('已存在')) {
        document.getElementById('newKey').value = '';
      }
    }
  } catch (error) {
    console.error('添加密钥失败:', error);
    showToast('添加密钥失败: ' + (error.message || '未知错误'));
  }
}

// 批量添加密钥
export async function addBulkKeys() {
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
    return;
  }

  const bulkKeysText = document.getElementById('bulkKeys').value.trim();
  if (!bulkKeysText) {
    showToast('请输入要添加的密钥');
    return;
  }

  // 处理密钥，支持换行和逗号分隔
  const keys = bulkKeysText.split(/[\n,]+/).map(key => key.trim()).filter(key => key.length > 0);
  
  if (keys.length === 0) {
    showToast('未找到有效的密钥');
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

  showToast(i18next.t('toasts.bulkAddResult', { success: successCount, fail: failCount, exists: existsCount }));
  document.getElementById('bulkKeys').value = '';
  loadKeys();
}

// 删除密钥
export async function deleteKey(key) {
  if (!confirm(i18next.t('confirmations.deleteKey', { key: key }))) {
    return;
  }
  
  const credentials = getAdminCredentials();
  if (!credentials) {
    showToast(i18next.t('toasts.invalidCredentials'));
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
      showToast(data.message || i18next.t('toasts.keyDeleted'));
      loadKeys();
    } else {
      showToast(data.message || i18next.t('toasts.keyDeleteFailed'));
    }
  } catch (error) {
    console.error('删除密钥失败:', error);
    showToast('删除密钥失败: ' + (error.message || '未知错误'));
  }
}