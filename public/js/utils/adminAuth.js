const CRED_STORAGE_KEY = 'siliconflow_admin_cred';
const ENC_SECRET = 'sf_admin_secure_key'; // 简单加密密钥

// 简单的加密函数
export function encrypt(text, secret) {
  // 一个简单的异或加密
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return btoa(result); // Base64编码
}

// 简单的解密函数
export function decrypt(encoded, secret) {
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
export function saveCredentialsToStorage(credentials) {
  if (!credentials) return;
  
  try {
    const encrypted = encrypt(credentials, ENC_SECRET);
    localStorage.setItem(CRED_STORAGE_KEY, encrypted);
  } catch (e) {
    console.error('保存凭据失败:', e);
  }
}

// 从本地存储加载凭据
export function loadCredentialsFromStorage() {
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
export function clearStoredCredentials() {
  try {
    localStorage.removeItem(CRED_STORAGE_KEY);
  } catch (e) {
    console.error('清除凭据失败:', e);
  }
}

let adminCredentials = null;

// 获取管理员凭据
export function getAdminCredentials() {
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
export async function verifyAdminCredentials() {
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

// 添加登出功能
export function logoutAdmin() {
  if (confirm('确定要退出登录吗？')) {
    adminCredentials = null;
    clearStoredCredentials();
    window.location.href = '/';
  }
}