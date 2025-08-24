import { loadTokenFromStorage, clearStoredToken } from './auth.js';
import { loadKeys } from './keyDisplay.js';
import { showToast } from './ui.js';

// 检查访问控制
export async function checkAccessControl() {
  try {
    console.log('检查访问控制...');
    const response = await fetch('/api/access-control');
    const data = await response.json();
    console.log('访问控制响应:', data);
    
    if (data.success) {
      const accessControl = data.data.accessControl;
      console.log('访问控制模式:', accessControl);
      
      if (accessControl === 'open') {
        // 完全开放模式，直接加载密钥
        console.log('完全开放模式，加载密钥...');
        loadKeys();
      } else if (accessControl === 'restricted') {
        // 部分开放模式，检查是否有存储的token
        console.log('部分开放模式，检查存储的token...');
        const guestToken = loadTokenFromStorage();
        
        if (guestToken) {
          // 验证token有效性
          try {
            console.log('验证存储的token...');
            const verifyResponse = await fetch('/api/verify-token', {
              headers: { 'Authorization': `Bearer ${guestToken}` }
            });
            
            const verifyData = await verifyResponse.json();
            console.log('token验证响应:', verifyData);
            if (verifyData.success) {
              // token有效，加载密钥
              console.log('token有效，加载密钥...');
              document.getElementById('authForm').style.display = 'none';
              loadKeys();
              return;
            } else {
              // token无效，清除存储
              console.log('token无效，清除存储...');
              clearStoredToken();
            }
          } catch (error) {
            console.error('验证token失败:', error);
            clearStoredToken();
          }
        }
        
        // 显示认证表单
        console.log('显示认证表单...');
        document.getElementById('authForm').style.display = 'block';
      } else if (accessControl === 'private') {
        // 完全私有模式，显示管理员链接
        console.log('完全私有模式，重定向到管理员页面...');
        window.location.href = '/admin';
      }
    }
  } catch (error) {
    console.error('检查访问控制失败:', error);
    showToast('toasts.accessCheckFailed', 3000);
  }
}