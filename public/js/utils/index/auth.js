const GUEST_TOKEN_KEY = 'siliconflow_guest_token';
const ENC_SECRET = 'sf_guest_secure_key'; // 简单加密密钥

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

// 保存token到本地存储
export function saveTokenToStorage(token) {
  if (!token) return;
  
  try {
    const encrypted = encrypt(token, ENC_SECRET);
    localStorage.setItem(GUEST_TOKEN_KEY, encrypted);
  } catch (e) {
    console.error('保存token失败:', e);
  }
}

// 从本地存储加载token
export function loadTokenFromStorage() {
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
export function clearStoredToken() {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch (e) {
    console.error('清除token失败:', e);
  }
}

// 验证访客
export async function verifyGuest() {
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
      const guestToken = data.token;
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

// 登出访客
export function logoutGuest() {
  clearStoredToken();
  document.getElementById('keysContainer').innerHTML = '';
  document.getElementById('totalKeys').textContent = '0';
  document.getElementById('validKeys').textContent = '0';
  document.getElementById('totalBalance').textContent = '¥0.00';
  document.getElementById('copyControls').style.display = 'none';
  document.getElementById('pagination').style.display = 'none';
  document.getElementById('stats').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  
  // 重新检查访问控制
  checkAccessControl();
  
  showToast('toasts.logoutSuccess');
}