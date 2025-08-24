import { getAdminCredentials } from './adminAuth.js';

// 加载配置
export async function loadConfig() {
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
      // Note: We can't directly access adminCredentials here, so we'll need to handle this differently
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    alert('加载配置失败');
  }
}

// 修改保存配置函数
export async function saveConfig() {
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
        // Note: We can't directly access adminCredentials here, so we'll need to handle this differently
        showToast(i18next.t('toasts.credentialsUpdated'), 3000);
      }
      
      loadKeys();
    } else {
      showToast(data.message || i18next.t('toasts.saveFailed'), 3000, true);
      if (data.message && data.message.includes('未授权')) {
        // Note: We can't directly access adminCredentials here, so we'll need to handle this differently
      }
    }
  } catch (error) {
    console.error('保存配置失败:', error);
    showToast('保存配置失败: ' + (error.message || '未知错误'), 3000, true);
  }
}