import { loadTokenFromStorage } from './auth.js';
import { loadKeys } from './keyDisplay.js';

// 检查访问控制
export async function checkAccessControl() {
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
        const guestToken = loadTokenFromStorage();
        
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
              clearStoredToken();
            }
          } catch (error) {
            console.error('验证token失败:', error);
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